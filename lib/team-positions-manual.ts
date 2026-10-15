import fs from "fs/promises";
import path from "path";
import type { ManualPositions, ManualPositionValue } from "./team-positions";

/**
 * Runtime admin overrides for team-builder positions. Lives in data/ next to the
 * other admin JSON settings but is git-ignored, so `git pull` deploys never
 * overwrite it.
 */
const DATA_DIR = path.join(process.cwd(), "data");
const MANUAL_FILE = path.join(DATA_DIR, "player-positions-manual.json");

export const MANUAL_VALUES: ManualPositionValue[] = ["GK", "DEF", "MID", "FWD", "COACH", "EXCLUDE"];

export async function readManualPositions(): Promise<ManualPositions> {
  try {
    const raw = await fs.readFile(MANUAL_FILE, "utf8");
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? (data as ManualPositions) : {};
  } catch {
    return {};
  }
}

let queue: Promise<unknown> = Promise.resolve();

/** Set (or clear with null) a manual position. Writes are serialized + atomic. */
export function setManualPosition(id: number, value: ManualPositionValue | null): Promise<ManualPositions> {
  const run = queue.then(async () => {
    const current = await readManualPositions();
    if (value === null) delete current[String(id)];
    else current[String(id)] = { position: value, updatedAt: new Date().toISOString() };
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${MANUAL_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(current, null, 2), "utf8");
    await fs.rename(tmp, MANUAL_FILE);
    return current;
  });
  queue = run.catch(() => undefined);
  return run;
}
