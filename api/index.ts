/**
 * Vercel serverless entry point.
 * Wraps the Express app for deployment as a Vercel function.
 * The pnpm monorepo workspace packages (@workspace/db etc.) are resolved
 * via the root package.json workspaces config during Vercel's build.
 */
import app from "../artifacts/api-server/src/app";

export default app;
