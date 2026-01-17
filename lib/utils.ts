import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Channel URL pattern matching
 * Matches /@handle, /channel/UCxxx, /c/name with optional subpages
 */
const CHANNEL_URL_PATTERN = /^\/(@[\w.-]+|channel\/[\w-]+|c\/[\w-]+)(\/[\w-]*)?$/;

/**
 * Extract channel identifier from a YouTube URL path or full URL
 * Returns normalized lowercase identifier or null if not a channel URL
 */
export function extractChannelFromUrl(urlOrPath: string): string | null {
  let pathname: string;
  
  try {
    // Handle full URLs
    if (urlOrPath.startsWith("http")) {
      const url = new URL(urlOrPath);
      if (!url.hostname.includes("youtube.com")) {
        return null;
      }
      pathname = url.pathname;
    } else {
      // Handle paths or channel handles directly
      pathname = urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`;
    }
  } catch {
    // If URL parsing fails, treat as direct input
    pathname = urlOrPath.startsWith("/") ? urlOrPath : `/${urlOrPath}`;
  }

  const match = pathname.match(CHANNEL_URL_PATTERN);
  if (!match) {
    // Check if it's just a handle like "@MrBeast" or "MrBeast"
    const handleMatch = urlOrPath.match(/^@?([\w.-]+)$/);
    if (handleMatch) {
      return `@${handleMatch[1].toLowerCase()}`;
    }
    return null;
  }

  const channelPart = match[1];
  
  // Normalize to lowercase
  if (channelPart.startsWith("@")) {
    return channelPart.toLowerCase();
  } else if (channelPart.startsWith("channel/")) {
    return channelPart.substring(8).toLowerCase();
  } else if (channelPart.startsWith("c/")) {
    return channelPart.substring(2).toLowerCase();
  }
  
  return null;
}

/**
 * Normalize a channel identifier for comparison
 * Strips @ prefix and lowercases
 */
export function normalizeChannelId(channelId: string): string {
  return channelId.replace(/^@/, "").toLowerCase();
}

/**
 * Check if two channel identifiers match
 */
export function channelIdsMatch(id1: string, id2: string): boolean {
  return normalizeChannelId(id1) === normalizeChannelId(id2);
}

/**
 * Check if a URL path is a channel page
 */
export function isChannelPage(pathname: string): boolean {
  return CHANNEL_URL_PATTERN.test(pathname);
}
