/**
 * Vercel serverless function entry point.
 *
 * All requests to /api/* are rewritten here by vercel.json.
 * The Express app handles routing internally, so no Vercel-specific
 * types are required — we just use the Node.js http types.
 */
import type { IncomingMessage, ServerResponse } from "http";
import app from "../artifacts/api-server/src/app";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(
    req,
    res,
  );
}
