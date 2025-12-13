const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

(async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    await mongoose.connect(MONGO_URI);

    const Scheme = mongoose.model(
      'Scheme',
      new mongoose.Schema({}, { strict: false })
    );

    const data = JSON.parse(fs.readFileSync('./seed_schemes.json', 'utf8'));

    await Scheme.deleteMany({});
    await Scheme.insertMany(data);

    console.log("Seeded schemes:", data.length);
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err);
    process.exit(1);
  }
})();
