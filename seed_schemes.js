import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/agri_demo';
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    const Scheme = mongoose.model(
      'Scheme',
      new mongoose.Schema({}, { strict: false })
    );

    // Use the updated seed file with deadlines
    const seedFile = fs.existsSync('./seed_schemes_updated.json') 
      ? './seed_schemes_updated.json' 
      : './seed_schemes.json';
    
    const data = JSON.parse(fs.readFileSync(seedFile, 'utf8'));

    await Scheme.deleteMany({});
    await Scheme.insertMany(data);

    console.log(`Seeded schemes from ${seedFile}:`, data.length);
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
})();
