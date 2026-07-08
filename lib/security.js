// lib/security.js

// Simple in-memory token bucket rate limiter to prevent API abuse
const ipBuckets = new Map();
const LIMIT_CAPACITY = 20;       // Max tokens in bucket
const REFILL_RATE_PER_SEC = 0.5; // Refill 0.5 tokens every second (1 token per 2 seconds)

export function checkRateLimit(ip) {
  const now = Date.now();
  const clientIp = ip || 'unknown-client';

  if (!ipBuckets.has(clientIp)) {
    ipBuckets.set(clientIp, {
      tokens: LIMIT_CAPACITY - 1,
      lastRefillTime: now
    });
    return { allowed: true, remaining: LIMIT_CAPACITY - 1 };
  }

  const bucket = ipBuckets.get(clientIp);
  const elapsedSec = (now - bucket.lastRefillTime) / 1000;
  const refilledTokens = elapsedSec * REFILL_RATE_PER_SEC;

  if (refilledTokens >= 1) {
    bucket.tokens = Math.min(LIMIT_CAPACITY, bucket.tokens + Math.floor(refilledTokens));
    bucket.lastRefillTime = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, remaining: Math.floor(bucket.tokens) };
  }

  return { allowed: false, remaining: 0 };
}

/**
 * Strips HTML tags and script elements to protect against XSS injections
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[;']/g, '')   // block sql escape sequences for security layers
    .trim();
}
