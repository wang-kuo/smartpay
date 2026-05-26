import { serve } from "@hono/node-server";
import app from "./app";

const port = Number(process.env.PORT ?? 8787);

serve(
  {
    fetch: app.fetch,
    hostname: process.env.HOST ?? "127.0.0.1",
    port
  },
  (info) => {
    console.log(`SmartPay API listening on http://localhost:${info.port}`);
  }
);
