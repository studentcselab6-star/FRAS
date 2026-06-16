// utils/apiHelpers.ts
import axios, { AxiosError } from 'axios';
import { FastAPIErrorPayload } from '../types/apiErrorHandler';

export function isFastAPIError(error: unknown): error is AxiosError<FastAPIErrorPayload> {
  return (
    axios.isAxiosError(error) &&
    error.response?.data !== undefined &&
    'detail' in (error.response.data as Record<string, unknown>)
  );
}

// utils/apiHelpers.ts
export function getErrorMessage(error: unknown): string {
  if (!isFastAPIError(error)) {
    return error instanceof Error ? error.message : "An unexpected network error occurred.";
  }

  const detail = error.response?.data.detail;

  // Handle standard 400/404/500 HTTPException (string)
  if (typeof detail === 'string') {
    return detail;
  }

  // Handle 422 Pydantic Validation errors (array)
  if (Array.isArray(detail)) {
    return detail.map((err) => `${err.loc.join('.')}: ${err.msg}`).join(', ');
  }

  return "Something went wrong.";
}
