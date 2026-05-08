export function decodeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function encodeRouteParam(value: string): string {
  return encodeURIComponent(value);
}
