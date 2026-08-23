import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { isRetryableHttpStatus, withRetry } from "./retry";

const GITHUB_API = "https://api.github.com";

export type GitHubRepoRef = {
  owner: string;
  repo: string;
  branch?: string;
};

type GitTreeEntry = {
  path?: string;
  mode?: string;
  type?: "blob" | "tree" | "commit";
  sha?: string;
  size?: number;
  url?: string;
};

function token(): string {
  const value =
    process.env.MEDIA_GITHUB_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim() ||
    "";
  if (!value) {
    throw new Error("GITHUB_TOKEN (or MEDIA_GITHUB_TOKEN) is not set");
  }
  return value;
}

function hasToken(): boolean {
  return Boolean(
    process.env.MEDIA_GITHUB_TOKEN?.trim() ||
      process.env.GITHUB_TOKEN?.trim() ||
      process.env.GH_TOKEN?.trim()
  );
}

export function githubConfigured(): boolean {
  return hasToken();
}

async function githubFetch(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 45_000, headers, ...rest } = init;
  return withRetry(
    async () => {
      const res = await fetch(`${GITHUB_API}${path}`, {
        ...rest,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token()}`,
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "adristore-sync",
          ...headers,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 403) {
        const remaining = res.headers.get("x-ratelimit-remaining");
        if (remaining === "0") {
          throw new Error("GitHub API rate limit exceeded");
        }
      }
      if (!res.ok && isRetryableHttpStatus(res.status)) {
        const body = await res.text().catch(() => "");
        throw new Error(`GitHub ${res.status} ${path}: ${body.slice(0, 200)}`);
      }
      return res;
    },
    { attempts: 4, baseDelayMs: 600, label: `GET/POST ${path}` }
  );
}

async function githubJson<T>(path: string, init?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const res = await githubFetch(path, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub ${res.status} ${path}: ${body.slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

export async function getHeadSha(ref: GitHubRepoRef): Promise<{ sha: string; treeSha: string }> {
  const branch = ref.branch || "main";
  const data = await githubJson<{
    object?: { sha?: string };
    commit?: { sha?: string; commit?: { tree?: { sha?: string } } };
  }>(`/repos/${ref.owner}/${ref.repo}/git/ref/heads/${branch}`);
  const sha = data.object?.sha;
  if (!sha) throw new Error(`No SHA for ${ref.owner}/${ref.repo}@${branch}`);
  const commit = await githubJson<{ tree: { sha: string } }>(
    `/repos/${ref.owner}/${ref.repo}/git/commits/${sha}`
  );
  return { sha, treeSha: commit.tree.sha };
}

export async function listRepoFiles(
  ref: GitHubRepoRef,
  prefix: string
): Promise<Set<string>> {
  const branch = ref.branch || "main";
  const files = new Set<string>();

  const walk = async (sha: string, recursive: boolean) => {
    const data = await githubJson<{
      tree?: GitTreeEntry[];
      truncated?: boolean;
    }>(`/repos/${ref.owner}/${ref.repo}/git/trees/${sha}?recursive=${recursive ? "1" : "0"}`, {
      timeoutMs: 60_000,
    });
    for (const entry of data.tree ?? []) {
      if (entry.type === "blob" && entry.path) {
        const full = entry.path;
        if (full.startsWith(prefix)) files.add(full.split("/").pop() || full);
      }
    }
    return Boolean(data.truncated);
  };

  const { treeSha } = await getHeadSha({ ...ref, branch });
  const truncated = await walk(treeSha, true);
  if (!truncated) return files;

  const root = await githubJson<{ tree?: GitTreeEntry[] }>(
    `/repos/${ref.owner}/${ref.repo}/git/trees/${treeSha}`
  );
  const parts = prefix.replace(/\/$/, "").split("/");
  let current = root.tree ?? [];
  let dirSha: string | undefined;
  for (const part of parts) {
    const node = current.find((e) => e.path === part && e.type === "tree");
    dirSha = node?.sha;
    if (!dirSha) return files;
    const next = await githubJson<{ tree?: GitTreeEntry[] }>(
      `/repos/${ref.owner}/${ref.repo}/git/trees/${dirSha}?recursive=1`
    );
    current = next.tree ?? [];
  }
  for (const entry of current) {
    if (entry.type === "blob" && entry.path) {
      files.add(entry.path.split("/").pop() || entry.path);
    }
  }
  return files;
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function redactSecrets(text: string): string {
  return text
    .replace(/x-access-token:[^@\s]+/gi, "x-access-token:***")
    .replace(/bearer\s+[A-Za-z0-9._\-]+/gi, "bearer ***")
    .replace(/basic\s+[A-Za-z0-9+/=]+/gi, "basic ***")
    .replace(/ghp_[A-Za-z0-9]+/g, "ghp_***")
    .replace(/github_pat_[A-Za-z0-9_]+/g, "github_pat_***");
}

function gitAuthArgs(): string[] {
  const basic = Buffer.from(`x-access-token:${token()}`).toString("base64");
  return [
    "-c",
    "credential.helper=",
    "-c",
    `http.extraheader=AUTHORIZATION: basic ${basic}`,
  ];
}

function runGit(args: string[], cwd: string, withAuth = false): string {
  const fullArgs = withAuth ? [...gitAuthArgs(), ...args] : args;
  const result = spawnSync("git", fullArgs, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
      GIT_ASKPASS: "echo",
      GCM_INTERACTIVE: "never",
    },
  });
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  if (result.status !== 0) {
    throw new Error(
      redactSecrets(
        `git ${args[0] ?? fullArgs[0]} failed (${result.status}): ${(stderr || stdout).slice(0, 500)}`
      )
    );
  }
  return stdout.trim();
}

/**
 * Sparse partial clone + add files + push. Avoids Git Data API blob 400s on large
 * binary batches (GitHub returns "malformed request" for some base64 POSTs).
 */
export async function commitFilesViaGit(
  ref: GitHubRepoRef,
  files: { path: string; bytes: Uint8Array }[],
  message: string
): Promise<{ commitSha: string; files: number }> {
  if (files.length === 0) {
    const head = await getHeadSha(ref);
    return { commitSha: head.sha, files: 0 };
  }

  const branch = ref.branch || "main";
  const dir = join(homedir(), ".adristore-git-cache", `${ref.owner}-${ref.repo}`);
  mkdirSync(dirname(dir), { recursive: true });

  if (existsSync(join(dir, ".git"))) {
    runGit(["remote", "set-url", "origin", `https://github.com/${ref.owner}/${ref.repo}.git`], dir);
    runGit(["fetch", "--depth", "1", "origin", branch], dir, true);
    runGit(["checkout", "-B", branch, `origin/${branch}`], dir);
  } else {
    runGit(
      [
        "clone",
        "--filter=blob:none",
        "--sparse",
        "--depth",
        "1",
        "--branch",
        branch,
        `https://github.com/${ref.owner}/${ref.repo}.git`,
        dir,
      ],
      dirname(dir),
      true
    );
  }
  runGit(["config", "user.name", "adristore-sync"], dir);
  runGit(["config", "user.email", "adristore-sync@users.noreply.github.com"], dir);
  runGit(["sparse-checkout", "set", "--no-cone", "/*.md", "/.gitignore"], dir);

  for (const file of files) {
    const full = join(dir, file.path.replaceAll("\\", "/"));
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, file.bytes);
  }

  runGit(["add", "--sparse", "-A"], dir);
  const status = runGit(["status", "--porcelain"], dir);
  if (!status) {
    const sha = runGit(["rev-parse", "HEAD"], dir);
    return { commitSha: sha, files: 0 };
  }
  runGit(["commit", "-m", message], dir);
  runGit(["push", "origin", `HEAD:${branch}`], dir, true);
  const commitSha = runGit(["rev-parse", "HEAD"], dir);
  return { commitSha, files: files.length };
}

