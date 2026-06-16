// Backend error response handler
export interface FastAPIErrorPayload {
  detail: string | Array<{ loc: (string | number)[]; msg: string; type: string }>;
}