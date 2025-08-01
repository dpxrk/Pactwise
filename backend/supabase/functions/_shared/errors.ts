/**
 * Common error classes and error handling utilities for edge functions
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string = 'External service unavailable') {
    super(message, 502);
  }
}

/**
 * Error handler for edge functions
 */
export function handleError(error: unknown): Response {
  console.error('Error occurred:', error);

  if (error instanceof AppError) {
    return new Response(
      JSON.stringify({
        error: error.message,
        statusCode: error.statusCode,
      }),
      {
        status: error.statusCode,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }

  // For unknown errors, don't expose internal details
  return new Response(
    JSON.stringify({
      error: 'Internal server error',
      statusCode: 500,
    }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}

/**
 * Async error wrapper for edge functions
 */
export function asyncHandler(
  fn: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      return await fn(req);
    } catch (error) {
      return handleError(error);
    }
  };
}

// createErrorResponse moved to _shared/responses.ts to avoid duplication