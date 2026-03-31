/**
 * Performance optimization utilities
 * 
 * Provides caching for:
 * - DID documents
 * - Public keys
 * - Cryptographic operation results
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
}

/**
 * Generic cache implementation with TTL support
 */
class Cache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly ttl: number;
  private readonly maxSize: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 5 * 60 * 1000; // Default 5 minutes
    this.maxSize = options.maxSize || 100;
  }

  /**
   * Sets a value in the cache
   */
  set(key: string, value: T, customTtl?: number): void {
    const ttl = customTtl || this.ttl;
    const now = Date.now();
    
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data: value,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  /**
   * Gets a value from the cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Checks if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Deletes a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clears all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets cache statistics
   */
  getStats(): {size: number; maxSize: number; hitRate: number} {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // Would need hit/miss tracking for accurate rate
    };
  }

  /**
   * Gets the oldest cache key
   */
  private getOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Removes expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

/**
 * DID Document cache
 * Caches resolved DID documents to avoid repeated resolution
 */
export const didDocumentCache = new Cache<any>({
  ttl: 30 * 60 * 1000, // 30 minutes
  maxSize: 50,
});

/**
 * Public key cache
 * Caches extracted public keys from DIDs
 */
export const publicKeyCache = new Cache<string>({
  ttl: 30 * 60 * 1000, // 30 minutes
  maxSize: 100,
});

/**
 * Signature verification cache
 * Caches verification results for identical signatures
 */
export const signatureVerificationCache = new Cache<boolean>({
  ttl: 10 * 60 * 1000, // 10 minutes
  maxSize: 200,
});

/**
 * Hash computation cache
 * Caches hash results for identical inputs
 */
export const hashCache = new Cache<string>({
  ttl: 60 * 60 * 1000, // 1 hour
  maxSize: 500,
});

/**
 * Generates a cache key from multiple parameters
 */
export const generateCacheKey = (...params: any[]): string => {
  return params
    .map(p => {
      if (typeof p === 'object') {
        return JSON.stringify(p);
      }
      return String(p);
    })
    .join('::');
};

/**
 * Memoization decorator for expensive functions
 */
export const memoize = <T extends (...args: any[]) => any>(
  fn: T,
  options: CacheOptions = {}
): T => {
  const cache = new Cache<ReturnType<T>>(options);

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = generateCacheKey(...args);
    const cached = cache.get(key);

    if (cached !== null) {
      return cached;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

/**
 * Async memoization for promises
 */
export const memoizeAsync = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: CacheOptions = {}
): T => {
  const cache = new Cache<ReturnType<T>>(options);
  const pendingPromises = new Map<string, Promise<any>>();

  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = generateCacheKey(...args);
    
    // Check cache first
    const cached = cache.get(key);
    if (cached !== null) {
      return cached;
    }

    // Check if there's a pending promise for this key
    const pending = pendingPromises.get(key);
    if (pending) {
      return pending;
    }

    // Execute function and cache result
    const promise = fn(...args);
    pendingPromises.set(key, promise);

    try {
      const result = await promise;
      cache.set(key, result);
      return result;
    } finally {
      pendingPromises.delete(key);
    }
  }) as T;
};

/**
 * Batch processing utility for cryptographic operations
 */
export class BatchProcessor<T, R> {
  private queue: Array<{
    input: T;
    resolve: (result: R) => void;
    reject: (error: Error) => void;
  }> = [];
  private processing = false;
  private readonly batchSize: number;
  private readonly processFn: (batch: T[]) => Promise<R[]>;

  constructor(processFn: (batch: T[]) => Promise<R[]>, batchSize: number = 10) {
    this.processFn = processFn;
    this.batchSize = batchSize;
  }

  /**
   * Adds an item to the batch queue
   */
  async add(input: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({input, resolve, reject});
      this.processQueue();
    });
  }

  /**
   * Processes the queue in batches
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      const inputs = batch.map(item => item.input);

      try {
        const results = await this.processFn(inputs);
        
        batch.forEach((item, index) => {
          item.resolve(results[index]);
        });
      } catch (error) {
        batch.forEach(item => {
          item.reject(error as Error);
        });
      }
    }

    this.processing = false;
  }
}

/**
 * Cleanup function to run periodically
 */
export const cleanupAllCaches = (): void => {
  const caches = [
    didDocumentCache,
    publicKeyCache,
    signatureVerificationCache,
    hashCache,
  ];

  let totalRemoved = 0;
  caches.forEach(cache => {
    totalRemoved += cache.cleanup();
  });

  console.log(`Cache cleanup: removed ${totalRemoved} expired entries`);
};

/**
 * Gets statistics for all caches
 */
export const getAllCacheStats = () => {
  return {
    didDocuments: didDocumentCache.getStats(),
    publicKeys: publicKeyCache.getStats(),
    signatureVerifications: signatureVerificationCache.getStats(),
    hashes: hashCache.getStats(),
  };
};

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupAllCaches, 5 * 60 * 1000);
}
