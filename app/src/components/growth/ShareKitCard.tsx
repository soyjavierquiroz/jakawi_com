"use client";

import { ExternalLink, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { QrCodeBox } from "@/components/growth/QrCodeBox";
import { ShareTextButton } from "@/components/growth/ShareTextButton";
import { cn } from "@/lib/ui";

type ShareKitCardProps = {
  title: string;
  description: string;
  url: string;
  shareText: string;
  qrLabel?: string;
  compact?: boolean;
  downloadFileName?: string;
  children?: ReactNode;
};

export function ShareKitCard({
  title,
  description,
  url,
  shareText,
  qrLabel,
  compact = false,
  downloadFileName,
  children,
}: ShareKitCardProps) {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <article className={cn("rounded-lg border border-brand-border bg-white p-3 shadow-sm", !compact && "md:p-4")}>
      <div className={cn("grid gap-4", compact ? "lg:grid-cols-[minmax(0,1fr)_auto]" : "lg:grid-cols-[minmax(0,1fr)_260px]")}>
        <div className="min-w-0">
          <div>
            <p className="text-[11px] font-black uppercase text-neutral-500">Kit para compartir</p>
            <h3 className={cn("mt-1 break-words font-black text-brand-dark", compact ? "text-base" : "text-lg")}>{title}</h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-neutral-600">{description}</p>
          </div>

          {children ? <div className="mt-3">{children}</div> : null}

          <div className="mt-3 rounded-md bg-brand-muted px-3 py-2">
            <p className="text-[11px] font-black uppercase text-neutral-500">Link trackeado</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-sm font-bold text-brand-dark hover:text-brand">
              {url}
            </a>
            <p className="mt-2 text-xs font-semibold text-neutral-600">JAKAWI registra clicks y atribucion cuando usan este enlace.</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <ShareTextButton value={url} label="Copiar link" />
            <ShareTextButton value={shareText} label="Copiar texto" />
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-dark px-3 text-sm font-bold text-white hover:bg-brand"
            >
              <MessageCircle className="size-4" />
              Enviar por WhatsApp
            </a>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark hover:border-brand">
              <ExternalLink className="size-4" />
              Abrir link
            </a>
          </div>
        </div>

        <QrCodeBox url={url} label={qrLabel ?? title} compact={compact} downloadFileName={downloadFileName} />
      </div>
    </article>
  );
}
