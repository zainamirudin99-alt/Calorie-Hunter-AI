// In-memory sliding window rate limiter for protecting Gemini API endpoints
const rateLimitMap = new Map<string, number[]>();

interface RateLimitConfig {
  limit: number;       // Maximum requests
  windowMs: number;    // Window size in milliseconds
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { limit: 10, windowMs: 60 * 1000 }
): { success: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const timestamps = rateLimitMap.get(key) || [];
  // Filter out timestamps outside the current window
  const activeTimestamps = timestamps.filter((t) => t > windowStart);

  if (activeTimestamps.length >= config.limit) {
    const oldest = activeTimestamps[0];
    const resetMs = oldest + config.windowMs - now;
    return { success: false, remaining: 0, resetMs };
  }

  activeTimestamps.push(now);
  rateLimitMap.set(key, activeTimestamps);

  return {
    success: true,
    remaining: config.limit - activeTimestamps.length,
    resetMs: config.windowMs,
  };
}
