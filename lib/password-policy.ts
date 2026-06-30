export interface PasswordValidation {
  ok: boolean;
  errors: string[];
}

export const MIN_ADMIN_PASSWORD_LENGTH = 16;

export function validateStrongPassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (!password || password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    errors.push(`رمز عبور باید حداقل ${MIN_ADMIN_PASSWORD_LENGTH} کاراکتر باشد`);
  }
  if (!/[a-z]/.test(password)) {
    errors.push("حداقل یک حرف کوچک انگلیسی لازم است");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("حداقل یک حرف بزرگ انگلیسی لازم است");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("حداقل یک عدد لازم است");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("حداقل یک کاراکتر ویژه (!@#$...) لازم است");
  }

  return { ok: errors.length === 0, errors };
}

export function getPasswordStrengthLabel(password: string): "weak" | "medium" | "strong" {
  const result = validateStrongPassword(password);
  if (!result.ok) {
    if (password.length >= 12) return "medium";
    return "weak";
  }
  if (password.length >= 20) return "strong";
  return "strong";
}