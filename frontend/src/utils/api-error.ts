import axios from 'axios';

const friendlyByCode: Record<string, string> = {
  REPORT_FILTER_INVALID: 'The selected report filters are invalid.',
  REPORT_GENERATION_FAILED: 'We could not generate this report. Please try again.',
};

/** Returns a safe API message without exposing transport, SQL, or stack details. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<{ error?: string; code?: string }>(error)) return fallback;
  const code = error.response?.data?.code;
  if (code && friendlyByCode[code]) return friendlyByCode[code];
  if (error.response && error.response.status < 500 && error.response.data?.error) {
    return error.response.data.error;
  }
  return fallback;
}
