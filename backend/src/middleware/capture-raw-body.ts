import type { Request } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      rawBody: Buffer;
    }
  }
}

export function captureRawBody(req: Request, _res: unknown, buf: Buffer): void {
  req.rawBody = buf;
}
