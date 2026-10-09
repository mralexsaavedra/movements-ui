import type { QueryParamValue } from "./HttpClient";

/**
 * Joins base URL, path and query by hand: React Native's `URL`/`URLSearchParams` polyfills
 * are incomplete, and this keeps the output identical on every runtime.
 */
export const buildUrl = (
  baseUrl: string,
  path: string,
  query: Readonly<Record<string, QueryParamValue>> = {},
): string => {
  const base = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const search = Object.entries(query)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return search ? `${base}${normalizedPath}?${search}` : `${base}${normalizedPath}`;
};
