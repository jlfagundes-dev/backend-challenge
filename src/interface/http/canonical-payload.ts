import { createHash } from "node:crypto";

// Transforma json em canonico para conseguir o mesmo hash mesmo que a ordem das chaves seja diferente
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function hashPayload(payload: object): string {
  const canonical = JSON.stringify(canonicalize(payload));
  return createHash("sha256").update(canonical).digest("hex");
}
