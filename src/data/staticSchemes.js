// src/data/staticSchemes.js

export const schemes = [
  {
    scheme_id: "pm-kisan",
    scheme_name: "PM-KISAN",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    sector: "Income Support",
    description:
      "Provides ₹6,000 annual income support to eligible farmer families in three equal installments.",
    eligibility:
      "Small and marginal farmers who own cultivable land.",
    benefits: "₹6,000 per year in 3 installments.",
    official_portal: "https://pmkisan.gov.in",
    status: "ongoing",
  },
  {
    scheme_id: "soil-health-card",
    scheme_name: "Soil Health Card Scheme",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    sector: "Soil Management",
    description:
      "Provides soil health cards to farmers with crop-wise nutrient recommendations.",
    eligibility: "All farmers",
    benefits: "Improved soil health and optimized fertilizer usage.",
    official_portal: "https://soilhealth.dac.gov.in",
    status: "ongoing",
  },
  {
    scheme_id: "kcc",
    scheme_name: "Kisan Credit Card (KCC)",
    ministry: "Ministry of Agriculture & Farmers Welfare",
    sector: "Credit Support",
    description:
      "Provides timely credit to farmers for agriculture and allied activities.",
    eligibility: "Farmers, tenant farmers, SHGs",
    benefits: "Low-interest agricultural loans.",
    official_portal: "https://www.myscheme.gov.in/schemes/kcc",
    status: "ongoing",
  },
];

export function getFallbackSchemes() {
  return schemes;
}