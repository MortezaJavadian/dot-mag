import { createServer } from "node:http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);

const app = next({
  dev,
  hostname,
  port,
});

const handle = app.getRequestHandler();

async function bootstrap() {
  await app.prepare();

  const server = createServer((request, response) => {
    handle(request, response).catch((error) => {
      console.error("Request handler error:", error);
      response.statusCode = 500;
      response.end("Internal Server Error");
    });
  });

  server.listen(port, hostname, () => {
    console.log(
      `DotMag server listening on http://${hostname}:${port} (mode: ${dev ? "dev" : "prod"})`,
    );
  });

  async function shutdown(signal) {
    console.log(`Received ${signal}. Shutting down DotMag server...`);

    server.close(() => {
      process.exit(0);
    });
  }

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap DotMag server:", error);
  process.exit(1);
});
