// server.ts — boot the API (§C.3). Fails fast on invalid env (config/env.ts).
import { createApp } from './app';
import { env } from './config/env';

const app = createApp();
app.listen(env.PORT, () => {
  console.log(`AgriSense API → http://localhost:${env.PORT}  (CAAS_MODE=${env.CAAS_MODE})`);
});
