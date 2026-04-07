import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";
import { WebSocket, WebSocketServer } from "ws";

const CHAT_WS_PATH = process.env.CHAT_WS_PATH || "/ws/chat";
const CHAT_WS_ALLOWED_ORIGIN = process.env.CHAT_WS_ALLOWED_ORIGIN || "";
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const COOKIE_NAME = "admin_session";
const MAX_MESSAGE_LENGTH = 4000;

const encoder = new TextEncoder();
const prisma = new PrismaClient();

function normalizeOrigin(originValue) {
  if (typeof originValue !== "string" || !originValue.trim()) {
    return null;
  }

  try {
    const parsed = new URL(originValue.trim());
    const protocol = parsed.protocol.toLowerCase();
    const hostname = parsed.hostname.toLowerCase();
    const port = parsed.port;
    const isDefaultPort =
      (protocol === "http:" && port === "80") ||
      (protocol === "https:" && port === "443");
    const normalizedPort = port && !isDefaultPort ? `:${port}` : "";

    return `${protocol}//${hostname}${normalizedPort}`;
  } catch {
    return null;
  }
}

function getOriginVariants(originValue) {
  const normalized = normalizeOrigin(originValue);
  if (!normalized) {
    return [];
  }

  const parsed = new URL(normalized);
  const baseProtocol = parsed.protocol;
  const basePort = parsed.port ? `:${parsed.port}` : "";
  const variants = new Set([normalized]);

  if (parsed.hostname.startsWith("www.")) {
    const withoutWww = parsed.hostname.slice(4);
    variants.add(`${baseProtocol}//${withoutWww}${basePort}`);
  } else {
    variants.add(`${baseProtocol}//www.${parsed.hostname}${basePort}`);
  }

  return [...variants];
}

const allowedOrigins = new Set(
  CHAT_WS_ALLOWED_ORIGIN.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .flatMap((originValue) => getOriginVariants(originValue)),
);

function parseCookies(cookieHeader = "") {
  const parsed = {};

  for (const segment of cookieHeader.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex);
    const value = trimmed.slice(separatorIndex + 1);

    try {
      parsed[key] = decodeURIComponent(value);
    } catch {
      parsed[key] = value;
    }
  }

  return parsed;
}

function sanitizeMessage(rawContent) {
  if (typeof rawContent !== "string") {
    return "";
  }

  return rawContent.replace(/\r\n/g, "\n").trim();
}

function sendEvent(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(payload));
}

function rejectUpgrade(socket, statusCode, statusText) {
  socket.write(
    `HTTP/1.1 ${statusCode} ${statusText}\r\nConnection: close\r\n\r\n`,
  );
  socket.destroy();
}

async function verifyUserFromRequest(request) {
  const rawCookieHeader = request.headers.cookie || "";
  const cookies = parseCookies(rawCookieHeader);
  const token = cookies[COOKIE_NAME];
  const cookieNames = Object.keys(cookies);

  if (!rawCookieHeader) {
    return {
      userId: null,
      reason: "missing_cookie_header",
      hasCookieHeader: false,
      hasSessionCookie: false,
      cookieNames,
    };
  }

  if (!token) {
    return {
      userId: null,
      reason: "missing_admin_session_cookie",
      hasCookieHeader: true,
      hasSessionCookie: false,
      cookieNames,
    };
  }

  try {
    const verified = await jwtVerify(token, encoder.encode(JWT_SECRET));
    const userId = verified?.payload?.userId;

    if (typeof userId !== "string" || !userId.trim()) {
      return {
        userId: null,
        reason: "missing_user_id_claim",
        hasCookieHeader: true,
        hasSessionCookie: true,
        cookieNames,
      };
    }

    return {
      userId,
      reason: null,
      hasCookieHeader: true,
      hasSessionCookie: true,
      cookieNames,
    };
  } catch {
    return {
      userId: null,
      reason: "invalid_admin_session_token",
      hasCookieHeader: true,
      hasSessionCookie: true,
      cookieNames,
    };
  }
}

