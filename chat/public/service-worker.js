const CACHE_NAME = "chat-app-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/static/js/main.chunk.js",
  "/static/js/0.chunk.js",
  "/static/js/bundle.js",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error("Error during service worker install:", error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME;
          })
          .map((cacheName) => {
            console.log("Removing old cache:", cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - network-first strategy with fallback to cache
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // For API requests, use network-first strategy
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("socket.io")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If we got a valid response, clone it and store in cache
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // When network fails, try to serve from cache
        return caches.match(event.request);
      })
  );
});

// Handle background sync for offline message sending
self.addEventListener("sync", (event) => {
  if (event.tag === "send-message") {
    event.waitUntil(sendOutboxMessages());
  }
});

// Background sync function to send queued messages
async function sendOutboxMessages() {
  try {
    // Access IndexedDB to get queued messages
    const outboxMessages = await getOutboxMessages();

    // No messages to send
    if (!outboxMessages || outboxMessages.length === 0) {
      return;
    }

    // Process each message
    for (const msg of outboxMessages) {
      try {
        // Get stored auth token
        const token = await getAuthToken();
        if (!token) {
          console.error("No authentication token available");
          return;
        }

        // Send the message to the server
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(msg),
        });

        if (response.ok) {
          // If successful, remove from outbox
          await removeMessageFromOutbox(msg.id);
        }
      } catch (err) {
        console.error("Error sending queued message:", err);
      }
    }
  } catch (err) {
    console.error("Error processing outbox:", err);
  }
}

// Placeholder functions for IndexedDB operations
// These would need to be implemented with actual IndexedDB code
function getOutboxMessages() {
  // This would be implemented to retrieve messages from IndexedDB
  return Promise.resolve([]);
}

function removeMessageFromOutbox(id) {
  // This would be implemented to remove a sent message from IndexedDB
  return Promise.resolve();
}

function getAuthToken() {
  // This would retrieve the auth token from IndexedDB or localStorage
  return Promise.resolve(localStorage.getItem("token"));
}

// Push notification event handler
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.text || "New message received",
      icon: "/logo192.png",
      badge: "/logo192.png",
      data: {
        url: self.location.origin,
        messageId: data.id,
      },
      vibrate: [100, 50, 100],
      actions: [
        {
          action: "view",
          title: "View message",
        },
        {
          action: "close",
          title: "Close",
        },
      ],
    };

    event.waitUntil(self.registration.showNotification("New Message", options));
  } catch (err) {
    console.error("Error showing notification:", err);
  }
});

// Notification click event handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  // Either clicked notification or the "view" action
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // If a window client is already open, focus it
      for (const client of clientList) {
        if (client.url === event.notification.data.url && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
