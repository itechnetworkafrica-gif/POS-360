/**
 * Vercel serverless function entry point.
 *
 * Imports the pre-compiled Express app bundle (artifacts/api-server/dist/vercel-handler.mjs)
 * so Vercel never needs to transpile workspace TypeScript packages at deploy time.
 * Built by: pnpm --filter @workspace/api-server run build
 */
import type { IncomingMessage, ServerResponse } from "http";
// @ts-ignore — .mjs bundle is built before this function is deployed
import app from "../artifacts/api-server/dist/vercel-handler.mjs";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as Handler)(req, res);
}
