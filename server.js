// Vercel Express entrypoint: delegate to the bundled Node ESM application.
// The build script must generate dist/server.js before Vercel packages this entrypoint.
import app from "./dist/server.js";

export default app;
