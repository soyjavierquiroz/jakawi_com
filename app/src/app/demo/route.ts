import { redirect } from "next/navigation";
import { siteConfig } from "@/config/site";

export function GET() {
  redirect(siteConfig.routes.demo);
}
