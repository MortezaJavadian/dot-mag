"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { getUploadUrl } from "@/lib/uploads";

type PersonIdentity = {
  id: string;
  name: string;
  image: string;
};

type ChatRoomSummary = {
  id: string;
  name: string;
  slug: string;
  isDefault: boolean;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  createdAt: string;
  updatedAt: string;
};

type ChatMessage = {
  id: string;
  roomId: string;
  content: string;
  createdAt: string;
  senderPerson: {
    id: string;
    name: string;
    image: string;
  } | null;
};

type IncomingSocketMessage =
  | {
      type: "connected";
      userId: string;
    }
  | {
      type: "joined-room";
      room: {
        id: string;
        name: string;
        slug: string;
      };
      person: {
        id: string;
        name: string;
        image: string;
      };
    }
  | {
      type: "new-message";
      roomId: string;
      message: ChatMessage;
    }
  | {
      type: "error";
      code: string;
      message: string;
    };

type MessagingPanelProps = {
  people: PersonIdentity[];
};

const MOBILE_HISTORY_LIMIT = 20;
const DESKTOP_HISTORY_LIMIT = 30;
const CHAT_WS_PATH = "/ws/chat";
const MAX_WS_WARMUP_FAILURES = 3;

type ActionResultSuccess<T> = {
  success: true;
  data: T;
};

type ActionResultFailure = {
  success: false;
  error: string;
};

type ChatMessagesPayload = {
  roomId: string;
  messages: ChatMessage[];
  hasMore: boolean;
  nextCursor: string | null;
};

async function fetchChatRoomsFromApi() {
  try {
    const response = await fetch("/api/chat/rooms", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });

    const payload = (await response.json()) as
      | ActionResultSuccess<ChatRoomSummary[]>
      | ActionResultFailure;

    if (!response.ok || !payload.success) {
      return {
        success: false as const,
        error:
          "error" in payload ? payload.error : "Failed to fetch chat rooms",
      };
    }

    return {
      success: true as const,
      data: payload.data,
    };
  } catch {
    return {
      success: false as const,
      error: "Failed to fetch chat rooms",
    };
  }
}

