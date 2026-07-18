/**
 * Vercel serverless entry — exports the Express app without calling app.listen().
 * Bundled by esbuild into dist/vercel-handler.mjs so all workspace packages and
 * dependencies are inlined; Vercel imports the bundle directly instead of
 * attempting to transpile our TypeScript workspace imports.
 */
export { default } from "./app";
