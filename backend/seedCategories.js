'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./src/models/Category');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  await Category.deleteMany({});

  await Category.insertMany([
    {
      name: { en: 'Real Estate', am: 'ሪል እስቴት' },
      slug: 'real-estate',
      isActive: true,
      requiredFields: [
        { key: 'propertyType', label: { en: 'Property Type', am: 'የንብረት አይነት' }, type: 'enum', options: ['apartment', 'house', 'villa', 'land', 'commercial', 'office'], required: true },
        { key: 'listingType', label: { en: 'Listing Type', am: 'የዝርዝር አይነት' }, type: 'enum', options: ['sale', 'rent'], required: true },
        { key: 'sizeSqm', label: { en: 'Size (sqm)', am: 'መጠን' }, type: 'number', required: true },
        { key: 'bedrooms', label: { en: 'Bedrooms', am: 'መኝታ ቤቶች' }, type: 'number', required: false },
        { key: 'bathrooms', label: { en: 'Bathrooms', am: 'መታጠቢያ' }, type: 'number', required: false },
        { key: 'furnishingStatus', label: { en: 'Furnishing', am: 'የቤት ዕቃ' }, type: 'enum', options: ['furnished', 'semi-furnished', 'unfurnished'], required: true },
        { key: 'parking', label: { en: 'Parking Spaces', am: 'የመኪና ማቆሚያ' }, type: 'number', required: false },
        { key: 'floor', label: { en: 'Floor Number', am: 'ፎቅ ቁጥር' }, type: 'number', required: false },
      ],
    },
    {
      name: { en: 'Automotive', am: 'ተሽከርካሪ' },
      slug: 'automotive',
      isActive: true,
      requiredFields: [
        { key: 'vehicleType', label: { en: 'Vehicle Type', am: 'የተሽከርካሪ አይነት' }, type: 'enum', options: ['car', 'suv', 'truck', 'motorcycle', 'bus', 'van'], required: true },
        { key: 'make', label: { en: 'Make', am: 'ብራንድ' }, type: 'string', required: true },
        { key: 'model', label: { en: 'Model', am: 'ሞዴል' }, type: 'string', required: true },
        { key: 'year', label: { en: 'Year', am: 'ዓመት' }, type: 'number', required: true },
        { key: 'mileage', label: { en: 'Mileage (km)', am: 'ርቀት' }, type: 'number', required: true },
        { key: 'condition', label: { en: 'Condition', am: 'ሁኔታ' }, type: 'enum', options: ['new', 'used', 'certified-pre-owned'], required: true },
        { key: 'fuelType', label: { en: 'Fuel Type', am: 'ነዳጅ' }, type: 'enum', options: ['petrol', 'diesel', 'electric', 'hybrid'], required: true },
        { key: 'transmission', label: { en: 'Transmission', am: 'ማስተላለፊያ' }, type: 'enum', options: ['manual', 'automatic'], required: true },
        { key: 'color', label: { en: 'Color', am: 'ቀለም' }, type: 'string', required: false },
        { key: 'engineSize', label: { en: 'Engine Size (cc)', am: 'የሞተር መጠን' }, type: 'number', required: false },
      ],
    },
    {
      name: { en: 'Electronics', am: 'ኤሌክትሮኒክስ' },
      slug: 'electronics',
      isActive: true,
      requiredFields: [
        { key: 'subCategory', label: { en: 'Sub Category', am: 'ንዑስ ምድብ' }, type: 'enum', options: ['mobile-phones', 'laptops', 'tablets', 'cameras', 'tv-audio', 'gaming', 'accessories'], required: true },
        { key: 'brand', label: { en: 'Brand', am: 'ብራንድ' }, type: 'string', required: true },
        { key: 'model', label: { en: 'Model', am: 'ሞዴል' }, type: 'string', required: true },
        { key: 'condition', label: { en: 'Condition', am: 'ሁኔታ' }, type: 'enum', options: ['new', 'like-new', 'good', 'fair'], required: true },
        { key: 'warranty', label: { en: 'Warranty', am: 'ዋስትና' }, type: 'enum', options: ['yes', 'no'], required: false },
        { key: 'storage', label: { en: 'Storage/Memory', am: 'ማህደረ ትውስታ' }, type: 'string', required: false },
      ],
    },
    {
      name: { en: 'Home & Furniture', am: 'ቤት እና የቤት ዕቃዎች' },
      slug: 'home-furniture',
      isActive: true,
      requiredFields: [
        { key: 'subCategory', label: { en: 'Sub Category', am: 'ንዑስ ምድብ' }, type: 'enum', options: ['furniture', 'appliances', 'decor', 'kitchen', 'garden'], required: true },
        { key: 'condition', label: { en: 'Condition', am: 'ሁኔታ' }, type: 'enum', options: ['new', 'like-new', 'good', 'fair'], required: true },
        { key: 'material', label: { en: 'Material', am: 'ቁሳቁስ' }, type: 'string', required: false },
        { key: 'dimensions', label: { en: 'Dimensions', am: 'መጠን' }, type: 'string', required: false },
      ],
    },
    {
      name: { en: 'Fashion & Clothing', am: 'ፋሽን እና አልባሳት' },
      slug: 'fashion-clothing',
      isActive: true,
      requiredFields: [
        { key: 'subCategory', label: { en: 'Sub Category', am: 'ንዑስ ምድብ' }, type: 'enum', options: ['mens-clothing', 'womens-clothing', 'kids-clothing', 'shoes', 'bags', 'accessories', 'jewelry'], required: true },
        { key: 'brand', label: { en: 'Brand', am: 'ብራንድ' }, type: 'string', required: false },
        { key: 'size', label: { en: 'Size', am: 'መጠን' }, type: 'string', required: true },
        { key: 'condition', label: { en: 'Condition', am: 'ሁኔታ' }, type: 'enum', options: ['new-with-tags', 'new-without-tags', 'used'], required: true },
        { key: 'color', label: { en: 'Color', am: 'ቀለም' }, type: 'string', required: false },
        { key: 'material', label: { en: 'Material', am: 'ቁሳቁስ' }, type: 'string', required: false },
      ],
    },
    {
      name: { en: 'Sports & Fitness', am: 'ስፖርት እና ብቃት' },
      slug: 'sports-fitness',
      isActive: true,
      requiredFields: [
        { key: 'subCategory', label: { en: 'Sub Category', am: 'ንዑስ ምድብ' }, type: 'enum', options: ['gym-equipment', 'outdoor-sports', 'team-sports', 'cycling', 'fitness-accessories'], required: true },
        { key: 'condition', label: { en: 'Condition', am: 'ሁኔታ' }, type: 'enum', options: ['new', 'like-new', 'good', 'fair'], required: true },
        { key: 'brand', label: { en: 'Brand', am: 'ብራንድ' }, type: 'string', required: false },
      ],
    },
    {
      name: { en: 'Books & Media', am: 'መጽሐፍት እና ሚዲያ' },
      slug: 'books-media',
      isActive: true,
      requiredFields: [
        { key: 'subCategory', label: { en: 'Sub Category', am: 'ንዑስ ምድብ' }, type: 'enum', options: ['books', 'magazines', 'music', 'movies', 'games'], required: true },
        { key: 'title', label: { en: 'Title', am: 'ርዕስ' }, type: 'string', required: true },
        { key: 'author', label: { en: 'Author/Artist', am: 'ደራሲ/አርቲስት' }, type: 'string', required: false },
        { key: 'condition', label: { en: 'Condition', am: 'ሁኔታ' }, type: 'enum', options: ['new', 'like-new', 'good', 'acceptable'], required: true },
        { key: 'language', label: { en: 'Language', am: 'ቋንቋ' }, type: 'string', required: false },
      ],
    },
    {
      name: { en: 'Pets & Animals', am: 'የቤት እንስሳት' },
      slug: 'pets-animals',
      isActive: true,
      requiredFields: [
        { key: 'subCategory', label: { en: 'Sub Category', am: 'ንዑስ ምድብ' }, type: 'enum', options: ['dogs', 'cats', 'birds', 'fish', 'pet-accessories', 'pet-food'], required: true },
        { key: 'breed', label: { en: 'Breed', am: 'ዝርያ' }, type: 'string', required: false },
        { key: 'age', label: { en: 'Age', am: 'እድሜ' }, type: 'string', required: false },
        { key: 'gender', label: { en: 'Gender', am: 'ጾታ' }, type: 'enum', options: ['male', 'female'], required: false },
        { key: 'vaccinated', label: { en: 'Vaccinated', am: 'ክትባት' }, type: 'enum', options: ['yes', 'no'], required: false },
      ],
    },
    {
      name: { en: 'Services', am: 'አገልግሎቶች' },
      slug: 'services',
      isActive: true,
      requiredFields: [
        { key: 'serviceType', label: { en: 'Service Type', am: 'የአገልግሎት አይነት' }, type: 'enum', options: ['home-services', 'professional-services', 'events', 'education', 'health-beauty', 'automotive-services'], required: true },
        { key: 'availability', label: { en: 'Availability', am: 'ተገኝነት' }, type: 'string', required: false },
        { key: 'experience', label: { en: 'Years of Experience', am: 'የልምድ ዓመታት' }, type: 'number', required: false },
      ],
    },
    {
      name: { en: 'Domestic Jobs', am: 'የቤት ውስጥ ስራዎች' },
      slug: 'domestic-jobs',
      isActive: true,
      requiredFields: [
        { key: 'jobType', label: { en: 'Job Type', am: 'የስራ አይነት' }, type: 'enum', options: ['housekeeper', 'guard', 'driver', 'nanny', 'gardener', 'cook', 'general-labor'], required: true },
        { key: 'gender', label: { en: 'Preferred Gender', am: 'የሚፈለግ ጾታ' }, type: 'enum', options: ['any', 'male', 'female'], required: false },
        { key: 'ageRange', label: { en: 'Age Range', am: 'የዕድሜ ክልል' }, type: 'string', required: false },
        { key: 'experience', label: { en: 'Experience Required', am: 'የሚፈለግ ልምድ' }, type: 'enum', options: ['none', '1-2-years', '3-plus-years'], required: false },
        { key: 'liveIn', label: { en: 'Live-in Required', am: 'መኖሪያ ያስፈልጋል' }, type: 'enum', options: ['yes', 'no', 'negotiable'], required: false },
        { key: 'workingHours', label: { en: 'Working Hours', am: 'የስራ ሰዓት' }, type: 'string', required: false },
        { key: 'salary', label: { en: 'Monthly Salary (ETB)', am: 'ወርሃዊ ደመወዝ' }, type: 'string', required: true },
        { key: 'numberOfWorkers', label: { en: 'Number of Workers Needed', am: 'የሚፈለጉ ሰራተኞች ቁጥር' }, type: 'number', required: false },
        { key: 'startDate', label: { en: 'Start Date', am: 'የጀምር ቀን' }, type: 'string', required: false },
        { key: 'languages', label: { en: 'Languages Required', am: 'የሚፈለጉ ቋንቋዎች' }, type: 'string', required: false },
      ],
    },
    {
      name: { en: 'Professional Jobs', am: 'ሙያዊ ስራዎች' },
      slug: 'professional-jobs',
      isActive: true,
      requiredFields: [
        { key: 'jobType', label: { en: 'Employment Type', am: 'የቅጥር አይነት' }, type: 'enum', options: ['full-time', 'part-time', 'contract', 'internship'], required: true },
        { key: 'jobTitle', label: { en: 'Job Title', am: 'የስራ ርዕስ' }, type: 'string', required: true },
        { key: 'industry', label: { en: 'Industry', am: 'ኢንዱስትሪ' }, type: 'enum', options: ['technology', 'healthcare', 'finance', 'education', 'engineering', 'sales-marketing', 'legal', 'logistics', 'hospitality', 'ngo', 'other'], required: true },
        { key: 'experienceLevel', label: { en: 'Experience Level', am: 'የልምድ ደረጃ' }, type: 'enum', options: ['entry-level', 'mid-level', 'senior-level', 'executive'], required: true },
        { key: 'education', label: { en: 'Education Required', am: 'የሚፈለግ ትምህርት' }, type: 'enum', options: ['diploma', 'bachelor', 'master', 'phd', 'any'], required: false },
        { key: 'salaryRange', label: { en: 'Salary Range (ETB/month)', am: 'የደመወዝ ክልል' }, type: 'string', required: false },
        { key: 'numberOfPositions', label: { en: 'Number of Positions', am: 'የቦታዎች ቁጥር' }, type: 'number', required: false },
        { key: 'skills', label: { en: 'Required Skills', am: 'የሚፈለጉ ክህሎቶች' }, type: 'string', required: false },
        { key: 'benefits', label: { en: 'Benefits', am: 'ጥቅሞች' }, type: 'string', required: false },
        { key: 'applicationDeadline', label: { en: 'Application Deadline', am: 'የማመልከቻ የመጨረሻ ቀን' }, type: 'string', required: false },
      ],
    },
    {
      name: { en: 'Business & Industrial', am: 'ንግድ እና ኢንዱስትሪ' },
      slug: 'business-industrial',
      isActive: true,
      requiredFields: [
        { key: 'subCategory', label: { en: 'Sub Category', am: 'ንዑስ ምድብ' }, type: 'enum', options: ['machinery', 'equipment', 'supplies', 'business-for-sale'], required: true },
        { key: 'condition', label: { en: 'Condition', am: 'ሁኔታ' }, type: 'enum', options: ['new', 'used', 'refurbished'], required: true },
        { key: 'brand', label: { en: 'Brand/Manufacturer', am: 'ብራንድ/አምራች' }, type: 'string', required: false },
        { key: 'warranty', label: { en: 'Warranty', am: 'ዋስትና' }, type: 'enum', options: ['yes', 'no'], required: false },
      ],
    },
    {
      name: { en: 'Agriculture', am: 'ግብርና' },
      slug: 'agriculture',
      isActive: true,
      requiredFields: [
        { key: 'subCategory', label: { en: 'Sub Category', am: 'ንዑስ ምድብ' }, type: 'enum', options: ['crops', 'livestock', 'equipment', 'seeds', 'fertilizers'], required: true },
        { key: 'quantity', label: { en: 'Quantity', am: 'ብዛት' }, type: 'string', required: false },
        { key: 'organic', label: { en: 'Organic', am: 'ኦርጋኒክ' }, type: 'enum', options: ['yes', 'no'], required: false },
      ],
    },
  ]);

  console.log('Categories seeded successfully.');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
