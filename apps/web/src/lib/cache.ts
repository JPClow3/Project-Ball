import { Redis } from "@upstash/redis";

const redisUrl = process.env.REDIS_URL || import.meta.env.REDIS_URL;
const redisToken = process.env.REDIS_TOKEN || import.meta.env.REDIS_TOKEN;

const redis = redisUrl && redisToken ? new Redis({
  url: redisUrl,
  token: redisToken,
}) : null;

const memoryCache = new Map<string, { value: any, expiry: number }>();

export async function getCache<T>(key: string): Promise<T | null> {
  if (redis) {
    return redis.get<T>(key);
  }
  
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return item.value as T;
}

export async function setCache(key: string, value: any, ttlSeconds: number): Promise<void> {
  if (redis) {
    await redis.setex(key, ttlSeconds, value);
    return;
  }
  
  memoryCache.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
}

export async function deleteCache(key: string): Promise<void> {
  if (redis) {
    await redis.del(key);
    return;
  }
  
  memoryCache.delete(key);
}