export function setupChatWebsocket(server) {
  const clients = new Map();

  console.log("[chat-ws] runtime initialized", {
    path: CHAT_WS_PATH,
    allowedOrigins: [...allowedOrigins],
  });

  const wss = new WebSocketServer({
    noServer: true,
  });

  function broadcastRoomMessage(roomId, messagePayload) {
    for (const [socket, state] of clients.entries()) {
      if (state.roomId !== roomId) {
        continue;
      }

      sendEvent(socket, {
        type: "new-message",
        roomId,
        message: messagePayload,
      });
    }
  }

  wss.on("connection", (socket, request, userId) => {
    clients.set(socket, {
      userId,
      roomId: null,
      personId: null,
      personName: null,
    });

    sendEvent(socket, {
      type: "connected",
      userId,
    });

    socket.on("message", async (rawData) => {
      const state = clients.get(socket);
      if (!state) {
        return;
      }

      let packet;
      try {
        packet = JSON.parse(rawData.toString("utf8"));
      } catch {
        sendEvent(socket, {
          type: "error",
          code: "INVALID_PACKET",
          message: "Message packet is not valid JSON",
        });
        return;
      }

      if (!packet || typeof packet !== "object") {
        sendEvent(socket, {
          type: "error",
          code: "INVALID_PACKET",
          message: "Message packet is invalid",
        });
        return;
      }

      if (packet.type === "join-room") {
        const roomId =
          typeof packet.roomId === "string" ? packet.roomId.trim() : "";
        const personId =
          typeof packet.personId === "string" ? packet.personId.trim() : "";

        if (!roomId || !personId) {
          sendEvent(socket, {
            type: "error",
            code: "INVALID_JOIN_PAYLOAD",
            message: "roomId and personId are required",
          });
          return;
        }

        const [room, person] = await Promise.all([
          prisma.chatRoom.findUnique({
            where: { id: roomId },
            select: {
              id: true,
              name: true,
              slug: true,
            },
          }),
          prisma.person.findUnique({
            where: { id: personId },
            select: {
              id: true,
              name: true,
              image: true,
            },
          }),
        ]);

        if (!room) {
          sendEvent(socket, {
            type: "error",
            code: "ROOM_NOT_FOUND",
            message: "Chat room not found",
          });
          return;
        }

        if (!person) {
          sendEvent(socket, {
            type: "error",
            code: "PERSON_NOT_FOUND",
            message: "Selected identity not found",
          });
          return;
        }

        state.roomId = room.id;
        state.personId = person.id;
        state.personName = person.name;

        sendEvent(socket, {
          type: "joined-room",
          room: {
            id: room.id,
            name: room.name,
            slug: room.slug,
          },
          person,
        });
        return;
      }

      if (packet.type === "send-message") {
        if (!state.roomId || !state.personId) {
          sendEvent(socket, {
            type: "error",
            code: "NOT_JOINED",
            message: "You must join a room first",
          });
          return;
        }

        const content = sanitizeMessage(packet.content);

        if (!content) {
          sendEvent(socket, {
            type: "error",
            code: "EMPTY_MESSAGE",
            message: "Message cannot be empty",
          });
          return;
        }

        if (content.length > MAX_MESSAGE_LENGTH) {
          sendEvent(socket, {
            type: "error",
            code: "MESSAGE_TOO_LONG",
            message: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
          });
          return;
        }

        const [room, person] = await Promise.all([
          prisma.chatRoom.findUnique({
            where: { id: state.roomId },
            select: {
              id: true,
            },
          }),
          prisma.person.findUnique({
            where: { id: state.personId },
            select: {
              id: true,
              name: true,
              image: true,
            },
          }),
        ]);

        if (!room || !person) {
          sendEvent(socket, {
            type: "error",
            code: "INVALID_SESSION",
            message: "Room or identity is no longer valid",
          });
          return;
        }

        const [message] = await prisma.$transaction([
          prisma.chatMessage.create({
            data: {
              roomId: room.id,
              senderUserId: state.userId,
              senderPersonId: person.id,
              content,
            },
            select: {
              id: true,
              roomId: true,
              content: true,
              createdAt: true,
            },
          }),
          prisma.chatRoom.update({
            where: { id: room.id },
            data: { updatedAt: new Date() },
            select: { id: true },
          }),
        ]);

        const payload = {
          id: message.id,
          roomId: message.roomId,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          senderPerson: {
            id: person.id,
            name: person.name,
            image: person.image,
          },
        };

        broadcastRoomMessage(room.id, payload);
        return;
      }

      sendEvent(socket, {
        type: "error",
        code: "UNKNOWN_EVENT",
        message: "Unsupported event type",
      });
    });

    socket.on("close", () => {
      clients.delete(socket);
    });

    socket.on("error", () => {
      clients.delete(socket);
    });
  });

  server.on("upgrade", async (request, socket, head) => {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    const upgradeHeader = (request.headers.upgrade || "").toLowerCase();

    if (upgradeHeader === "websocket" && url.pathname !== CHAT_WS_PATH) {
      console.warn("[chat-ws] upgrade ignored: path mismatch", {
        requestedPath: url.pathname,
        expectedPath: CHAT_WS_PATH,
        host: request.headers.host || null,
        origin: request.headers.origin || null,
      });
    }

    if (url.pathname !== CHAT_WS_PATH) {
      return;
    }

    console.log("[chat-ws] upgrade request", {
      host: request.headers.host || null,
      origin: request.headers.origin || null,
      path: url.pathname,
      upgradeHeader: request.headers.upgrade || null,
      connectionHeader: request.headers.connection || null,
      userAgent: request.headers["user-agent"] || null,
    });

    if (allowedOrigins.size > 0) {
      const requestOrigin = normalizeOrigin(request.headers.origin || "");
      if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
        console.warn("[chat-ws] upgrade rejected: origin", {
          origin: request.headers.origin || null,
          normalizedOrigin: requestOrigin,
          allowedOrigins: [...allowedOrigins],
        });
        rejectUpgrade(socket, 403, "Forbidden");
        return;
      }
    }

    const authResult = await verifyUserFromRequest(request);
    if (!authResult.userId) {
      console.warn("[chat-ws] upgrade rejected: unauthorized", {
        reason: authResult.reason,
        origin: request.headers.origin || null,
        host: request.headers.host || null,
        hasCookieHeader: authResult.hasCookieHeader,
        hasSessionCookie: authResult.hasSessionCookie,
        cookieNames: authResult.cookieNames,
      });
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }

    console.log("[chat-ws] upgrade accepted", {
      userId: authResult.userId,
      origin: request.headers.origin || null,
      host: request.headers.host || null,
      path: url.pathname,
    });

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, authResult.userId);
    });
  });

  async function shutdown() {
    for (const socket of clients.keys()) {
      try {
        socket.close(1001, "Server shutting down");
      } catch {
        // Ignore socket close failures during shutdown.
      }
    }

    await Promise.all([
      new Promise((resolve) => wss.close(resolve)),
      prisma.$disconnect(),
    ]);
  }

  return {
    shutdown,
  };
}
