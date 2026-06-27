import Link from "next/link";
import { brandConfig } from "@/config/brand";
import { cn } from "@/lib/ui";

export function BrandLogo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-3 text-xl font-black tracking-wide", className)}>
      <span className="grid size-10 place-items-center rounded-md bg-brand text-white shadow-sm shadow-brand/20">
        {brandConfig.name[0]}
      </span>
      {brandConfig.name}
    </Link>
  );
}
