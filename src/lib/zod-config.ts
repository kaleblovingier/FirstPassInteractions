import { z } from "zod";

// zod 4 probes `new Function("")` when it builds its first object schema, to decide whether to
// compile fast parsers. The site CSP has no 'unsafe-eval', so that probe raised a
// securitypolicyviolation on every page load. src/router.tsx imports this first, and
// desk-persist.ts imports it too because the server bundle runs that module earlier.
// package.json lists this file under "sideEffects", or the bundler drops the bare imports.
z.config({ jitless: true });