function utf8ToBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}

export async function createBlob(
  ref: GitHubRepoRef,
  bytes: Uint8Array
): Promise<string> {
  const data = await githubJson<{ sha: string }>(`/repos/${ref.owner}/${ref.repo}/git/blobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: bytesToBase64(bytes), encoding: "base64" }),
    timeoutMs: 60_000,
  });
  if (!data.sha) throw new Error("GitHub blob response missing sha");
  return data.sha;
}

export async function commitFiles(
  ref: GitHubRepoRef,
  files: { path: string; bytes: Uint8Array }[],
  message: string
): Promise<{ commitSha: string; files: number }> {
  if (files.length === 0) {
    const head = await getHeadSha(ref);
    return { commitSha: head.sha, files: 0 };
  }

  const branch = ref.branch || "main";
  const head = await getHeadSha({ ...ref, branch });

  const blobs: { path: string; sha: string }[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(4, files.length) }, async () => {
    while (cursor < files.length) {
      const current = files[cursor++];
      const sha = await createBlob(ref, current.bytes);
      blobs.push({ path: current.path, sha });
    }
  });
  await Promise.all(workers);

  const tree = await githubJson<{ sha: string }>(`/repos/${ref.owner}/${ref.repo}/git/trees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      base_tree: head.treeSha,
      tree: blobs.map((b) => ({
        path: b.path,
        mode: "100644",
        type: "blob",
        sha: b.sha,
      })),
    }),
    timeoutMs: 60_000,
  });

  const commit = await githubJson<{ sha: string }>(`/repos/${ref.owner}/${ref.repo}/git/commits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [head.sha],
    }),
  });

  const refRes = await githubFetch(`/repos/${ref.owner}/${ref.repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  if (!refRes.ok) {
    const body = await refRes.text().catch(() => "");
    throw new Error(`GitHub ref update failed ${refRes.status}: ${body.slice(0, 300)}`);
  }

  return { commitSha: commit.sha, files: files.length };
}

export async function readTextFile(
  ref: GitHubRepoRef,
  path: string
): Promise<{ content: string; sha: string } | null> {
  const res = await githubFetch(
    `/repos/${ref.owner}/${ref.repo}/contents/${path}?ref=${ref.branch || "main"}`
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub read ${path} failed ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    encoding?: string;
    content?: string;
    sha?: string;
    download_url?: string;
  };
  if (data.encoding === "base64" && data.content) {
    return {
      content: atob(data.content.replace(/\n/g, "")),
      sha: data.sha || "",
    };
  }
  if (data.download_url) {
    const fileRes = await fetch(data.download_url, { signal: AbortSignal.timeout(60_000) });
    if (!fileRes.ok) return null;
    return { content: await fileRes.text(), sha: data.sha || "" };
  }
  return null;
}

export async function upsertTextFile(
  ref: GitHubRepoRef,
  path: string,
  content: string,
  message: string
): Promise<string> {
  const existing = await readTextFile(ref, path);
  const res = await githubFetch(`/repos/${ref.owner}/${ref.repo}/contents/${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: utf8ToBase64(content),
      branch: ref.branch || "main",
      ...(existing?.sha ? { sha: existing.sha } : {}),
    }),
    timeoutMs: 90_000,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub upsert ${path} failed ${res.status}: ${body.slice(0, 400)}`);
  }
  const data = (await res.json()) as { commit?: { sha?: string } };
  return data.commit?.sha || "";
}

export async function dispatchWorkflow(
  ref: GitHubRepoRef,
  eventType: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  const res = await githubFetch(`/repos/${ref.owner}/${ref.repo}/dispatches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type: eventType, client_payload: payload }),
  });
  if (res.status !== 204 && !res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`repository_dispatch failed ${res.status}: ${body.slice(0, 300)}`);
  }
}

export async function triggerDeployHook(url: string): Promise<void> {
  const res = await withRetry(
    async () => {
      const response = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok && isRetryableHttpStatus(response.status)) {
        throw new Error(`deploy hook ${response.status}`);
      }
      return response;
    },
    { attempts: 3, label: "pages deploy hook" }
  );
  if (!res.ok) {
    throw new Error(`Pages deploy hook failed: ${res.status}`);
  }
}
