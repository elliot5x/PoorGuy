export const UNKNOWN_IP = "unknown";

function validIpv4(value: string) {
  const parts = value.split(".");
  return parts.length === 4 &&
    parts.every((part) =>
      /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255
    );
}

function validIpv6(value: string) {
  if (!value.includes(":") || value.length > 45) return false;
  const zoneIndex = value.indexOf("%");
  const address = zoneIndex >= 0 ? value.slice(0, zoneIndex) : value;
  if (zoneIndex >= 0 && !value.slice(zoneIndex + 1)) return false;
  if (!/^([0-9a-f:.]+)$/i.test(address)) return false;

  const compressed = address.split("::");
  if (compressed.length > 2) return false;
  const groups = address.split(":").filter(Boolean);
  if (address.includes("::")) {
    return groups.length < 8 &&
      groups.every((group) =>
        group.includes(".") ? validIpv4(group) : /^[0-9a-f]{1,4}$/i.test(group)
      );
  }
  return groups.length === 8 &&
    groups.every((group) =>
      group.includes(".") ? validIpv4(group) : /^[0-9a-f]{1,4}$/i.test(group)
    );
}

export function validIp(value: string) {
  return validIpv4(value) || validIpv6(value);
}

export function extractClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return UNKNOWN_IP;

  const candidates = forwarded.split(",").map((value) => value.trim());
  // Supabase/Deno infrastructure appends its trusted forwarding address to
  // this header. Never trust a client-controlled leftmost value.
  const platformIp = candidates.at(-1);
  return platformIp && validIp(platformIp) ? platformIp : UNKNOWN_IP;
}
