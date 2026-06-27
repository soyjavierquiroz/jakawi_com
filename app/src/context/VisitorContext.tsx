"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type VisitorData = {
  country_code?: string;
  country_name?: string;
  city?: string | null;
  region?: string | null;
  ipDetected?: boolean;
};

type VisitorContextValue = {
  visitorData: VisitorData;
  isLoading: boolean;
  error: string | null;
};

const VisitorContext = createContext<VisitorContextValue | null>(null);

export function VisitorProvider({ children }: { children: React.ReactNode }) {
  const [visitorData, setVisitorData] = useState<VisitorData>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/visitor", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("No se pudo detectar ubicacion.");
        return response.json() as Promise<VisitorData>;
      })
      .then((data) => {
        if (isMounted) setVisitorData(data);
      })
      .catch((currentError: unknown) => {
        if (isMounted) setError(currentError instanceof Error ? currentError.message : "Error desconocido.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(() => ({ visitorData, isLoading, error }), [visitorData, isLoading, error]);

  return <VisitorContext.Provider value={value}>{children}</VisitorContext.Provider>;
}

export function useVisitor() {
  const context = useContext(VisitorContext);
  if (!context) throw new Error("useVisitor must be used within VisitorProvider");
  return context;
}
