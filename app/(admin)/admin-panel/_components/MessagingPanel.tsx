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
  lastMessageSenderName: string | null;
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

type MessageGroup = {
  id: string;
  senderId: string | null;
  senderName: string;
  senderImage: string;
  isOwn: boolean;
  messages: ChatMessage[];
};

type MessagingPanelProps = {
  people: PersonIdentity[];
};

const MOBILE_HISTORY_LIMIT = 20;
const DESKTOP_HISTORY_LIMIT = 30;
const ROOM_PREVIEW_MAX_CHARS = 52;
const IRAN_TIMEZONE = "Asia/Tehran";
const GROUP_TIME_GAP_MS = 60 * 1000;

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

function syncServerClockFromHeader(_dateHeader: string | null) {
  // Intentionally no-op: message timestamps are absolute UTC values.
}

function toCalibratedDate(value: string): Date {
  const baseMs = Date.parse(value);
  if (Number.isNaN(baseMs)) {
    return new Date();
  }

  return new Date(baseMs);
}

function getIranDayKey(dateValue: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: IRAN_TIMEZONE,
  }).format(dateValue);
}

async function fetchChatRoomsFromApi() {
  try {
    const response = await fetch("/api/chat/rooms", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    syncServerClockFromHeader(response.headers.get("date"));

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
    syncServerClockFromHeader(response.headers.get("date"));

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
    syncServerClockFromHeader(response.headers.get("date"));

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
    syncServerClockFromHeader(response.headers.get("date"));

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
  const calibratedDate = toCalibratedDate(value);

  return new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: IRAN_TIMEZONE,
  }).format(calibratedDate);
}

function formatRoomTime(value: string | null): string {
  if (!value) return "";

  const date = toCalibratedDate(value);
  const today = new Date();

  const isToday = getIranDayKey(date) === getIranDayKey(today);

  if (isToday) {
    return formatClockTime(value);
  }

  return new Intl.DateTimeFormat("fa-IR", {
    month: "short",
    day: "numeric",
    timeZone: IRAN_TIMEZONE,
  }).format(date);
}

function formatRoomPreview(
  senderName: string | null,
  value: string | null,
): string {
  const normalized = (value || "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "هنوز پیامی ارسال نشده";
  }

  const prefixedText = senderName ? `${senderName}: ${normalized}` : normalized;

  if (prefixedText.length <= ROOM_PREVIEW_MAX_CHARS) {
    return prefixedText;
  }

  return `${prefixedText.slice(0, ROOM_PREVIEW_MAX_CHARS - 3).trimEnd()}...`;
}

function getBubbleRadiusClass(
  isOwn: boolean,
  isFirstInGroup: boolean,
  isLastInGroup: boolean,
): string {
  if (isFirstInGroup && isLastInGroup) {
    return "rounded-2xl";
  }

  if (isOwn) {
    if (isFirstInGroup) {
      return "rounded-2xl rounded-br-lg";
    }

    if (isLastInGroup) {
      return "rounded-2xl rounded-tr-lg";
    }

    return "rounded-xl rounded-tr-lg rounded-br-lg";
  }

  if (isFirstInGroup) {
    return "rounded-2xl rounded-bl-lg";
  }

  if (isLastInGroup) {
    return "rounded-2xl rounded-tl-lg";
  }

  return "rounded-xl rounded-tl-lg rounded-bl-lg";
}

