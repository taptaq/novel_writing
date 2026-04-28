export function estimateWordCount(input: string): number {
  const cjkUnits = input.match(/[\u3400-\u9fff]/g) ?? [];
  const latinUnits =
    input
      .replace(/[\u3400-\u9fff]/g, " ")
      .match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)*/g) ?? [];

  return cjkUnits.length + latinUnits.length;
}

export function excerpt(input: string, maxLength = 80): string {
  const value = input.replace(/\s+/g, " ").trim();

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}…`;
}
