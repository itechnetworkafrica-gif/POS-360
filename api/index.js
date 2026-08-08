/**
 * Vercel serverless entry point.
 * Imports from the pre-compiled JS bundle so Vercel never type-checks
 * the TypeScript source (which fails under its forced node16 settings).
 * The bundle is produced by: pnpm --filter @workspace/api-server run build
 */
import app from "../artifacts/api-server/dist/app.mjs";

export default app;