function shouldShowMessageTime(
  messages: ChatMessage[],
  index: number,
): boolean {
  if (index === messages.length - 1) {
    return true;
  }

  const currentMs = Date.parse(messages[index].createdAt);
  const nextMs = Date.parse(messages[index + 1].createdAt);

  if (Number.isNaN(currentMs) || Number.isNaN(nextMs)) {
    return true;
  }

  return nextMs - currentMs > GROUP_TIME_GAP_MS;
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
  const [sendError, setSendError] = useState<string | null>(null);

  const [mobileRoomsVisible, setMobileRoomsVisible] = useState(true);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const activePersonIdRef = useRef<string | null>(null);
  const isPollingFallbackRef = useRef(false);
  const identityPromptedOnMountRef = useRef(false);

  useEffect(() => {
    activePersonIdRef.current = activePersonId;
  }, [activePersonId]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) || null,
    [rooms, selectedRoomId],
  );

  const activePerson = useMemo(
    () => people.find((person) => person.id === activePersonId) || null,
    [people, activePersonId],
  );

  const groupedMessages = useMemo<MessageGroup[]>(() => {
    if (messages.length === 0) {
      return [];
    }

    const groups: MessageGroup[] = [];

    for (const message of messages) {
      const isOwn = Boolean(
        activePersonId && message.senderPerson?.id === activePersonId,
      );
      const senderId = message.senderPerson?.id || null;
      const senderName = message.senderPerson?.name || "کاربر";
      const senderImage = message.senderPerson?.image || "";
      const previousGroup = groups[groups.length - 1];

      if (
        previousGroup &&
        previousGroup.senderId === senderId &&
        previousGroup.isOwn === isOwn
      ) {
        previousGroup.messages.push(message);
      } else {
        groups.push({
          id: message.id,
          senderId,
          senderName,
          senderImage,
          isOwn,
          messages: [message],
        });
      }
    }

    return groups;
  }, [activePersonId, messages]);

  useEffect(() => {
    if (activePersonId) {
      identityPromptedOnMountRef.current = false;
      return;
    }

    if (people.length === 0 || identityPromptedOnMountRef.current) {
      return;
    }

    identityPromptedOnMountRef.current = true;
    setPendingRoomId(null);
    setPickerOpen(true);
  }, [activePersonId, people.length]);

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
        requestAnimationFrame(() => {
          scrollToBottom();
        });
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
          lastMessageSenderName: incoming.senderPerson?.name || null,
          lastMessagePreview: incoming.content.slice(0, 120),
          updatedAt: incoming.createdAt,
        };
      });

      return sortRooms(nextRooms);
    });
  }, []);

  const appendIncomingMessage = useCallback(
    (
      incoming: ChatMessage,
      options?: {
        forceScrollToBottom?: boolean;
      },
    ) => {
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

      const shouldAutoScroll =
        Boolean(options?.forceScrollToBottom) || nearBottom;

      if (shouldAutoScroll) {
        requestAnimationFrame(() => {
          scrollToBottom(options?.forceScrollToBottom ? false : true);
        });
      }
    },
    [scrollToBottom, updateRoomFromMessage],
  );

  const openIdentityPicker = useCallback((roomId?: string | null) => {
    setPendingRoomId(roomId || null);
    setPickerOpen(true);
  }, []);

  const handleSelectRoom = useCallback(
    (roomId: string) => {
      if (!activePersonId) {
        openIdentityPicker(roomId);
        return;
      }

      setSelectedRoomId(roomId);
      setSendError(null);
      void loadInitialMessages(roomId);
      setMobileRoomsVisible(false);
    },
    [activePersonId, loadInitialMessages, openIdentityPicker],
  );

  const selectIdentityAndEnterRoom = useCallback(
    (personId: string) => {
      const targetRoomId = pendingRoomId || selectedRoomId;

      setActivePersonId(personId);
      setPickerOpen(false);
      setPendingRoomId(null);

      if (targetRoomId) {
        setSelectedRoomId(targetRoomId);
        setSendError(null);
        void loadInitialMessages(targetRoomId);
        setMobileRoomsVisible(false);
      }
    },
    [loadInitialMessages, pendingRoomId, selectedRoomId],
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

  const pollLatestMessages = useCallback(async () => {
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

    let cancelled = false;

    const runPolling = async () => {
      if (cancelled) {
        return;
      }

      await pollLatestMessages();
    };

    void runPolling();
    const timer = setInterval(() => {
      void runPolling();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activePersonId, pollLatestMessages, selectedRoomId]);

  const handleSendMessage = useCallback(async () => {
    const content = draft.trim();
    if (!content) {
      return;
    }

    if (!selectedRoomId || !activePersonId) {
      setSendError("Select a room and identity before sending a message");
      return;
    }

    const result = await createChatMessageViaApi({
      roomId: selectedRoomId,
      personId: activePersonId,
      content,
    });

    if (!result.success) {
      setSendError(result.error || "Message send failed");
      return;
    }

    appendIncomingMessage(result.data, { forceScrollToBottom: true });
    setSendError(null);
    setDraft("");
  }, [activePersonId, appendIncomingMessage, draft, selectedRoomId]);

  const currentPendingRoom = useMemo(
    () => rooms.find((room) => room.id === pendingRoomId) || null,
    [pendingRoomId, rooms],
  );

  const roomsPanel = (
    <aside className="flex h-full min-w-0 flex-col overflow-hidden border-slate-200 bg-white/90 backdrop-blur md:border-e dark:border-slate-800 dark:bg-slate-950/85">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          پیام‌رسان
        </h2>
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
              const roomPreview = formatRoomPreview(
                room.lastMessageSenderName,
                room.lastMessagePreview,
              );

              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => handleSelectRoom(room.id)}
                  className={`w-full overflow-hidden rounded-2xl border p-3 text-right transition ${
                    isActive
                      ? "border-primary bg-primary/10"
                      : "border-slate-200 bg-slate-50/70 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {room.name}
                      </p>
                      <p
                        className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400"
                        title={roomPreview}
                      >
                        {roomPreview}
                      </p>
                    </div>
                    <div className="shrink-0 text-left">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatRoomTime(room.lastMessageAt)}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="relative h-[72vh] min-h-[32rem] overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-[0_20px_55px_rgba(2,6,23,0.08)] dark:border-slate-800 dark:from-slate-950 dark:to-slate-900 dark:shadow-[0_20px_55px_rgba(2,6,23,0.45)]">
      <div className="grid h-full grid-cols-1 lg:grid-cols-[16.4rem_minmax(0,1fr)]">
        <div
          className={`${mobileRoomsVisible ? "flex" : "hidden"} min-w-0 lg:flex`}
        >
          {roomsPanel}
        </div>

        <section
          className={`${mobileRoomsVisible ? "hidden" : "flex"} min-w-0 lg:flex h-full flex-col overflow-hidden`}
        >
          {!selectedRoom ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-600 dark:text-slate-300">
              <h3 className="text-xl font-semibold">پیام‌رسان گروهی</h3>
              <p className="mt-2 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
                از لیست گروه‌ها یکی را انتخاب کنید و گفتگو را شروع کنید.
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
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openIdentityPicker(selectedRoom.id)}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-right transition hover:border-primary hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                      {activePerson?.image ? (
                        <img
                          src={getUploadUrl(activePerson.image) || ""}
                          alt={activePerson.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                        {activePerson ? activePerson.name : "انتخاب هویت"}
                      </p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {activePerson
                          ? "هویت فعال"
                          : "برای ارسال پیام لازم است"}
                      </p>
                    </div>
                  </button>
                </div>
              </header>

              <div
                ref={messagesContainerRef}
                onScroll={handleMessagesScroll}
                className="flex-1 overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(215,59,58,0.08),_transparent_48%)] px-3 py-4 md:px-6"
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

                    <div className="space-y-3">
                      {groupedMessages.map((group) => (
                        <div
                          key={group.id}
                          dir="ltr"
                          className={`flex min-w-0 ${
                            group.isOwn ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div className="min-w-0 max-w-[86%] md:max-w-[72%]">
                            {!group.isOwn ? (
                              <div className="mb-2 flex items-center gap-1.5 px-1">
                                <div className="h-5 w-5 overflow-hidden rounded-full border border-slate-300/80 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                                  {group.senderImage ? (
                                    <img
                                      src={
                                        getUploadUrl(group.senderImage) || ""
                                      }
                                      alt={group.senderName}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : null}
                                </div>
                                <p className="truncate text-[10px] font-semibold leading-none text-primary/90">
                                  {group.senderName}
                                </p>
                              </div>
                            ) : null}

                            <div className="space-y-0.5">
                              {group.messages.map((message, messageIndex) => {
                                const isFirstInGroup = messageIndex === 0;
                                const isLastInGroup =
                                  messageIndex === group.messages.length - 1;
                                const showTime = shouldShowMessageTime(
                                  group.messages,
                                  messageIndex,
                                );

                                return (
                                  <div
                                    key={message.id}
                                    dir="rtl"
                                    className={`relative w-fit max-w-full px-3 py-2 text-sm leading-7 shadow-sm ${getBubbleRadiusClass(
                                      group.isOwn,
                                      isFirstInGroup,
                                      isLastInGroup,
                                    )} ${
                                      group.isOwn
                                        ? "bg-[#d7f4bf] text-slate-900 dark:bg-[#2e6843] dark:text-slate-100"
                                        : "border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap break-words">
                                      {message.content}
                                    </p>

                                    {showTime ? (
                                      <div className="mt-1 text-right text-[11px] opacity-70">
                                        {formatClockTime(message.createdAt)}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
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
                {sendError ? (
                  <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                    {sendError}
                  </p>
                ) : null}
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
