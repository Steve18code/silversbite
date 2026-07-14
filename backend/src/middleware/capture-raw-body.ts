import type { Request } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rawBody: Buffer;
    }
  }
}

/**
 * Passed as the `verify` option to express.json(). Express's JSON parser
 * consumes the request stream and discards the original bytes once parsed —
 * but signature verification (Meta, Paystack, Flutterwave webhooks) must be
 * computed against the EXACT bytes that were signed, not a re-serialized
 * version of the parsed object (key order/whitespace can differ). This
 * stashes the raw buffer on the request before parsing proceeds.
 */
export function captureRawBody(req: Request, _res: unknown, buf: Buffer): void {
  req.rawBody = buf;
}
