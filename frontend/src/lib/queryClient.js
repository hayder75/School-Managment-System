import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";

// Bump this string to invalidate every client's persisted cache after a
// breaking change to query shapes.
const CACHE_VERSION = "v3";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 60s: navigating back is instant, no refetch spinner.
      staleTime: 60_000,
      // Keep unused cache for 30 min before garbage collection.
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Keep previous data while a new key loads (lists, pagination, search).
      placeholderData: (prev) => prev,
    },
    mutations: {
      retry: 0,
    },
  },
});

const idbStorage = {
  getItem: (key) => get(key),
  setItem: (key, value) => set(key, value),
  removeItem: (key) => del(key),
};

export const persister = createAsyncStoragePersister({
  storage: idbStorage,
  key: "sms-query-cache",
  throttleTime: 1000,
});

export const PERSIST_OPTIONS = {
  persister,
  maxAge: 24 * 60 * 60 * 1000, // restore cache up to 24h old
  buster: CACHE_VERSION,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => query.state.status === "success",
  },
};

// Clear in-memory + persisted cache (call on logout / user switch).
export async function clearClientCache() {
  queryClient.clear();
  try {
    await persister.removeClient();
  } catch {
    // ignore
  }
}
