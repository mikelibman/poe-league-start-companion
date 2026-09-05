import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { loadReferenceData, type ReferenceData } from "./referenceData";

interface ReferenceDataContextValue {
  data: ReferenceData | null;
  source: "network" | "cache" | null;
  cachedAtUnixSeconds: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const ReferenceDataContext = createContext<ReferenceDataContextValue | null>(
  null,
);

export function ReferenceDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ReferenceData | null>(null);
  const [source, setSource] = useState<"network" | "cache" | null>(null);
  const [cachedAtUnixSeconds, setCachedAtUnixSeconds] = useState<
    number | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    setError(null);
    loadReferenceData()
      .then((result) => {
        setData(result.data);
        setSource(result.source);
        setCachedAtUnixSeconds(result.cachedAtUnixSeconds);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  return (
    <ReferenceDataContext.Provider
      value={{ data, source, cachedAtUnixSeconds, loading, error, refresh }}
    >
      {children}
    </ReferenceDataContext.Provider>
  );
}

export function useReferenceData(): ReferenceDataContextValue {
  const ctx = useContext(ReferenceDataContext);
  if (!ctx) {
    throw new Error(
      "useReferenceData must be used within a ReferenceDataProvider",
    );
  }
  return ctx;
}
