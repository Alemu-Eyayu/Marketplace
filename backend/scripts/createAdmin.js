'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

async function createAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const phone    = '+251900000001';
  const password = 'Admin@1234';
  const fullName = 'System Admin';

  // Remove any existing admin with this phone so we can recreate cleanly
  await User.deleteOne({ phone });

  const passwordHash = await bcrypt.hash(password, 12);

  await User.create({
    phone,
    fullName,
    passwordHash,
    role: 'admin',
    isPhoneVerified: true,
    verificationStatus: 'verified',
    isActive: true,
  });

  console.log('✅ Admin created successfully');
  console.log('   Phone   :', phone);
  console.log('   Password:', password);

  await mongoose.disconnect();
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