async function fetchChatMessagesFromApi(options: {
  roomId: string;
  beforeMessageId?: string | null;
  limit?: number;
}) {
  try {
    const searchParams = new URLSearchParams({
      roomId: options.roomId,
    });

    if (options.beforeMessageId) {
      searchParams.set("beforeMessageId", options.beforeMessageId);
    }

    if (typeof options.limit === "number") {
      searchParams.set("limit", String(options.limit));
    }

    const response = await fetch(
      `/api/chat/messages?${searchParams.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      },
    );

    const payload = (await response.json()) as
      | ActionResultSuccess<ChatMessagesPayload>
      | ActionResultFailure;

    if (!response.ok || !payload.success) {
      return {
        success: false as const,
        error:
          "error" in payload ? payload.error : "Failed to fetch chat messages",
      };
    }

    return {
      success: true as const,
      data: payload.data,
    };
  } catch {
    return {
      success: false as const,
      error: "Failed to fetch chat messages",
    };
  }
}

async function createChatRoomViaApi(name: string) {
  try {
    const response = await fetch("/api/chat/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ name }),
    });

    const payload = (await response.json()) as
      | ActionResultSuccess<ChatRoomSummary>
      | ActionResultFailure;

    if (!response.ok || !payload.success) {
      return {
        success: false as const,
        error: "error" in payload ? payload.error : "Failed to create room",
      };
    }

    return {
      success: true as const,
      data: payload.data,
    };
  } catch {
    return {
      success: false as const,
      error: "Failed to create room",
    };
  }
}

async function createChatMessageViaApi(data: {
  roomId: string;
  personId: string;
  content: string;
}) {
  try {
    const response = await fetch("/api/chat/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });

    const payload = (await response.json()) as
      | ActionResultSuccess<ChatMessage>
      | ActionResultFailure;

    if (!response.ok || !payload.success) {
      return {
        success: false as const,
        error: "error" in payload ? payload.error : "Failed to create message",
      };
    }

    return {
      success: true as const,
      data: payload.data,
    };
  } catch {
    return {
      success: false as const,
      error: "Failed to create message",
    };
  }
}

function isCompatibleSocketHostname(currentHost: string, targetHost: string) {
  const normalizedCurrent = currentHost.toLowerCase();
  const normalizedTarget = targetHost.toLowerCase();

  return normalizedCurrent === normalizedTarget;
}

function resolveSocketUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const fallbackProtocol =
    window.location.protocol === "https:" ? "wss:" : "ws:";
  const fallbackUrl = `${fallbackProtocol}//${window.location.host}`;

  const explicitUrl = process.env.NEXT_PUBLIC_CHAT_WS_URL?.trim();
  if (!explicitUrl) {
    return fallbackUrl;
  }

  try {
    const parsed = new URL(explicitUrl);

    if (
      !isCompatibleSocketHostname(window.location.hostname, parsed.hostname)
    ) {
      return fallbackUrl;
    }

    const resolvedProtocol =
      parsed.protocol === "ws:" || parsed.protocol === "wss:"
        ? parsed.protocol
        : parsed.protocol === "https:"
          ? "wss:"
          : parsed.protocol === "http:"
            ? "ws:"
            : fallbackProtocol;

    return `${resolvedProtocol}//${parsed.host}`;
  } catch {
    return fallbackUrl;
  }
}

function sortRooms(rooms: ChatRoomSummary[]): ChatRoomSummary[] {
  return [...rooms].sort((a, b) => {
    if (a.isDefault !== b.isDefault) {
      return a.isDefault ? -1 : 1;
    }

    const aTime = a.lastMessageAt || a.updatedAt;
    const bTime = b.lastMessageAt || b.updatedAt;

    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

function formatClockTime(value: string): string {
  return new Date(value).toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRoomTime(value: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  const today = new Date();

  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  if (isToday) {
    return formatClockTime(value);
  }

  return date.toLocaleDateString("fa-IR", {
    month: "short",
    day: "numeric",
  });
}

function mergeMessagesChronologically(
  currentMessages: ChatMessage[],
  incomingMessages: ChatMessage[],
): ChatMessage[] {
  const mergedById = new Map<string, ChatMessage>();

  for (const message of currentMessages) {
    mergedById.set(message.id, message);
  }

  for (const message of incomingMessages) {
    mergedById.set(message.id, message);
  }

  return [...mergedById.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export default function MessagingPanel({ people }: MessagingPanelProps) {
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [newRoomName, setNewRoomName] = useState("");
  const [creatingRoom, setCreatingRoom] = useState(false);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [activePersonId, setActivePersonId] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connecting" | "connected" | "disconnected"
  >("idle");
  const [socketError, setSocketError] = useState<string | null>(null);
  const [isFallbackSyncActive, setIsFallbackSyncActive] = useState(false);

  const [mobileRoomsVisible, setMobileRoomsVisible] = useState(true);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const activePersonIdRef = useRef<string | null>(null);
  const isPollingFallbackRef = useRef(false);
  const fallbackSyncStateRef = useRef(false);
  const wsWarmupFailureCountRef = useRef(0);
  const wsDisabledForSessionRef = useRef(false);

  useEffect(() => {
    activePersonIdRef.current = activePersonId;
  }, [activePersonId]);

  useEffect(() => {
    fallbackSyncStateRef.current = isFallbackSyncActive;
  }, [isFallbackSyncActive]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) || null,
    [rooms, selectedRoomId],
  );

  const activePerson = useMemo(
    () => people.find((person) => person.id === activePersonId) || null,
    [people, activePersonId],
  );

  const historyLimit =
    typeof window !== "undefined" && window.innerWidth < 768
      ? MOBILE_HISTORY_LIMIT
      : DESKTOP_HISTORY_LIMIT;

  const scrollToBottom = useCallback((smooth = false) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const loadInitialMessages = useCallback(
    async (roomId: string) => {
      setLoadingHistory(true);
      setHistoryError(null);

      const result = await fetchChatMessagesFromApi({
        roomId,
        limit: historyLimit,
      });

      if (!result.success) {
        setMessages([]);
        setHasMoreHistory(false);
        setNextCursor(null);
        setHistoryError(result.error || "بارگذاری پیام‌ها انجام نشد");
        setLoadingHistory(false);
        return;
      }

      setMessages(result.data.messages || []);
      setHasMoreHistory(Boolean(result.data.hasMore));
      setNextCursor(result.data.nextCursor || null);
      setLoadingHistory(false);

      requestAnimationFrame(() => {
        scrollToBottom();
      });
    },
    [historyLimit, scrollToBottom],
  );

  const loadRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError(null);

    const result = await fetchChatRoomsFromApi();

    if (!result.success) {
      setRoomsError(result.error || "بارگذاری گروه‌ها انجام نشد");
      setRoomsLoading(false);
      return;
    }

    const ordered = sortRooms(result.data || []);
    setRooms(ordered);

    if (ordered.length === 0) {
      setSelectedRoomId(null);
      setMessages([]);
      setHasMoreHistory(false);
      setNextCursor(null);
      setHistoryError(null);
      setRoomsLoading(false);
      return;
    }

    const selectedStillExists = Boolean(
      selectedRoomId && ordered.some((room) => room.id === selectedRoomId),
    );

    if (!selectedStillExists) {
      setSelectedRoomId(null);
      setMessages([]);
      setHasMoreHistory(false);
      setNextCursor(null);
      setHistoryError(null);
      setRoomsLoading(false);
      return;
    }

    if (selectedRoomId) {
      void loadInitialMessages(selectedRoomId);
    }

    setRoomsLoading(false);
  }, [loadInitialMessages, selectedRoomId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadRooms();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [loadRooms]);

  const updateRoomFromMessage = useCallback((incoming: ChatMessage) => {
    setRooms((prevRooms) => {
      const nextRooms = prevRooms.map((room) => {
        if (room.id !== incoming.roomId) {
          return room;
        }

        return {
          ...room,
          messageCount: room.messageCount + 1,
          lastMessageAt: incoming.createdAt,
          lastMessagePreview: incoming.content.slice(0, 120),
          updatedAt: incoming.createdAt,
        };
      });

      return sortRooms(nextRooms);
    });
  }, []);

  const appendIncomingMessage = useCallback(
    (incoming: ChatMessage) => {
      let wasAdded = false;

      setMessages((prev) => {
        if (prev.some((message) => message.id === incoming.id)) {
          return prev;
        }

        wasAdded = true;
        return [...prev, incoming];
      });

      if (!wasAdded) {
        return;
      }

      updateRoomFromMessage(incoming);

      const container = messagesContainerRef.current;
      if (!container) {
        return;
      }

      const nearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        140;

      if (
        nearBottom ||
        incoming.senderPerson?.id === activePersonIdRef.current
      ) {
        requestAnimationFrame(() => {
          scrollToBottom(true);
        });
      }
    },
    [scrollToBottom, updateRoomFromMessage],
  );

  const openIdentityPicker = useCallback((roomId: string) => {
    setPendingRoomId(roomId);
    setPickerOpen(true);
  }, []);

  const selectIdentityAndEnterRoom = useCallback(
    (personId: string) => {
      if (!pendingRoomId) {
        return;
      }

      setActivePersonId(personId);
      setSelectedRoomId(pendingRoomId);
      void loadInitialMessages(pendingRoomId);
      setMobileRoomsVisible(false);
      setPickerOpen(false);
      setPendingRoomId(null);
    },
    [loadInitialMessages, pendingRoomId],
  );

  const handleCreateRoom = useCallback(async () => {
    const name = newRoomName.trim();
    if (!name || creatingRoom) {
      return;
    }

    setCreatingRoom(true);
    const result = await createChatRoomViaApi(name);

    if (!result.success) {
      setRoomsError(result.error || "ایجاد گروه انجام نشد");
      setCreatingRoom(false);
      return;
    }

    setNewRoomName("");
    setRooms((prevRooms) => sortRooms([result.data, ...prevRooms]));
    setCreatingRoom(false);
  }, [creatingRoom, newRoomName]);

  const handleLoadOlderMessages = useCallback(async () => {
    if (!selectedRoomId || !hasMoreHistory || !nextCursor || loadingOlder) {
      return;
    }

    const container = messagesContainerRef.current;
    const previousScrollHeight = container?.scrollHeight || 0;
    const previousScrollTop = container?.scrollTop || 0;

    setLoadingOlder(true);

    const result = await fetchChatMessagesFromApi({
      roomId: selectedRoomId,
      beforeMessageId: nextCursor,
      limit: historyLimit,
    });

    if (!result.success) {
      setLoadingOlder(false);
      setHistoryError(result.error || "بارگذاری پیام‌های قبلی انجام نشد");
      return;
    }

    const olderMessages = result.data.messages || [];

    setMessages((prev) => [...olderMessages, ...prev]);
    setHasMoreHistory(Boolean(result.data.hasMore));
    setNextCursor(result.data.nextCursor || null);
    setLoadingOlder(false);

    requestAnimationFrame(() => {
      const current = messagesContainerRef.current;
      if (!current) return;
      current.scrollTop =
        current.scrollHeight - previousScrollHeight + previousScrollTop;
    });
  }, [hasMoreHistory, historyLimit, loadingOlder, nextCursor, selectedRoomId]);

  const handleMessagesScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (container.scrollTop <= 70) {
      handleLoadOlderMessages();
    }
  }, [handleLoadOlderMessages]);

  const pollLatestMessagesFallback = useCallback(async () => {
    if (!selectedRoomId || isPollingFallbackRef.current) {
      return;
    }

    isPollingFallbackRef.current = true;

    try {
      const result = await fetchChatMessagesFromApi({
        roomId: selectedRoomId,
        limit: historyLimit,
      });

      if (!result.success) {
        return;
      }

      setIsFallbackSyncActive(true);
      setSocketError(null);

      const latestMessages = result.data.messages || [];
      let hasAnyNew = false;

      setMessages((previousMessages) => {
        const previousIds = new Set(previousMessages.map((m) => m.id));
        hasAnyNew = latestMessages.some(
          (m: ChatMessage) => !previousIds.has(m.id),
        );

        if (!hasAnyNew && previousMessages.length >= latestMessages.length) {
          return previousMessages;
        }

        return mergeMessagesChronologically(previousMessages, latestMessages);
      });

      if (!hasAnyNew) {
        return;
      }

      const container = messagesContainerRef.current;
      if (!container) {
        return;
      }

      const nearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        140;

      if (nearBottom) {
        requestAnimationFrame(() => {
          scrollToBottom(true);
        });
      }
    } finally {
      isPollingFallbackRef.current = false;
    }
  }, [historyLimit, scrollToBottom, selectedRoomId]);

  useEffect(() => {
    if (!selectedRoomId || !activePersonId) {
      return;
    }

    if (connectionStatus === "connected") {
      return;
    }

    let cancelled = false;

    const runPolling = async () => {
      if (cancelled) {
        return;
      }

      await pollLatestMessagesFallback();
    };

    void runPolling();
    const timer = setInterval(() => {
      void runPolling();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [
    activePersonId,
    connectionStatus,
    pollLatestMessagesFallback,
    selectedRoomId,
  ]);

  useEffect(() => {
    if (!selectedRoomId || !activePersonId) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      const timer = setTimeout(() => {
        setConnectionStatus("idle");
        setSocketError(null);
        setIsFallbackSyncActive(false);
      }, 0);

      return () => {
        clearTimeout(timer);
      };
    }

    let cancelled = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) {
        return;
      }

      if (wsDisabledForSessionRef.current) {
        setConnectionStatus("disconnected");
        setIsFallbackSyncActive(true);
        setSocketError(null);
        return;
      }

      const socketBaseUrl = resolveSocketUrl();
      if (!socketBaseUrl) {
        setConnectionStatus("disconnected");
        setSocketError("آدرس اتصال realtime تعریف نشده است");
        return;
      }

      setConnectionStatus("connecting");
      setIsFallbackSyncActive(false);

      let didJoinRoom = false;

      const socket = new WebSocket(`${socketBaseUrl}${CHAT_WS_PATH}`);
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: "join-room",
            roomId: selectedRoomId,
            personId: activePersonId,
          }),
        );
      };

      socket.onmessage = (event) => {
        let packet: IncomingSocketMessage;

        try {
          packet = JSON.parse(event.data as string) as IncomingSocketMessage;
        } catch {
          setSocketError("داده realtime معتبر نیست");
          return;
        }

        if (packet.type === "joined-room") {
          didJoinRoom = true;
          wsWarmupFailureCountRef.current = 0;
          setConnectionStatus("connected");
          setIsFallbackSyncActive(false);
          setSocketError(null);
          return;
        }

        if (packet.type === "new-message") {
          if (packet.roomId === selectedRoomId) {
            appendIncomingMessage(packet.message);
          }
          return;
        }

        if (packet.type === "error") {
          setSocketError(packet.message || "خطای realtime");
        }
      };

      socket.onerror = () => {
        setConnectionStatus("disconnected");
      };

      socket.onclose = () => {
        if (cancelled) {
          return;
        }

        setConnectionStatus("disconnected");

        if (!didJoinRoom) {
          wsWarmupFailureCountRef.current += 1;

          if (wsWarmupFailureCountRef.current >= MAX_WS_WARMUP_FAILURES) {
            wsDisabledForSessionRef.current = true;
            setIsFallbackSyncActive(true);
            setSocketError(null);
            return;
          }
        }

        if (!fallbackSyncStateRef.current) {
          setSocketError((currentError) => {
            if (currentError) {
              return currentError;
            }

            return "Realtime connection is unavailable. Fallback sync is active.";
          });
        }

        reconnectTimeout = setTimeout(() => {
          connect();
        }, 1500);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }

      if (socketRef.current) {
        socketRef.current.close();
      }

      socketRef.current = null;
    };
  }, [activePersonId, appendIncomingMessage, selectedRoomId]);

  const handleSendMessage = useCallback(async () => {
    const content = draft.trim();
    if (!content) {
      return;
    }

    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "send-message",
          content,
        }),
      );

      setDraft("");
      return;
    }

    if (!selectedRoomId || !activePersonId) {
      setSocketError("Select a room and identity before sending a message");
      return;
    }

    const result = await createChatMessageViaApi({
      roomId: selectedRoomId,
      personId: activePersonId,
      content,
    });

    if (!result.success) {
      setSocketError(result.error || "Message send failed");
      return;
    }

    appendIncomingMessage(result.data);
    setIsFallbackSyncActive(true);
    setSocketError(null);
    setConnectionStatus("disconnected");

    setDraft("");
  }, [activePersonId, appendIncomingMessage, draft, selectedRoomId]);

  const currentPendingRoom = useMemo(
    () => rooms.find((room) => room.id === pendingRoomId) || null,
    [pendingRoomId, rooms],
  );

  const roomsPanel = (
    <aside className="flex h-full flex-col border-slate-200 bg-white/90 backdrop-blur md:border-e dark:border-slate-800 dark:bg-slate-950/85">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          پیام‌رسان
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          گروه انتخاب کنید، هویت را مشخص کنید، و پیام متنی بفرستید.
        </p>
      </div>

      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <label
          htmlFor="new-room-name"
          className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          ایجاد گروه جدید
        </label>
        <div className="flex gap-2">
          <input
            id="new-room-name"
            type="text"
            value={newRoomName}
            onChange={(event) => setNewRoomName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleCreateRoom();
              }
            }}
            placeholder="نام گروه"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleCreateRoom}
            disabled={creatingRoom || !newRoomName.trim()}
          >
            {creatingRoom ? "..." : "ایجاد"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {roomsLoading ? (
          <p className="px-2 py-4 text-sm text-slate-500 dark:text-slate-400">
            در حال بارگذاری گروه‌ها...
          </p>
        ) : roomsError ? (
          <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            <p>{roomsError}</p>
            <Button type="button" size="sm" onClick={loadRooms}>
              تلاش دوباره
            </Button>
          </div>
        ) : rooms.length === 0 ? (
          <p className="px-2 py-4 text-sm text-slate-500 dark:text-slate-400">
            هنوز گروهی وجود ندارد.
          </p>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => {
              const isActive = room.id === selectedRoomId;
              return (
                <div
                  key={room.id}
                  className={`rounded-2xl border p-3 transition ${
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-slate-200 bg-slate-50/70 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {room.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                        {room.lastMessagePreview || "هنوز پیامی ارسال نشده"}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatRoomTime(room.lastMessageAt)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {room.messageCount} پیام
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openIdentityPicker(room.id)}
                    className="w-full"
                  >
                    ورود به گروه
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-[0_20px_55px_rgba(2,6,23,0.08)] dark:border-slate-800 dark:from-slate-950 dark:to-slate-900 dark:shadow-[0_20px_55px_rgba(2,6,23,0.45)]">
      <div className="grid min-h-[72vh] grid-cols-1 lg:grid-cols-[20.5rem_minmax(0,1fr)]">
        <div className={`${mobileRoomsVisible ? "flex" : "hidden"} lg:flex`}>
          {roomsPanel}
        </div>

        <section
          className={`${mobileRoomsVisible ? "hidden" : "flex"} lg:flex min-h-[72vh] flex-col`}
        >
          {!selectedRoom ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-600 dark:text-slate-300">
              <h3 className="text-xl font-semibold">پیام‌رسان گروهی</h3>
              <p className="mt-2 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
                از لیست گروه‌ها یکی را انتخاب کنید و با هویت یکی از افراد وارد
                گفتگو شوید.
              </p>
            </div>
          ) : (
            <>
              <header className="border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur md:px-5 dark:border-slate-800 dark:bg-slate-950/90">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 md:gap-3">
                    <button
                      type="button"
                      onClick={() => setMobileRoomsVisible(true)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 transition hover:bg-slate-100 lg:hidden dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      aria-label="بازگشت به لیست گروه‌ها"
                    >
                      ←
                    </button>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100 md:text-lg">
                        {selectedRoom.name}
                      </h3>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {activePerson
                          ? `هویت فعال: ${activePerson.name}`
                          : "برای ارسال پیام هویت انتخاب کنید"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                        connectionStatus === "connected"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : isFallbackSyncActive
                            ? "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
                            : connectionStatus === "connecting"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                      }`}
                    >
                      {connectionStatus === "connected"
                        ? "آنلاین"
                        : isFallbackSyncActive
                          ? "همگام‌سازی"
                          : connectionStatus === "connecting"
                            ? "در حال اتصال"
                            : "آفلاین"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setPendingRoomId(selectedRoom.id);
                        setPickerOpen(true);
                      }}
                    >
                      تغییر هویت
                    </Button>
                  </div>
                </div>

                {socketError && !isFallbackSyncActive ? (
                  <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                    {socketError}
                  </div>
                ) : isFallbackSyncActive ? (
                  <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300">
                    Live sync mode is active. Realtime websocket is blocked
                    upstream.
                  </div>
                ) : null}
              </header>

              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(215,59,58,0.08),_transparent_48%)] px-3 py-4 md:px-6"
              >
                {loadingHistory ? (
                  <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    در حال بارگذاری پیام‌ها...
                  </p>
                ) : historyError ? (
                  <div className="mx-auto max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                    <p>{historyError}</p>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        if (selectedRoomId) {
                          loadInitialMessages(selectedRoomId);
                        }
                      }}
                    >
                      بارگذاری دوباره
                    </Button>
                  </div>
                ) : messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    هنوز پیامی در این گروه ثبت نشده است.
                  </p>
                ) : (
                  <>
                    {hasMoreHistory ? (
                      <div className="mb-4 text-center text-xs text-slate-500 dark:text-slate-400">
                        {loadingOlder
                          ? "در حال بارگذاری پیام‌های قبلی..."
                          : "برای دیدن پیام‌های قبلی به بالا اسکرول کنید"}
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      {messages.map((message) => {
                        const isOwn =
                          activePersonId &&
                          message.senderPerson?.id === activePersonId;

                        return (
                          <div
                            key={message.id}
                            dir="ltr"
                            className={`flex ${
                              isOwn ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div
                              dir="rtl"
                              className={`max-w-[86%] rounded-2xl px-3 py-2 text-sm leading-7 shadow-sm md:max-w-[72%] ${
                                isOwn
                                  ? "bg-[#d7f4bf] text-slate-900 dark:bg-[#2e6843] dark:text-slate-100"
                                  : "border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                              }`}
                            >
                              {!isOwn ? (
                                <p className="mb-1 text-[11px] font-semibold text-primary">
                                  {message.senderPerson?.name || "کاربر"}
                                </p>
                              ) : null}

                              <p className="whitespace-pre-wrap break-words">
                                {message.content}
                              </p>

                              <div className="mt-1 text-left text-[11px] opacity-70">
                                {formatClockTime(message.createdAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <footer className="border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:p-4 dark:border-slate-800 dark:bg-slate-950/90">
                <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="پیام متنی بنویسید..."
                    className="max-h-36 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                    rows={1}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={!activePerson}
                  />
                  <Button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!activePerson || !draft.trim()}
                    className="h-10 px-4"
                  >
                    ارسال
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  ارسال با Enter و خط جدید با Shift+Enter
                </p>
              </footer>
            </>
          )}
        </section>
      </div>

      {pickerOpen ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-3">
              <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                انتخاب هویت ورود
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {currentPendingRoom
                  ? `برای ورود به «${currentPendingRoom.name}» یک فرد انتخاب کنید.`
                  : "یک فرد برای ارسال پیام انتخاب کنید."}
              </p>
            </div>

            {people.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                هیچ فردی برای انتخاب وجود ندارد. ابتدا از تب «افراد» یک فرد
                ایجاد کنید.
              </div>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto">
                {people.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => selectIdentityAndEnterRoom(person.id)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right transition hover:border-primary hover:bg-primary/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary"
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                      {person.image ? (
                        <img
                          src={getUploadUrl(person.image) || ""}
                          alt={person.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {person.name}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        ورود با این هویت
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPickerOpen(false);
                  setPendingRoomId(null);
                }}
              >
                بستن
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
