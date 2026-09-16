import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export async function getCacheSafe<T>(key: string): Promise<T | null> {
  try {
    return await redis.get<T>(key);
  } catch (error) {
    console.error(`[Redis Error] GET ${key}:`, error);
    return null; // Fallback to DB
  }
}

export async function setCacheSafe(key: string, value: any, ttlSeconds = 300): Promise<void> {
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error(`[Redis Error] SET ${key}:`, error);
  }
}

export async function invalidateCacheSafe(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`[Redis Error] DEL ${key}:`, error);
  }
}
