import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agri_demo';
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    const Update = mongoose.model(
      'Update',
      new mongoose.Schema({}, { strict: false, timestamps: true })
    );

    // Clear existing updates
    await Update.deleteMany({});
    console.log('Cleared existing updates');

    // Create sample updates with proper structure
    const sampleUpdates = [
      {
        scheme_id: 'pm-kisan',
        change_type: 'notice',
        summary: 'Prime Minister releases 16th installment of PM-KISAN benefiting over 9.4 crore farmers',
        details: 'The Prime Minister has released the 16th installment under PM-KISAN scheme. Direct benefit transfer of Rs 20,000 crore to 9.4 crore farmer families.',
        effective_date: new Date(),
        severity: 'low',
        approved: true,
        reviewed_by: 'auto',
        reviewed_at: new Date(),
        source: {
          source_id: 'pib',
          source_url: 'https://pib.gov.in',
          fetched_at: new Date().toISOString(),
          raw: {}
        }
      },
      {
        scheme_id: 'pmksy',
        change_type: 'notice',
        summary: 'Pradhan Mantri Krishi Sinchayee Yojana coverage expanded to 100 new districts',
        details: 'PMKSY Per Drop More Crop scheme extended to cover 100 additional districts across India for micro-irrigation support.',
        effective_date: new Date(Date.now() - 86400000),
        severity: 'low',
        approved: true,
        reviewed_by: 'auto',
        reviewed_at: new Date(),
        source: {
          source_id: 'pmksy',
          source_url: 'https://pmksy.gov.in',
          fetched_at: new Date().toISOString(),
          raw: {}
        }
      },
      {
        scheme_id: 'pmfby',
        change_type: 'notice',
        summary: 'Pradhan Mantri Fasal Bima Yojana enrollment extended till end of month',
        details: 'Enrollment window for PMFBY Kharif season extended. Farmers can register through CSC centers or online portal.',
        effective_date: new Date(Date.now() - 172800000),
        severity: 'medium',
        approved: true,
        reviewed_by: 'auto',
        reviewed_at: new Date(),
        source: {
          source_id: 'pmfby',
          source_url: 'https://pmfby.gov.in',
          fetched_at: new Date().toISOString(),
          raw: {}
        }
      },
      {
        scheme_id: 'kcc',
        change_type: 'notice',
        summary: 'Interest subvention scheme for Kisan Credit Card holders extended',
        details: 'Government extends interest subvention benefit for KCC holders for FY 2024-25. Short term crop loans up to Rs 3 lakh eligible.',
        effective_date: new Date(Date.now() - 259200000),
        severity: 'low',
        approved: true,
        reviewed_by: 'auto',
        reviewed_at: new Date(),
        source: {
          source_id: 'pib',
          source_url: 'https://pib.gov.in',
          fetched_at: new Date().toISOString(),
          raw: {}
        }
      },
      {
        scheme_id: 'soil-health',
        change_type: 'notice',
        summary: 'New soil testing laboratories established in 50 districts',
        details: 'Ministry of Agriculture establishes 50 new soil testing labs. Farmers can get free soil health cards with nutrient status.',
        effective_date: new Date(Date.now() - 345600000),
        severity: 'low',
        approved: true,
        reviewed_by: 'auto',
        reviewed_at: new Date(),
        source: {
          source_id: 'pib',
          source_url: 'https://pib.gov.in',
          fetched_at: new Date().toISOString(),
          raw: {}
        }
      },
      {
        scheme_id: 'msp',
        change_type: 'notice',
        summary: 'Minimum Support Price increased for Rabi crops',
        details: 'MSP for wheat increased by Rs 150 per quintal. Procurement to begin from April 1st across all mandis.',
        effective_date: new Date(Date.now() - 432000000),
        severity: 'medium',
        approved: true,
        reviewed_by: 'auto',
        reviewed_at: new Date(),
        source: {
          source_id: 'pib',
          source_url: 'https://pib.gov.in',
          fetched_at: new Date().toISOString(),
          raw: {}
        }
      },
      {
        scheme_id: 'dbt',
        change_type: 'notice',
        summary: 'Direct Benefit Transfer of fertilizer subsidy begins in pilot districts',
        details: 'DBT for fertilizer subsidy launched in 50 pilot districts. Amount directly credited to farmer bank accounts.',
        effective_date: new Date(Date.now() - 518400000),
        severity: 'low',
        approved: true,
        reviewed_by: 'auto',
        reviewed_at: new Date(),
        source: {
          source_id: 'pib',
          source_url: 'https://pib.gov.in',
          fetched_at: new Date().toISOString(),
          raw: {}
        }
      },
      {
        scheme_id: 'weather',
        change_type: 'alert',
        summary: 'IMD issues advisory for unseasonal rainfall in northern states',
        details: 'India Meteorological Department warns of unseasonal rain in Punjab, Haryana, UP. Farmers advised to protect standing crops.',
        effective_date: new Date(Date.now() - 604800000),
        severity: 'medium',
        approved: true,
        reviewed_by: 'auto',
        reviewed_at: new Date(),
        source: {
          source_id: 'imd',
          source_url: 'https://mausam.imd.gov.in',
          fetched_at: new Date().toISOString(),
          raw: {}
        }
      }
    ];

    await Update.insertMany(sampleUpdates);
    console.log(`✅ Seeded ${sampleUpdates.length} sample updates successfully`);

    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
})();
