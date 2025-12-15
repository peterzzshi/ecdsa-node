import { ErrorCode, ErrorResponse } from './types';

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  toJSON(): ErrorResponse {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
