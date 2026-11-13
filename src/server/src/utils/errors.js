// Errors carry a stable code that the clients translate (EN/ID), plus an English fallback message.
export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const bad = (code, message, details) => new AppError(400, code, message, details);
export const unauthorized = (code = 'AUTH_REQUIRED', message = 'Please sign in.') => new AppError(401, code, message);
export const forbidden = (code = 'FORBIDDEN', message = 'You do not have access to this.') => new AppError(403, code, message);
export const notFound = (code = 'NOT_FOUND', message = 'Not found.') => new AppError(404, code, message);
export const conflict = (code, message, details) => new AppError(409, code, message, details);

/** Wrap an async route handler so rejections reach the error middleware. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
