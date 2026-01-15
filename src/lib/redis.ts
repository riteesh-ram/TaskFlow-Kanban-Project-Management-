// NOTE: Client-side fallback implementations to keep the app running in the browser
// without requiring Redis credentials. This avoids bundling secrets and works offline.
// Data is stored in localStorage and is NOT shared across users; suitable for demo/dev only.

const LOCAL_STORAGE_PREFIX = 'ckp:';

function getStorageJson<T = any>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function setStorageJson(key: string, value: any) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore quota or serialization errors
  }
}

export const presenceService = {
  // Set user presence for a board
  async setUserPresence(boardId: string, userId: string, userData: any) {
    const key = `presence:${boardId}`;
    const timestamp = Date.now();
    const map = getStorageJson<Record<string, any>>(key, {});
    map[userId] = { ...userData, lastSeen: timestamp };
    setStorageJson(key, map);
  },

  // Get all users present on a board
  async getBoardPresence(boardId: string) {
    const key = `presence:${boardId}`;
    const presence = getStorageJson<Record<string, any>>(key, {});
    const currentTime = Date.now();
    const activePresence: Record<string, any> = {};
    for (const [userId, data] of Object.entries(presence)) {
      if (data && typeof data === 'object' && currentTime - (data as any).lastSeen < 30000) {
        activePresence[userId] = data;
      }
    }
    return activePresence;
  },

  // Remove user presence
  async removeUserPresence(boardId: string, userId: string) {
    const key = `presence:${boardId}`;
    const presence = getStorageJson<Record<string, any>>(key, {});
    delete presence[userId];
    setStorageJson(key, presence);
  },

  // Clean up stale presence data
  async cleanupStalePresence(boardId: string) {
    const key = `presence:${boardId}`;
    const presence = getStorageJson<Record<string, any>>(key, {});
    const now = Date.now();
    let changed = false;
    for (const [userId, data] of Object.entries(presence)) {
      if (!data || now - (data as any).lastSeen > 30000) {
        delete presence[userId];
        changed = true;
      }
    }
    if (changed) setStorageJson(key, presence);
  }
};

// Optimistic update lock service (localStorage-based)
export const lockService = {
  // Acquire a lock for optimistic updates
  async acquireLock(resource: string, userId: string, ttl: number = 5000) {
    const key = `lock:${resource}`;
    const existing = getStorageJson<any>(key, null);
    const now = Date.now();
    if (existing && now - existing.timestamp < ttl) {
      return false;
    }
    setStorageJson(key, { userId, timestamp: now, ttl });
    return true;
  },

  // Release a lock
  async releaseLock(resource: string, userId: string) {
    const key = `lock:${resource}`;
    const existing = getStorageJson<any>(key, null);
    if (existing && existing.userId === userId) {
      try { localStorage.removeItem(LOCAL_STORAGE_PREFIX + key); } catch {}
      return true;
    }
    return false;
  },

  // Check if resource is locked
  async isLocked(resource: string) {
    const key = `lock:${resource}`;
    const existing = getStorageJson<any>(key, null);
    if (!existing) return false;
    const now = Date.now();
    if (now - existing.timestamp > (existing.ttl ?? 5000)) {
      try { localStorage.removeItem(LOCAL_STORAGE_PREFIX + key); } catch {}
      return false;
    }
    return true;
  },

  // Get lock info
  async getLockInfo(resource: string) {
    const key = `lock:${resource}`;
    return getStorageJson<any>(key, null);
  }
};

// Cache service for frequently accessed data (localStorage-based)
export const cacheService = {
  // Cache board data
  async cacheBoardData(boardId: string, data: any, ttl: number = 300) {
    const key = `board:${boardId}`;
    const payload = { data, expiresAt: Date.now() + ttl * 1000 };
    setStorageJson(key, payload);
  },

  // Get cached board data
  async getCachedBoardData(boardId: string) {
    const key = `board:${boardId}`;
    const payload = getStorageJson<any>(key, null);
    if (!payload) return null;
    if (Date.now() > payload.expiresAt) {
      try { localStorage.removeItem(LOCAL_STORAGE_PREFIX + key); } catch {}
      return null;
    }
    return payload.data ?? null;
  },

  // Invalidate board cache
  async invalidateBoardCache(boardId: string) {
    const key = `board:${boardId}`;
    try { localStorage.removeItem(LOCAL_STORAGE_PREFIX + key); } catch {}
  }
};
 
export default {} as const;