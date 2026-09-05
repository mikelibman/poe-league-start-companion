// Standard PoE currency item names — stable across patches, unlike gem
// availability. Vendor gem prices themselves are NOT a fixed lookup: they
// scale with the gem's level (itself derived from character progress) and
// increase with each purchase, so there's no single "correct" cost to
// pre-fill per gem — this is why cost is a manual per-entry field rather
// than something reference data provides.
export const POE_CURRENCY_TYPES = [
  "Scroll of Wisdom",
  "Portal Scroll",
  "Orb of Transmutation",
  "Orb of Augmentation",
  "Orb of Alteration",
  "Jeweller's Orb",
  "Chromatic Orb",
  "Orb of Chance",
  "Orb of Alchemy",
  "Chaos Orb",
  "Regal Orb",
  "Exalted Orb",
  "Divine Orb",
  "Orb of Scouring",
  "Blessed Orb",
  "Vaal Orb",
  "Orb of Binding",
  "Orb of Horizons",
  "Orb of Annulment",
  "Ancient Orb",
  "Harbinger's Orb",
  "Orb of Unmaking",
] as const;

export type PoeCurrencyType = (typeof POE_CURRENCY_TYPES)[number];
