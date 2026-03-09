/**
 * Standard error response shape for all API errors.
 * Enables consistent handling and request tracing via requestId.
 */
export interface ErrorResponseDto {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId: string;
  timestamp: string; // ISO 8601
}

/** HTTP status → default error code mapping */
export const ERROR_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  500: 'INTERNAL_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
};

export function buildErrorResponse(
  code: string,
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
): ErrorResponseDto {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && Object.keys(details).length > 0 && { details }),
    },
    requestId,
    timestamp: new Date().toISOString(),
  };
}
