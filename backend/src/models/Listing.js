const mongoose = require('mongoose');

const { Schema } = mongoose;

const listingSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  categorySlug: { 
    type: String, 
    enum: [
      'real-estate', 
      'automotive', 
      'electronics', 
      'home-furniture', 
      'fashion-clothing', 
      'sports-fitness', 
      'books-media', 
      'pets-animals', 
      'services', 
      'domestic-jobs',
      'professional-jobs',
      'business-industrial', 
      'agriculture'
    ] 
  },
  price: { type: Number, required: true },
  currency: { type: String, default: 'ETB' },
  location: {
    region: String,
    city: String,
    address: String,
    coordinates: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
  },
  images: [String],
  video: String,
  status: { type: String, enum: ['active', 'inactive', 'expired', 'removed'], default: 'active' },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  rejectionReason: String,
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  isFeatured: { type: Boolean, default: false },
  viewCount: { type: Number, default: 0 },
  uniqueViewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  expiresAt: Date,
  realEstate: {
    propertyType:     String,
    sizeSqm:          Number,
    bedrooms:         Number,
    bathrooms:        Number,
    furnishingStatus: { type: String, enum: ['furnished', 'semi-furnished', 'unfurnished'] },
    // Company-specific mortgage fields (banks / financial-services)
    mortgageDetails: {
      interestRate:       Number,
      loanTermYears:      Number,
      downPaymentPercent: Number,
    },
  },
  automotive: {
    vehicleType:  String,
    make:         String,
    model:        String,
    year:         Number,
    mileage:      Number,
    condition:    String,
    fuelType:     String,
    transmission: { type: String, enum: ['manual', 'automatic'] },
    color:        String,
    engineSize:   Number,
    // Company-specific fleet fields
    quantity:      { type: Number, default: 1 },
    fleetDiscount: Number, // required when quantity > 1
  },
  electronics: {
    subCategory: String,
    brand: String,
    model: String,
    condition: String,
    warranty: String,
    storage: String,
  },
  homeFurniture: {
    subCategory: String,
    condition: String,
    material: String,
    dimensions: String,
  },
  fashionClothing: {
    subCategory: String,
    brand: String,
    size: String,
    condition: String,
    color: String,
    material: String,
  },
  sportsFitness: {
    subCategory: String,
    condition: String,
    brand: String,
  },
  booksMedia: {
    subCategory: String,
    title: String,
    author: String,
    condition: String,
    language: String,
  },
  petsAnimals: {
    subCategory: String,
    breed: String,
    age: String,
    gender: String,
    vaccinated: String,
  },
  services: {
    serviceType: String,
    availability: String,
    experience: Number,
  },
  // Domestic jobs — posted by brokers (placement agents)
  domesticJobs: {
    jobType:          String, // housekeeper, guard, driver, nanny, gardener, general-labor
    gender:           String, // any, male, female
    ageRange:         String, // e.g. 20-35
    experience:       String, // none, 1-2 years, 3+ years
    liveIn:           String, // yes, no, negotiable
    workingHours:     String, // e.g. 8AM-6PM, full-time, part-time
    salary:           String, // monthly salary range in ETB
    numberOfWorkers:  Number, // how many workers needed
    startDate:        String, // immediate, specific date
    languages:        String, // Amharic, English, etc.
  },
  // Professional jobs — posted by companies
  professionalJobs: {
    jobType:             String, // full-time, part-time, contract, internship
    industry:            String, // technology, healthcare, finance, etc.
    jobTitle:            String, // exact position title
    experienceLevel:     String, // entry, mid, senior, executive
    education:           String, // diploma, bachelor, master, phd
    salaryRange:         String, // e.g. 15,000 - 25,000 ETB
    applicationDeadline: Date,
    applicationUrl:      String,
    numberOfPositions:   Number,
    skills:              String, // comma-separated required skills
    benefits:            String, // health insurance, transport, etc.
  },
  businessIndustrial: {
    subCategory: String,
    condition: String,
    brand: String,
    warranty: String,
  },
  agriculture: {
    subCategory: String,
    quantity: String,
    organic: String,
  },
  customFields: { type: Map, of: Schema.Types.Mixed },

  // Company ownership fields
  ownerType:    { type: String, enum: ['individual', 'company'], default: 'individual' },
  companyOwner: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
  postedBy:     { type: Schema.Types.ObjectId, ref: 'User' }, // actual user who created it
}, { timestamps: true });

listingSchema.index({ 'location.coordinates': '2dsphere' });
listingSchema.index({ title: 'text', description: 'text' });
listingSchema.index({ status: 1, isFeatured: -1, createdAt: -1 });
listingSchema.index({ owner: 1 });
listingSchema.index({ ownerType: 1, status: 1 });
listingSchema.index({ companyOwner: 1, status: 1 });

module.exports = mongoose.model('Listing', listingSchema);
