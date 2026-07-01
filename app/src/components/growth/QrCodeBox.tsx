"use client";

import QRCode from "qrcode";
import { Download } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/ui";

type QrCodeBoxProps = {
  url: string;
  label?: string;
  downloadFileName?: string;
  compact?: boolean;
};

type QrCodeState = {
  cacheKey: string;
  dataUrl: string | null;
  hasError: boolean;
};

function cleanDownloadName(fileName: string | undefined) {
  const safeName = fileName?.toLowerCase().trim().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return safeName || "jakawi-link.png";
}

export function QrCodeBox({ url, label, downloadFileName, compact = false }: QrCodeBoxProps) {
  const size = compact ? 168 : 216;
  const cacheKey = `${url}:${size}`;
  const [qrState, setQrState] = useState<QrCodeState>({ cacheKey, dataUrl: null, hasError: false });
  const safeDownloadName = cleanDownloadName(downloadFileName);
  const dataUrl = qrState.cacheKey === cacheKey ? qrState.dataUrl : null;
  const hasError = qrState.cacheKey === cacheKey ? qrState.hasError : false;

  useEffect(() => {
    let isActive = true;

    QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: size,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    })
      .then((nextDataUrl) => {
        if (isActive) setQrState({ cacheKey, dataUrl: nextDataUrl, hasError: false });
      })
      .catch(() => {
        if (isActive) setQrState({ cacheKey, dataUrl: null, hasError: true });
      });

    return () => {
      isActive = false;
    };
  }, [cacheKey, size, url]);

  return (
    <div className={cn("rounded-lg border border-brand-border bg-white p-3", compact ? "max-w-[210px]" : "max-w-[260px]")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-xs font-black text-brand-dark">{label ?? "Link trackeado"}</p>
          <p className="mt-0.5 text-xs font-semibold text-neutral-500">Escanea para abrir</p>
        </div>
      </div>

      <div className={cn("mt-3 flex items-center justify-center rounded-md border border-neutral-100 bg-white", compact ? "min-h-[168px]" : "min-h-[216px]")}>
        {dataUrl ? <Image src={dataUrl} alt={`QR de ${label ?? "link JAKAWI"}`} width={size} height={size} unoptimized className="h-auto" /> : null}
        {!dataUrl && !hasError ? <p className="px-4 text-center text-xs font-semibold text-neutral-500">Generando QR...</p> : null}
        {hasError ? <p className="px-4 text-center text-xs font-semibold text-red-700">No se pudo generar el QR. Copia el link directamente.</p> : null}
      </div>

      {dataUrl ? (
        <a
          href={dataUrl}
          download={safeDownloadName}
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-brand-border bg-white px-3 text-sm font-bold text-brand-dark hover:border-brand"
        >
          <Download className="size-4" />
          Descargar QR
        </a>
      ) : null}
    </div>
  );
}
