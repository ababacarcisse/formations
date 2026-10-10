import { createHmac, timingSafeEqual } from "node:crypto";
export function validWebhook(
  raw: string,
  signature: string,
  timestamp: string,
  secret: string,
  now = Math.floor(Date.now() / 1000),
) {
  if (
    !/^\d+$/.test(timestamp) ||
    !Number.isSafeInteger(Number(timestamp)) ||
    Math.abs(now - Number(timestamp)) > 300 ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${raw}`)
    .digest("hex");
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
