/**
 * Response Headers Utilities
 *
 * Standard HTTP response headers for API endpoints to ensure consistent
 * security posture and caching behavior across all API responses.
 *
 * Security headers included:
 * - X-Content-Type-Options: nosniff - Prevents MIME type sniffing attacks
 * - Cache-Control - Controls browser and proxy caching behavior
 */

/**
 * Standard JSON response headers for API endpoints.
 *
 * Use this for all dynamic API responses that should not be cached.
 * Includes security headers to prevent MIME sniffing attacks.
 *
 * Headers:
 * - Content-Type: application/json
 * - X-Content-Type-Options: nosniff (prevents browser MIME sniffing)
 * - Cache-Control: no-store (prevents caching of dynamic/sensitive data)
 *
 * @returns HeadersInit object for use with Response constructor
 *
 * @example
 * ```typescript
 * return new Response(JSON.stringify(data), {
 *   status: 200,
 *   headers: getStandardHeaders(),
 * });
 * ```
 */
export function getStandardHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  };
}

/**
 * Headers for cacheable responses (e.g., completed sessions, public scenarios).
 *
 * Use this for immutable or infrequently-changing data that can be cached
 * to improve performance and reduce server load.
 *
 * Headers:
 * - Content-Type: application/json
 * - X-Content-Type-Options: nosniff
 * - Cache-Control: public, max-age={maxAge}, immutable
 *
 * @param maxAge - Cache duration in seconds (default: 3600 = 1 hour)
 * @returns HeadersInit object for use with Response constructor
 *
 * @example
 * ```typescript
 * // Cache completed session for 1 hour
 * return new Response(JSON.stringify(session), {
 *   status: 200,
 *   headers: getCacheableHeaders(3600),
 * });
 *
 * // Cache scenarios list for 5 minutes
 * return new Response(JSON.stringify(scenarios), {
 *   status: 200,
 *   headers: getCacheableHeaders(300),
 * });
 * ```
 */
export function getCacheableHeaders(maxAge = 3600): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": `public, max-age=${maxAge}, immutable`,
  };
}

