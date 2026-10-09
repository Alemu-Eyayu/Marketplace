/**
 * Migration: Fix company admin users who were registered with role='user'
 * instead of role='company'.
 *
 * Run once: node backend/scripts/fixCompanyRoles.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Company = require('../src/models/Company');

async function run() {
  await connectDB();

  // Find all companies whose adminUser has role !== 'company'
  const companies = await Company.find({}).select('adminUser companyName').lean();

  let fixed = 0;
  let alreadyCorrect = 0;

  for (const company of companies) {
    const user = await User.findById(company.adminUser).select('role fullName').lean();
    if (!user) continue;

    if (user.role !== 'company') {
      await User.findByIdAndUpdate(company.adminUser, { role: 'company' });
      console.log(`✓ Fixed: ${user.fullName} (${user.role} → company) — admin of "${company.companyName}"`);
      fixed++;
    } else {
      alreadyCorrect++;
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, Already correct: ${alreadyCorrect}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
