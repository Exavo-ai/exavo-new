// Shared rate limiting utility for Edge Functions
// Uses in-memory Map (resets on cold start - acceptable for basic protection)

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Global rate limit maps for different endpoints
const rateLimitMaps: Record<string, Map<string, RateLimitEntry>> = {};

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Identifier prefix for the rate limit map (e.g., "admin-delete", "ai-chat") */
  prefix: string;
}

// Preset configurations for different endpoint types
export const RateLimitPresets = {
  /** Strict: 3 requests per 15 minutes (for auth-related endpoints) */
  AUTH: { maxRequests: 3, windowMs: 15 * 60 * 1000, prefix: "auth" },
  /** Standard: 5 requests per 15 minutes (for sensitive operations) */
  SENSITIVE: { maxRequests: 5, windowMs: 15 * 60 * 1000, prefix: "sensitive" },
  /** Admin: 10 requests per 5 minutes (for admin operations) */
  ADMIN: { maxRequests: 10, windowMs: 5 * 60 * 1000, prefix: "admin" },
  /** API: 30 requests per minute (for general API calls) */
  API: { maxRequests: 30, windowMs: 60 * 1000, prefix: "api" },
  /** AI: 20 requests per minute (for AI endpoints) */
  AI: { maxRequests: 20, windowMs: 60 * 1000, prefix: "ai" },
} as const;

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  remaining?: number;
}

/**
 * Check if request is within rate limit
 * @param identifier - Unique identifier (e.g., IP, user ID, or combination)
 * @param config - Rate limit configuration
 * @returns RateLimitResult with allowed status and optional retry info
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const mapKey = config.prefix;
  
  // Get or create map for this prefix
  if (!rateLimitMaps[mapKey]) {
    rateLimitMaps[mapKey] = new Map();
  }
  const map = rateLimitMaps[mapKey];
  
  const fullKey = `${config.prefix}:${identifier}`;
  const entry = map.get(fullKey);
  
  // First request or window expired - reset counter
  if (!entry || now > entry.resetTime) {
    map.set(fullKey, { count: 1, resetTime: now + config.windowMs });
    return { 
      allowed: true, 
      remaining: config.maxRequests - 1 
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return { 
      allowed: false, 
      retryAfter,
      remaining: 0 
    };
  }
  
  // Increment counter
  entry.count++;
  return { 
    allowed: true, 
    remaining: config.maxRequests - entry.count 
  };
}

/**
 * Get client IP from request headers
 * Handles various proxy headers for accurate IP detection
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Create a rate limit identifier combining IP and optional user/token info
 * This provides better protection against distributed attacks
 */
export function createRateLimitKey(req: Request, suffix?: string): string {
  const ip = getClientIP(req);
  return suffix ? `${ip}:${suffix}` : ip;
}

/**
 * Cleanup expired entries from rate limit maps
 * Call periodically to prevent memory leaks
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const map of Object.values(rateLimitMaps)) {
    for (const [key, entry] of map.entries()) {
      if (now > entry.resetTime) {
        map.delete(key);
      }
    }
  }
}
