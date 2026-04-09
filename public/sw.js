const STATIC_CACHE_NAME = "dotmag-static-v3";
const RUNTIME_CACHE_NAME = "dotmag-runtime-v3";
const AUDIO_CACHE_NAME = "dotmag-audio-v3";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/",
  "/radio",
  "/offline.html",
  "/assets/fonts/webfonts/Vazirmatn[wght].woff2",
  "/assets/images/dot-logo.png",
];

function isAudioUploadPath(pathname) {
  return /\/api\/uploads\/.*\.(mp3|mpeg|mp4|m4a|aac|wav|ogg|webm)$/i.test(
    pathname,
  );
}

function buildRangeResponse(response, rangeHeader) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader || "");
  if (!match) {
    return null;
  }

  return response.arrayBuffer().then((buffer) => {
    const fileSize = buffer.byteLength;
    const start = match[1] ? Number.parseInt(match[1], 10) : 0;
    const requestedEnd = match[2]
      ? Number.parseInt(match[2], 10)
      : fileSize - 1;
    const end = Math.min(requestedEnd, fileSize - 1);

    if (
      Number.isNaN(start) ||
      Number.isNaN(end) ||
      start < 0 ||
      start > end ||
      start >= fileSize
    ) {
      return new Response(null, {
        status: 416,
        headers: {
          "Content-Range": `bytes */${fileSize}`,
        },
      });
    }

    const chunk = buffer.slice(start, end + 1);
    const headers = new Headers(response.headers);
    headers.set("Content-Length", String(chunk.byteLength));
    headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
    headers.set("Accept-Ranges", "bytes");

    return new Response(chunk, {
      status: 206,
      headers,
    });
  });
}

function parseRangeHeader(rangeHeader) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader || "");
  if (!match) {
    return null;
  }

  const hasStart = typeof match[1] === "string" && match[1] !== "";
  const hasEnd = typeof match[2] === "string" && match[2] !== "";

  if (!hasStart && !hasEnd) {
    return null;
  }

  const start = hasStart ? Number.parseInt(match[1], 10) : 0;
  const end = hasEnd ? Number.parseInt(match[2], 10) : null;

  if (Number.isNaN(start) || (end !== null && Number.isNaN(end))) {
    return null;
  }

  return {
    start,
    end,
  };
}

function parseContentRangeHeader(contentRangeHeader) {
  const match = /^bytes\s+(\d+)-(\d+)\/(\d+)$/.exec(contentRangeHeader || "");
  if (!match) {
    return null;
  }

  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);
  const total = Number.parseInt(match[3], 10);

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    Number.isNaN(total) ||
    start < 0 ||
    end < start ||
    total <= 0
  ) {
    return null;
  }

  return {
    start,
    end,
    total,
  };
}

async function buildRangeResponseFromCachedPartial(response, rangeHeader) {
  const requested = parseRangeHeader(rangeHeader);
  if (!requested) {
    return null;
  }

  const cached = parseContentRangeHeader(response.headers.get("Content-Range"));
  if (!cached) {
    return null;
  }

  const requestStart = requested.start;
  const requestEnd =
    requested.end === null ? cached.end : Math.min(requested.end, cached.end);

  if (
    requestStart < cached.start ||
    requestEnd > cached.end ||
    requestStart > requestEnd
  ) {
    return null;
  }

  const buffer = await response.arrayBuffer();
  const relativeStart = requestStart - cached.start;
  const relativeEnd = requestEnd - cached.start;

  if (
    relativeStart < 0 ||
    relativeEnd >= buffer.byteLength ||
    relativeStart > relativeEnd
  ) {
    return null;
  }

  const chunk = buffer.slice(relativeStart, relativeEnd + 1);
  const headers = new Headers(response.headers);
  headers.set("Content-Length", String(chunk.byteLength));
  headers.set(
    "Content-Range",
    `bytes ${requestStart}-${requestEnd}/${cached.total}`,
  );
  headers.set("Accept-Ranges", "bytes");

  return new Response(chunk, {
    status: 206,
    headers,
  });
}

async function handleNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(STATIC_CACHE_NAME);
    return (await cache.match(OFFLINE_URL)) || Response.error();
  }
}

async function handleRuntimeRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse || Response.error());

  if (cachedResponse) {
    return cachedResponse;
  }

  return networkPromise;
}

async function handleAudioUploadRequest(request) {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const rangeHeader = request.headers.get("range");

  if (rangeHeader) {
    const cachedRange = await cache.match(request);
    if (cachedRange) {
      return cachedRange;
    }

    const fullRequest = new Request(request.url, { method: "GET" });
    const fullResponse = await cache.match(fullRequest);

    if (fullResponse) {
      const rangedFromFull = await buildRangeResponse(
        fullResponse,
        rangeHeader,
      );
      if (rangedFromFull) {
        return rangedFromFull;
      }
    }

    const cachedRequests = await cache.keys();
    for (const cachedRequest of cachedRequests) {
      if (cachedRequest.url !== request.url || cachedRequest.method !== "GET") {
        continue;
      }

      const cachedRangeHeader = cachedRequest.headers.get("range");
      if (!cachedRangeHeader) {
        continue;
      }

      const cachedPartial = await cache.match(cachedRequest);
      if (!cachedPartial) {
        continue;
      }

      const rangedFromPartial = await buildRangeResponseFromCachedPartial(
        cachedPartial,
        rangeHeader,
      );

      if (rangedFromPartial) {
        return rangedFromPartial;
      }
    }

    try {
      const networkResponse = await fetch(request);
      if (networkResponse.status === 206 || networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch {
      return Response.error();
    }
  }

  const cachedFull = await cache.match(request);
  if (cachedFull) {
    return cachedFull;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return Response.error();
  }
}

// Install event - cache essential resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }),
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(
            (name) =>
              name !== STATIC_CACHE_NAME &&
              name !== RUNTIME_CACHE_NAME &&
              name !== AUDIO_CACHE_NAME,
          )
          .map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigation(event.request));
    return;
  }

  if (isAudioUploadPath(url.pathname)) {
    event.respondWith(handleAudioUploadRequest(event.request));
    return;
  }

  event.respondWith(handleRuntimeRequest(event.request));
});
