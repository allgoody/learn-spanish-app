export function parseBatchResponse(content, batchKeys) {
  let text = content.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  let arr;
  try {
    arr = JSON.parse(text);
  } catch {
    return {};
  }
  if (!Array.isArray(arr)) return {};
  const out = {};
  for (const item of arr) {
    if (!item || typeof item !== "object" || typeof item.word !== "string")
      continue;
    const key = item.word.toLowerCase();
    if (!batchKeys.includes(key)) continue;
    out[key] = item;
  }
  return out;
}

export function mergeGlosses(target, items) {
  for (const [k, v] of Object.entries(items)) target[k] = v;
}

export function pendingKeys(keys, existing) {
  return keys.filter((k) => !(k in existing));
}
