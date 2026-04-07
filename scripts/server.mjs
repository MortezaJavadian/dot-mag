import { createServer } from "node:http";
import next from "next";
import { setupChatWebsocket } from "./chat-websocket-handler.mjs";

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
    const nextActionHeader = request.headers["next-action"];
    const requestUrl = request.url || "";

    if (requestUrl.startsWith("/ws/chat")) {
      console.warn("[chat-ws] ws-path request reached http handler", {
        method: request.method || null,
        url: requestUrl,
        host: request.headers.host || null,
        origin: request.headers.origin || null,
        upgradeHeader: request.headers.upgrade || null,
        connectionHeader: request.headers.connection || null,
        secWebSocketKey: request.headers["sec-websocket-key"] || null,
        userAgent: request.headers["user-agent"] || null,
        forwardedFor: request.headers["x-forwarded-for"] || null,
      });
    }

    if (typeof nextActionHeader === "string" && nextActionHeader) {
      console.warn("[next-action] incoming request", {
        actionId: nextActionHeader,
        method: request.method || null,
        url: request.url || null,
        host: request.headers.host || null,
        origin: request.headers.origin || null,
        referer: request.headers.referer || null,
        userAgent: request.headers["user-agent"] || null,
        forwardedFor: request.headers["x-forwarded-for"] || null,
      });
    }

    handle(request, response).catch((error) => {
      console.error("Request handler error:", error);
      response.statusCode = 500;
      response.end("Internal Server Error");
    });
  });

  const websocketRuntime = setupChatWebsocket(server);

  server.listen(port, hostname, () => {
    console.log(
      `DotMag server listening on http://${hostname}:${port} (mode: ${dev ? "dev" : "prod"})`,
    );
  });

  async function shutdown(signal) {
    console.log(`Received ${signal}. Shutting down DotMag server...`);

    server.close(async () => {
      await websocketRuntime.shutdown();
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
