import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";
import { WebSocket, WebSocketServer } from "ws";

const CHAT_WS_PATH = process.env.CHAT_WS_PATH || "/ws/chat";
const CHAT_WS_ALLOWED_ORIGIN = process.env.CHAT_WS_ALLOWED_ORIGIN?.trim();
const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";
const COOKIE_NAME = "admin_session";
const MAX_MESSAGE_LENGTH = 4000;

const encoder = new TextEncoder();
const prisma = new PrismaClient();

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
  const cookies = parseCookies(request.headers.cookie || "");
  const token = cookies[COOKIE_NAME];
  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, encoder.encode(JWT_SECRET));
    const userId = verified?.payload?.userId;

    if (typeof userId !== "string" || !userId.trim()) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}

export function setupChatWebsocket(server) {
  const clients = new Map();

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

    if (url.pathname !== CHAT_WS_PATH) {
      return;
    }

    if (CHAT_WS_ALLOWED_ORIGIN) {
      const requestOrigin = request.headers.origin;
      if (requestOrigin !== CHAT_WS_ALLOWED_ORIGIN) {
        rejectUpgrade(socket, 403, "Forbidden");
        return;
      }
    }

    const userId = await verifyUserFromRequest(request);
    if (!userId) {
      rejectUpgrade(socket, 401, "Unauthorized");
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request, userId);
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
