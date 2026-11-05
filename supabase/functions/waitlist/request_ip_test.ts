import {
  extractClientIp,
  UNKNOWN_IP,
  validIp,
} from "./request_ip.ts";

Deno.test("extractClientIp accepts the trusted rightmost forwarding address", () => {
  const headers = new Headers({
    "x-forwarded-for": "203.0.113.10, 198.51.100.25",
  });
  assertEquals(extractClientIp(headers), "198.51.100.25");
});

Deno.test("extractClientIp ignores a spoofed leftmost address", () => {
  const headers = new Headers({
    "x-forwarded-for": "127.0.0.1, 198.51.100.25",
  });
  assertEquals(extractClientIp(headers), "198.51.100.25");
});

Deno.test("extractClientIp falls back to unknown for an absent header", () => {
  assertEquals(extractClientIp(new Headers()), UNKNOWN_IP);
});

Deno.test("extractClientIp falls back to unknown for invalid values", () => {
  const headers = new Headers({
    "x-forwarded-for": "198.51.100.25, definitely-not-an-ip",
  });
  assertEquals(extractClientIp(headers), "unknown");
});

Deno.test("validIp accepts IPv4 and IPv6", () => {
  assertEquals(validIp("203.0.113.10"), true);
  assertEquals(validIp("2001:db8::1"), true);
  assertEquals(validIp("999.0.0.1"), false);
});

function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}
