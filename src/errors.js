export class CliError extends Error {
  constructor(code, message, hint = null, details = null) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.hint = hint;
    this.details = details;
  }

  toJSON() {
    const error = { code: this.code, message: this.message };
    if (this.hint) error.hint = this.hint;
    if (this.details) error.details = this.details;
    return { ok: false, error };
  }
}

export function normalizeError(error) {
  if (error instanceof CliError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new CliError("INTERNAL_ERROR", message);
}
