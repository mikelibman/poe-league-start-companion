import { createContext, useContext, useState, type ReactNode } from "react";

// The gem/gear/gambling regex builders (Issues #5-7) all read and write
// this same selection instead of keeping their own vendor state, per the
// spec's "one vendor-selection dropdown" requirement.
interface VendorSelectionContextValue {
  selectedVendorId: string | null;
  setSelectedVendorId: (id: string | null) => void;
}

const VendorSelectionContext =
  createContext<VendorSelectionContextValue | null>(null);

export function VendorSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(
    null,
  );

  return (
    <VendorSelectionContext.Provider
      value={{ selectedVendorId, setSelectedVendorId }}
    >
      {children}
    </VendorSelectionContext.Provider>
  );
}

export function useVendorSelection(): VendorSelectionContextValue {
  const ctx = useContext(VendorSelectionContext);
  if (!ctx) {
    throw new Error(
      "useVendorSelection must be used within a VendorSelectionProvider",
    );
  }
  return ctx;
}
