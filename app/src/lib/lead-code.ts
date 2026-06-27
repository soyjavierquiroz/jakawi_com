import { sellerAiConfig } from "@/config/seller-ai";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateLeadCode(prefix = sellerAiConfig.leadCodePrefix) {
  let suffix = "";
  for (let index = 0; index < 4; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${suffix}`;
}
