function splitTokenString(input: string): string[] {
  return input.split(/[\n,]+/g);
}

export function normalizeTokens(input: string | string[] | null | undefined): string[] {
  const rawItems =
    typeof input === "string"
      ? splitTokenString(input)
      : Array.isArray(input)
        ? input.flatMap((item) => splitTokenString(item))
        : [];

  const seen = new Set<string>();
  const normalized: string[] = [];
  rawItems.forEach((item) => {
    const token = item.trim();
    if (!token) return;
    const key = token.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(token);
  });
  return normalized;
}

export function addToken(list: string[], token: string): string[] {
  return normalizeTokens([...list, token]);
}

export function removeToken(list: string[], token: string): string[] {
  const target = token.trim().toLowerCase();
  return list.filter((item) => item.trim().toLowerCase() !== target);
}
