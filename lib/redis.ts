const url = process.env.UPSTASH_REDIS_REST_URL || "";
const token = process.env.UPSTASH_REDIS_REST_TOKEN || "";

async function command<T = unknown>(args: unknown[]): Promise<T | null> {
  if (!url || !token) return null;
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Redis HTTP ${response.status}`);
  const data = await response.json();
  return (data?.result ?? null) as T | null;
}

export async function getCacheSafe<T>(key: string): Promise<T | null> {
  try {
    const value = await command<string>(["GET", key]);
    if (value == null) return null;
    try { return JSON.parse(value) as T; } catch { return value as T; }
  } catch (error) {
    console.error(`[Redis Error] GET ${key}:`, error);
    return null;
  }
}

export async function setCacheSafe(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  try {
    await command(["SET", key, JSON.stringify(value), "EX", ttlSeconds]);
  } catch (error) {
    console.error(`[Redis Error] SET ${key}:`, error);
  }
}

export async function invalidateCacheSafe(key: string): Promise<void> {
  try {
    await command(["DEL", key]);
  } catch (error) {
    console.error(`[Redis Error] DEL ${key}:`, error);
  }
}
