/**
 * Throw this for expected, client-facing errors (bad input, not found, etc.).
 * Anything else thrown (a bug, a null-pointer, an unexpected library error)
 * is treated as a 500 by the error handler and logged at `error` level with
 * a stack trace — AppError is logged at `warn` since it's not a surprise.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational = true;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request') {
    super(message, 422);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}
