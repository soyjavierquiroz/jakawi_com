import { createHash } from "crypto";
import { registrationConfig } from "@/config/registration";

export type VisitorInfo = {
  ip: string | null;
  countryCode: string;
  countryName: string;
  city: string | null;
  region: string | null;
};

function firstHeader(headers: Headers, names: string[]) {
  for (const name of names) {
    const value = headers.get(name);
    if (value?.trim()) return value.trim();
  }
  return null;
}

function countryNameFromCode(countryCode: string) {
  try {
    const displayNames = new Intl.DisplayNames(["es"], { type: "region" });
    return displayNames.of(countryCode.toUpperCase()) ?? countryCode.toUpperCase();
  } catch {
    return countryCode.toUpperCase() === "BO" ? "Bolivia" : countryCode.toUpperCase();
  }
}

export function hashIp(ip: string) {
  const salt = process.env.SESSION_SECRET ?? "jakawi";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function getVisitorInfoFromHeaders(headers: Headers): VisitorInfo {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const ip = firstHeader(headers, ["cf-connecting-ip", "x-real-ip"]) ?? forwardedFor;
  const rawCountry = firstHeader(headers, ["cf-ipcountry", "x-vercel-ip-country"]) ?? registrationConfig.defaultCountry;
  const countryCode = rawCountry.toUpperCase() === "XX" ? registrationConfig.defaultCountry : rawCountry.toUpperCase();

  return {
    ip,
    countryCode,
    countryName: countryNameFromCode(countryCode),
    city: firstHeader(headers, ["cf-ipcity", "x-vercel-ip-city"]),
    region: firstHeader(headers, ["cf-region", "x-vercel-ip-country-region"]),
  };
}
