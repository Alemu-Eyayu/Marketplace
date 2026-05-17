import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import client from '../api/client';

// Category field definitions with placeholders
const CATEGORY_FIELDS = {
  'real-estate': [
    { name: 'propertyType', label: 'Property Type', type: 'select', required: true, options: [
      { value: 'apartment', label: 'Apartment' },
      { value: 'house', label: 'House' },
      { value: 'villa', label: 'Villa' },
      { value: 'land', label: 'Land' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'office', label: 'Office' }
    ]},
    { name: 'listingType', label: 'Listing Type', type: 'select', required: true, options: [
      { value: 'sale', label: 'For Sale' },
      { value: 'rent', label: 'For Rent' }
    ]},
    { name: 'sizeSqm', label: 'Size (sqm)', type: 'number', required: true, placeholder: 'e.g., 120' },
    { name: 'bedrooms', label: 'Bedrooms', type: 'number', required: false, placeholder: 'e.g., 3' },
    { name: 'bathrooms', label: 'Bathrooms', type: 'number', required: false, placeholder: 'e.g., 2' },
    { name: 'furnishingStatus', label: 'Furnishing', type: 'select', required: true, options: [
      { value: 'furnished', label: 'Furnished' },
      { value: 'semi-furnished', label: 'Semi-Furnished' },
      { value: 'unfurnished', label: 'Unfurnished' }
    ]},
    { name: 'parking', label: 'Parking Spaces', type: 'number', required: false, placeholder: 'e.g., 1' },
    { name: 'floor', label: 'Floor Number', type: 'number', required: false, placeholder: 'e.g., 5' }
  ],
  'automotive': [
    { name: 'vehicleType', label: 'Vehicle Type', type: 'select', required: true, options: [
      { value: 'car', label: 'Car' },
      { value: 'suv', label: 'SUV' },
      { value: 'truck', label: 'Truck' },
      { value: 'motorcycle', label: 'Motorcycle' },
      { value: 'bus', label: 'Bus' },
      { value: 'van', label: 'Van' }
    ]},
    { name: 'make', label: 'Make/Brand', type: 'text', required: true, placeholder: 'e.g., Toyota' },
    { name: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g., Corolla' },
    { name: 'year', label: 'Year', type: 'number', required: true, placeholder: 'e.g., 2020' },
    { name: 'mileage', label: 'Mileage (km)', type: 'number', required: true, placeholder: 'e.g., 45000' },
    { name: 'condition', label: 'Condition', type: 'select', required: true, options: [
      { value: 'new', label: 'New' },
      { value: 'used', label: 'Used' },
      { value: 'certified-pre-owned', label: 'Certified Pre-Owned' }
    ]},
    { name: 'fuelType', label: 'Fuel Type', type: 'select', required: true, options: [
      { value: 'petrol', label: 'Petrol' },
      { value: 'diesel', label: 'Diesel' },
      { value: 'electric', label: 'Electric' },
      { value: 'hybrid', label: 'Hybrid' }
    ]},
    { name: 'transmission', label: 'Transmission', type: 'select', required: true, options: [
      { value: 'manual', label: 'Manual' },
      { value: 'automatic', label: 'Automatic' }
    ]},
    { name: 'color', label: 'Color', type: 'text', required: false, placeholder: 'e.g., White' },
    { name: 'engineSize', label: 'Engine Size (cc)', type: 'number', required: false, placeholder: 'e.g., 1800' }
  ],
  'electronics': [
    { name: 'subCategory', label: 'Sub Category', type: 'select', required: true, options: [
      { value: 'mobile-phones', label: 'Mobile Phones' },
      { value: 'laptops', label: 'Laptops' },
      { value: 'tablets', label: 'Tablets' },
      { value: 'cameras', label: 'Cameras' },
      { value: 'tv-audio', label: 'TV & Audio' },
      { value: 'gaming', label: 'Gaming' },
      { value: 'accessories', label: 'Accessories' }
    ]},
    { name: 'brand', label: 'Brand', type: 'text', required: true, placeholder: 'e.g., Samsung' },
    { name: 'model', label: 'Model', type: 'text', required: true, placeholder: 'e.g., Galaxy S23' },
    { name: 'condition', label: 'Condition', type: 'select', required: true, options: [
      { value: 'new', label: 'New' },
      { value: 'like-new', label: 'Like New' },
      { value: 'good', label: 'Good' },
      { value: 'fair', label: 'Fair' }
    ]},
    { name: 'warranty', label: 'Warranty', type: 'select', required: false, options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' }
    ]},
    { name: 'storage', label: 'Storage/Memory', type: 'text', required: false, placeholder: 'e.g., 256GB' }
  ],
  'home-furniture': [
    { name: 'subCategory', label: 'Sub Category', type: 'select', required: true, options: [
      { value: 'furniture', label: 'Furniture' },
      { value: 'appliances', label: 'Appliances' },
      { value: 'decor', label: 'Decor' },
      { value: 'kitchen', label: 'Kitchen' },
      { value: 'garden', label: 'Garden' }
    ]},
    { name: 'condition', label: 'Condition', type: 'select', required: true, options: [
      { value: 'new', label: 'New' },
      { value: 'like-new', label: 'Like New' },
      { value: 'good', label: 'Good' },
      { value: 'fair', label: 'Fair' }
    ]},
    { name: 'material', label: 'Material', type: 'text', required: false, placeholder: 'e.g., Wood, Metal' },
    { name: 'dimensions', label: 'Dimensions', type: 'text', required: false, placeholder: 'e.g., 200x100x80 cm' }
  ],
  'fashion-clothing': [
    { name: 'subCategory', label: 'Sub Category', type: 'select', required: true, options: [
      { value: 'mens-clothing', label: "Men's Clothing" },
      { value: 'womens-clothing', label: "Women's Clothing" },
      { value: 'kids-clothing', label: "Kids' Clothing" },
      { value: 'shoes', label: 'Shoes' },
      { value: 'bags', label: 'Bags' },
      { value: 'accessories', label: 'Accessories' },
      { value: 'jewelry', label: 'Jewelry' }
    ]},
    { name: 'size', label: 'Size', type: 'text', required: true, placeholder: 'e.g., M, L, 42' },
    { name: 'condition', label: 'Condition', type: 'select', required: true, options: [
      { value: 'new-with-tags', label: 'New with Tags' },
      { value: 'new-without-tags', label: 'New without Tags' },
      { value: 'used', label: 'Used' }
    ]},
    { name: 'brand', label: 'Brand', type: 'text', required: false, placeholder: 'e.g., Nike' },
    { name: 'color', label: 'Color', type: 'text', required: false, placeholder: 'e.g., Blue' },
    { name: 'material', label: 'Material', type: 'text', required: false, placeholder: 'e.g., Cotton' }
  ],
  'sports-fitness': [
    { name: 'subCategory', label: 'Sub Category', type: 'select', required: true, options: [
      { value: 'gym-equipment', label: 'Gym Equipment' },
      { value: 'outdoor-sports', label: 'Outdoor Sports' },
      { value: 'team-sports', label: 'Team Sports' },
      { value: 'cycling', label: 'Cycling' },
      { value: 'fitness-accessories', label: 'Fitness Accessories' }
    ]},
    { name: 'condition', label: 'Condition', type: 'select', required: true, options: [
      { value: 'new', label: 'New' },
      { value: 'like-new', label: 'Like New' },
      { value: 'good', label: 'Good' },
      { value: 'fair', label: 'Fair' }
    ]},
    { name: 'brand', label: 'Brand', type: 'text', required: false, placeholder: 'e.g., Adidas' }
  ],
  'books-media': [
    { name: 'subCategory', label: 'Sub Category', type: 'select', required: true, options: [
      { value: 'books', label: 'Books' },
      { value: 'magazines', label: 'Magazines' },
      { value: 'music', label: 'Music' },
      { value: 'movies', label: 'Movies' },
      { value: 'games', label: 'Games' }
    ]},
    { name: 'title', label: 'Title', type: 'text', required: true, placeholder: 'e.g., The Great Gatsby' },
    { name: 'condition', label: 'Condition', type: 'select', required: true, options: [
      { value: 'new', label: 'New' },
      { value: 'like-new', label: 'Like New' },
      { value: 'good', label: 'Good' },
      { value: 'acceptable', label: 'Acceptable' }
    ]},
    { name: 'author', label: 'Author/Artist', type: 'text', required: false, placeholder: 'e.g., F. Scott Fitzgerald' },
    { name: 'language', label: 'Language', type: 'text', required: false, placeholder: 'e.g., English' }
  ],
  'pets-animals': [
    { name: 'subCategory', label: 'Sub Category', type: 'select', required: true, options: [
      { value: 'dogs', label: 'Dogs' },
      { value: 'cats', label: 'Cats' },
      { value: 'birds', label: 'Birds' },
      { value: 'fish', label: 'Fish' },
      { value: 'pet-accessories', label: 'Pet Accessories' },
      { value: 'pet-food', label: 'Pet Food' }
    ]},
    { name: 'breed', label: 'Breed', type: 'text', required: false, placeholder: 'e.g., German Shepherd' },
    { name: 'age', label: 'Age', type: 'text', required: false, placeholder: 'e.g., 2 years' },
    { name: 'gender', label: 'Gender', type: 'select', required: false, options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' }
    ]},
    { name: 'vaccinated', label: 'Vaccinated', type: 'select', required: false, options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' }
    ]}
  ],
  'services': [
    { name: 'serviceType', label: 'Service Type', type: 'select', required: true, options: [
      { value: 'home-services', label: 'Home Services' },
      { value: 'professional-services', label: 'Professional Services' },
      { value: 'events', label: 'Events' },
      { value: 'education', label: 'Education' },
      { value: 'health-beauty', label: 'Health & Beauty' },
      { value: 'automotive-services', label: 'Automotive Services' }
    ]},
    { name: 'availability', label: 'Availability', type: 'text', required: false, placeholder: 'e.g., Mon-Fri, 9AM-5PM' },
    { name: 'experience', label: 'Years of Experience', type: 'number', required: false, placeholder: 'e.g., 5' }
  ],
  'domestic-jobs': [
    { name: 'jobType', label: 'Job Type', type: 'select', required: true, options: [
      { value: 'housekeeper', label: 'Housekeeper / Cleaner' },
      { value: 'guard', label: 'Guard / Security' },
      { value: 'driver', label: 'Driver' },
      { value: 'nanny', label: 'Nanny / Childcare' },
      { value: 'gardener', label: 'Gardener' },
      { value: 'cook', label: 'Cook' },
      { value: 'general-labor', label: 'General Labor' },
    ]},
    { name: 'gender', label: 'Preferred Gender', type: 'select', required: false, options: [
      { value: 'any', label: 'Any' },
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
    ]},
    { name: 'ageRange', label: 'Age Range', type: 'text', required: false, placeholder: 'e.g., 20-35' },
    { name: 'experience', label: 'Experience Required', type: 'select', required: false, options: [
      { value: 'none', label: 'No experience needed' },
      { value: '1-2-years', label: '1–2 years' },
      { value: '3-plus-years', label: '3+ years' },
    ]},
    { name: 'liveIn', label: 'Live-in Required', type: 'select', required: false, options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
      { value: 'negotiable', label: 'Negotiable' },
    ]},
    { name: 'workingHours', label: 'Working Hours', type: 'text', required: false, placeholder: 'e.g., 8AM–6PM, Mon–Sat' },
    { name: 'salary', label: 'Monthly Salary (ETB)', type: 'text', required: true, placeholder: 'e.g., 3,000 – 5,000 ETB' },
    { name: 'numberOfWorkers', label: 'Number of Workers Needed', type: 'number', required: false, placeholder: 'e.g., 1' },
    { name: 'startDate', label: 'Start Date', type: 'text', required: false, placeholder: 'e.g., Immediate, Jan 2026' },
    { name: 'languages', label: 'Languages Required', type: 'text', required: false, placeholder: 'e.g., Amharic, English' },
  ],
  'professional-jobs': [
    { name: 'jobType', label: 'Employment Type', type: 'select', required: true, options: [
      { value: 'full-time', label: 'Full-Time' },
      { value: 'part-time', label: 'Part-Time' },
      { value: 'contract', label: 'Contract' },
      { value: 'internship', label: 'Internship' },
    ]},
    { name: 'jobTitle', label: 'Job Title', type: 'text', required: true, placeholder: 'e.g., Software Engineer' },
    { name: 'industry', label: 'Industry', type: 'select', required: true, options: [
      { value: 'technology', label: 'Technology & IT' },
      { value: 'healthcare', label: 'Healthcare & Medical' },
      { value: 'finance', label: 'Finance & Banking' },
      { value: 'education', label: 'Education & Training' },
      { value: 'engineering', label: 'Engineering & Construction' },
      { value: 'sales-marketing', label: 'Sales & Marketing' },
      { value: 'legal', label: 'Legal & Compliance' },
      { value: 'logistics', label: 'Logistics & Supply Chain' },
      { value: 'hospitality', label: 'Hospitality & Tourism' },
      { value: 'ngo', label: 'NGO & Development' },
      { value: 'other', label: 'Other' },
    ]},
    { name: 'experienceLevel', label: 'Experience Level', type: 'select', required: true, options: [
      { value: 'entry-level', label: 'Entry Level (0–2 yrs)' },
      { value: 'mid-level', label: 'Mid Level (3–5 yrs)' },
      { value: 'senior-level', label: 'Senior Level (6+ yrs)' },
      { value: 'executive', label: 'Executive / Director' },
    ]},
    { name: 'education', label: 'Education Required', type: 'select', required: false, options: [
      { value: 'diploma', label: 'Diploma / TVET' },
      { value: 'bachelor', label: "Bachelor's Degree" },
      { value: 'master', label: "Master's Degree" },
      { value: 'phd', label: 'PhD' },
      { value: 'any', label: 'Any' },
    ]},
    { name: 'salaryRange', label: 'Salary Range (ETB/month)', type: 'text', required: false, placeholder: 'e.g., 15,000 – 25,000 ETB' },
    { name: 'numberOfPositions', label: 'Number of Positions', type: 'number', required: false, placeholder: 'e.g., 2' },
    { name: 'skills', label: 'Required Skills', type: 'text', required: false, placeholder: 'e.g., Python, Excel, AutoCAD' },
    { name: 'benefits', label: 'Benefits', type: 'text', required: false, placeholder: 'e.g., Health insurance, transport allowance' },
    { name: 'applicationDeadline', label: 'Application Deadline', type: 'date', required: false },
  ],
  'business-industrial': [
    { name: 'subCategory', label: 'Sub Category', type: 'select', required: true, options: [
      { value: 'machinery', label: 'Machinery' },
      { value: 'equipment', label: 'Equipment' },
      { value: 'supplies', label: 'Supplies' },
      { value: 'business-for-sale', label: 'Business for Sale' }
    ]},
    { name: 'condition', label: 'Condition', type: 'select', required: true, options: [
      { value: 'new', label: 'New' },
      { value: 'used', label: 'Used' },
      { value: 'refurbished', label: 'Refurbished' }
    ]},
    { name: 'brand', label: 'Brand/Manufacturer', type: 'text', required: false, placeholder: 'e.g., Caterpillar' },
    { name: 'warranty', label: 'Warranty', type: 'select', required: false, options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' }
    ]}
  ],
  'agriculture': [
    { name: 'subCategory', label: 'Sub Category', type: 'select', required: true, options: [
      { value: 'crops', label: 'Crops' },
      { value: 'livestock', label: 'Livestock' },
      { value: 'equipment', label: 'Equipment' },
      { value: 'seeds', label: 'Seeds' },
      { value: 'fertilizers', label: 'Fertilizers' }
    ]},
    { name: 'quantity', label: 'Quantity', type: 'text', required: false, placeholder: 'e.g., 100 kg' },
    { name: 'organic', label: 'Organic', type: 'select', required: false, options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' }
    ]}
  ]
};

export default function CreateListing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, accessToken } = useSelector((s) => s.auth);

  // If a category was passed from the Search page, lock to it
  const presetCategory = searchParams.get('category') || '';
  const validSlugs = Object.keys(CATEGORY_FIELDS);
  const lockedCategory = validSlugs.includes(presetCategory) ? presetCategory : '';

  // Categories individual users cannot post in
  const USER_RESTRICTED   = ['domestic-jobs', 'professional-jobs', 'services', 'business-industrial', 'agriculture'];
  // Categories brokers cannot post in (company-only)
  const BROKER_RESTRICTED = ['professional-jobs', 'services'];

  const isUser   = user?.role === 'user';
  const isBroker = user?.role === 'broker';

  // Categories available in the free dropdown per role
  const availableCategories = isUser
    ? validSlugs.filter((s) => !USER_RESTRICTED.includes(s))
    : isBroker
      ? validSlugs.filter((s) => !BROKER_RESTRICTED.includes(s))
      : validSlugs;

  const [form, setForm] = useState({
    title: '',
    description: '',
    categorySlug: lockedCategory || (isUser ? 'automotive' : 'real-estate'),
    price: '',
    currency: 'ETB',
    region: '',
    city: '',
  });
  const [featured, setFeatured] = useState(false);
  const [categoryFields, setCategoryFields] = useState({});
  const [images, setImages] = useState([]);       // File objects
  const [previews, setPreviews] = useState([]);   // Object URLs
  const [video, setVideo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if not authenticated
  if (!user || !accessToken) {
    return <Navigate to="/login" replace />;
  }

  // Block users/brokers trying to access restricted categories
  const isUserBlocked   = isUser   && USER_RESTRICTED.includes(form.categorySlug);
  const isBrokerBlocked = isBroker && BROKER_RESTRICTED.includes(form.categorySlug);
  const isBlockedCategory = isUserBlocked || isBrokerBlocked;

  const CATEGORY_LABELS = {
    'real-estate': 'Real Estate', 'domestic-jobs': 'Domestic Jobs',
    'professional-jobs': 'Professional Jobs', 'services': 'Services',
    'business-industrial': 'Business & Industrial', 'agriculture': 'Agriculture',
  };
  const CATEGORY_ICONS_MAP = {
    'real-estate':'🏠','automotive':'🚗','electronics':'📱','home-furniture':'🛋️',
    'fashion-clothing':'👕','sports-fitness':'⚽','books-media':'📚','pets-animals':'🐾',
    'services':'🔧','domestic-jobs':'🏡','professional-jobs':'💼','business-industrial':'🏭','agriculture':'🌾',
  };

  // Reset category-specific fields when category changes
  useEffect(() => {
    setCategoryFields({});
  }, [form.categorySlug]);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleCategoryFieldChange(e) {
    setCategoryFields((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  const MAX_IMAGES = 5;

  function handleImagePick(e) {
    const incoming = Array.from(e.target.files);
    e.target.value = ''; // reset so same file can be re-selected after removal
    setImages((prev) => {
      const combined = [...prev, ...incoming].slice(0, MAX_IMAGES);
      setPreviews(combined.map((f) => URL.createObjectURL(f)));
      return combined;
    });
  }

  function removeImage(idx) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setPreviews(next.map((f) => URL.createObjectURL(f)));
      return next;
    });
  }

  function moveImageToFront(idx) {
    if (idx === 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      setPreviews(next.map((f) => URL.createObjectURL(f)));
      return next;
    });
  }

  function handleVideo(e) {
    const file = e.target.files[0];
    setVideo(file || null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    
    // Simple validation — price not required for job categories
    const isJobCategory = ['domestic-jobs', 'professional-jobs'].includes(form.categorySlug);
    if (!form.title || !form.description || (!isJobCategory && !form.price) || !form.region) {
      setError('Please fill in all required fields.');
      return;
    }

    // Validate required category fields
    const fields = CATEGORY_FIELDS[form.categorySlug] || [];
    const missingFields = fields
      .filter(f => f.required && !categoryFields[f.name])
      .map(f => f.label);
    
    if (missingFields.length > 0) {
      setError(`Please fill in required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    if (images.length === 0) {
      setError('Please add at least one photo.');
      return;
    }
    
    setLoading(true);
    
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('categorySlug', form.categorySlug);
      fd.append('price', isJobCategory ? '0' : form.price);
      fd.append('currency', form.currency);
      fd.append('location', JSON.stringify({ region: form.region, city: form.city }));
      fd.append('isFeatured', featured ? 'true' : 'false');

      // Add all category-specific fields dynamically
      Object.keys(categoryFields).forEach(key => {
        if (categoryFields[key]) {
          fd.append(key, categoryFields[key]);
        }
      });

      // Add media files
      images.forEach((img) => fd.append('images', img));
      if (video) fd.append('video', video);

      const { data } = await client.post('/listings', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigate(`/listings/${data.listing._id}`);
    } catch (err) {
      // If subscription required, redirect to subscription page
      if (err.response?.data?.requiresSubscription) {
        const cat = err.response.data.categorySlug || form.categorySlug;
        navigate(`/premium-subscription?category=${cat}`);
        return;
      }
      setError(err.response?.data?.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  }

  // Render a form field based on its definition
  function renderField(field) {
    const value = categoryFields[field.name] || '';
    
    if (field.type === 'select') {
      return (
        <select 
          className="form-select" 
          name={field.name} 
          value={value} 
          onChange={handleCategoryFieldChange}
          required={field.required}
        >
          <option value="">Select...</option>
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }
    
    return (
      <input 
        className="form-control" 
        name={field.name} 
        type={field.type}
        value={value}
        placeholder={field.placeholder}
        onChange={handleCategoryFieldChange}
        required={field.required}
      />
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      {/* Back navigation */}
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--primary)', fontWeight: 600, fontSize: '0.88rem',
          padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
          marginBottom: 16,
        }}
      >
        <i className="bi bi-arrow-left"></i> Back
      </button>

      <h2>Create Listing</h2>

      {/* Blocked category message */}
      {isBlockedCategory && (
        <div style={{
          background: isBrokerBlocked ? '#fef2f2' : '#fef9c3',
          border: `1.5px solid ${isBrokerBlocked ? '#fecaca' : '#fcd34d'}`,
          borderRadius: 14, padding: '28px 32px', textAlign: 'center', marginBottom: 24,
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>
            {CATEGORY_ICONS_MAP[form.categorySlug]}
          </div>
          <h5 style={{ fontWeight: 800, color: isBrokerBlocked ? '#991b1b' : '#92400e', marginBottom: 8 }}>
            {isBrokerBlocked
              ? 'This category is for verified companies only'
              : 'This category is for verified brokers / companies'}
          </h5>
          <p style={{ color: isBrokerBlocked ? '#7f1d1d' : '#78350f', fontSize: '0.95rem', marginBottom: 20 }}>
            <strong>{CATEGORY_LABELS[form.categorySlug] || form.categorySlug}</strong>
            {isBrokerBlocked
              ? ' listings can only be posted by registered and verified companies. Broker accounts are not permitted to post in this category.'
              : ' listings can only be posted by verified brokers or registered companies. Individual accounts are not permitted to post in this category.'}
          </p>
          <div className="d-flex gap-2 justify-content-center flex-wrap">
            <button
              className="btn btn-outline-secondary rounded-pill px-4"
              onClick={() => navigate(-1)}
            >
              ← Go Back
            </button>
            {!isBrokerBlocked && (
              <a href="/register?role=broker" className="btn btn-primary rounded-pill px-4">
                Register as Broker
              </a>
            )}
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Hide the form when category is blocked */}
      {!isBlockedCategory && (
      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="card mb-4">
          <div className="card-body">
            <h5>Basic Information</h5>
            
            <div className="mb-3">
              <label className="form-label">Title *</label>
              <input className="form-control" name="title" value={form.title} onChange={handleChange} placeholder="e.g., Spacious 3BR Apartment in Bole" required />
            </div>

            <div className="mb-3">
              <label className="form-label">Description *</label>
              <textarea className="form-control" name="description" value={form.description} rows={4} onChange={handleChange} placeholder="Describe your listing in detail..." required />
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Category *</label>
                  {lockedCategory ? (
                    /* Locked — came from a category page, cannot change */
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: 'var(--primary-light)',
                        border: '1.5px solid #bbf7d0',
                        borderRadius: 8, padding: '9px 14px',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>
                        {{ 'real-estate':'🏠','automotive':'🚗','electronics':'📱','home-furniture':'🛋️','fashion-clothing':'👕','sports-fitness':'⚽','books-media':'📚','pets-animals':'🐾','services':'🔧','domestic-jobs':'🏡','professional-jobs':'💼','business-industrial':'🏭','agriculture':'🌾' }[lockedCategory]}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem', textTransform: 'capitalize' }}>
                        {lockedCategory.replace(/-/g, ' ')}
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, background: '#fff', borderRadius: 20, padding: '2px 8px', border: '1px solid #bbf7d0' }}>
                        Fixed
                      </span>
                    </div>
                  ) : (
                    <select className="form-select" name="categorySlug" value={form.categorySlug} onChange={handleChange}>
                      {availableCategories.map((slug) => (
                        <option key={slug} value={slug}>
                          {CATEGORY_ICONS_MAP[slug]} {CATEGORY_LABELS[slug] || slug.replace(/-/g, ' ')}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  {!['domestic-jobs', 'professional-jobs'].includes(form.categorySlug) && (
                    <>
                      <label className="form-label">Price (ETB) *</label>
                      <input className="form-control" name="price" type="number" value={form.price} onChange={handleChange} placeholder="e.g., 50000" required />
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Region *</label>
                  <input className="form-control" name="region" value={form.region} onChange={handleChange} placeholder="e.g., Addis Ababa" required />
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">City</label>
                  <input className="form-control" name="city" value={form.city} onChange={handleChange} placeholder="e.g., Bole" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category-specific fields */}
        <div className="card mb-4">
          <div className="card-body">
            <h5>
              {form.categorySlug === 'real-estate' && 'Property Details'}
              {form.categorySlug === 'automotive' && 'Vehicle Details'}
              {form.categorySlug === 'electronics' && 'Electronics Details'}
              {form.categorySlug === 'home-furniture' && 'Item Details'}
              {form.categorySlug === 'fashion-clothing' && 'Fashion Details'}
              {form.categorySlug === 'sports-fitness' && 'Sports & Fitness Details'}
              {form.categorySlug === 'books-media' && 'Book/Media Details'}
              {form.categorySlug === 'pets-animals' && 'Pet/Animal Details'}
              {form.categorySlug === 'services' && 'Service Details'}
              {form.categorySlug === 'domestic-jobs' && 'Domestic Job Details'}
              {form.categorySlug === 'professional-jobs' && 'Professional Job Details'}
              {form.categorySlug === 'business-industrial' && 'Business/Industrial Details'}
              {form.categorySlug === 'agriculture' && 'Agriculture Details'}
            </h5>
            
            <div className="row">
              {CATEGORY_FIELDS[form.categorySlug]?.map((field, idx) => (
                <div key={field.name} className={idx % 2 === 0 ? 'col-md-6' : 'col-md-6'}>
                  <div className="mb-3">
                    <label className="form-label">
                      {field.label} {field.required && '*'}
                    </label>
                    {renderField(field)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Media */}
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="mb-1">Photos &amp; Video</h5>
            <p className="text-muted small mb-4">
              Add up to 5 photos. The first photo is the cover shown in search results.
              Tap any photo to set it as cover. Video is optional.
            </p>

            {/* Photo grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 10,
                marginBottom: 16,
              }}
            >
              {previews.map((src, i) => (
                <div
                  key={i}
                  style={{
                    position: 'relative',
                    borderRadius: 10,
                    overflow: 'hidden',
                    border: i === 0 ? '2.5px solid #16a34a' : '1.5px solid #e5e7eb',
                    aspectRatio: '4/3',
                    background: '#f3f4f6',
                    cursor: i === 0 ? 'default' : 'pointer',
                  }}
                  onClick={() => moveImageToFront(i)}
                  title={i === 0 ? 'Cover photo' : 'Tap to set as cover'}
                >
                  <img
                    src={src}
                    alt={`Photo ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* Cover label */}
                  {i === 0 && (
                    <span
                      style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'rgba(22,163,74,0.85)',
                        color: '#fff', fontSize: '0.65rem', fontWeight: 700,
                        textAlign: 'center', padding: '3px 0',
                        letterSpacing: '0.5px', textTransform: 'uppercase',
                      }}
                    >
                      Cover
                    </span>
                  )}
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                    style={{
                      position: 'absolute', top: 5, right: 5,
                      background: 'rgba(0,0,0,0.55)', color: '#fff',
                      border: 'none', borderRadius: '50%',
                      width: 22, height: 22, fontSize: '0.7rem',
                      cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                    }}
                    title="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Add photo tile — shown when under the limit */}
              {images.length < MAX_IMAGES && (
                <label
                  style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    border: '2px dashed #d1d5db', borderRadius: 10,
                    aspectRatio: '4/3', cursor: 'pointer',
                    background: '#fafafa', color: '#9ca3af',
                    transition: 'border-color 0.2s, color 0.2s',
                    gap: 6,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#16a34a'; e.currentTarget.style.color = '#16a34a'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#d1d5db'; e.currentTarget.style.color = '#9ca3af'; }}
                >
                  <i className="bi bi-camera" style={{ fontSize: '1.6rem' }}></i>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                    {images.length === 0 ? 'Add Photos' : `Add More (${images.length}/${MAX_IMAGES})`}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleImagePick}
                  />
                </label>
              )}
            </div>

            {images.length > 0 && (
              <p className="text-muted small mb-4">
                <i className="bi bi-info-circle me-1"></i>
                {images.length}/{MAX_IMAGES} photos added.
                {images.length > 1 && ' Tap a photo to make it the cover.'}
              </p>
            )}

            {/* Video — optional */}
            <div
              style={{
                border: '1.5px solid #e5e7eb', borderRadius: 10,
                padding: '14px 16px', background: '#fafafa',
              }}
            >
              <div className="d-flex align-items-center justify-content-between mb-1">
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  <i className="bi bi-camera-video me-2" style={{ color: '#6b7280' }}></i>
                  Video
                </span>
                <span
                  style={{
                    fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                    background: '#f3f4f6', color: '#6b7280',
                    borderRadius: 20, padding: '2px 8px', letterSpacing: '0.4px',
                  }}
                >
                  Optional
                </span>
              </div>
              <p className="text-muted small mb-2">One video (MP4, MOV, WebM — max 50 MB). Requires at least one photo.</p>

              {video ? (
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: 8, padding: '8px 12px',
                  }}
                >
                  <i className="bi bi-file-earmark-play-fill" style={{ color: '#16a34a', fontSize: '1.2rem' }}></i>
                  <span style={{ flex: 1, fontSize: '0.82rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {video.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', flexShrink: 0 }}>
                    {(video.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button
                    type="button"
                    onClick={() => setVideo(null)}
                    style={{
                      background: 'none', border: 'none', color: '#ef4444',
                      cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
                      padding: '0 4px', flexShrink: 0,
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    cursor: 'pointer', color: '#6b7280', fontSize: '0.85rem',
                  }}
                >
                  <span
                    style={{
                      background: '#f3f4f6', border: '1px solid #e5e7eb',
                      borderRadius: 8, padding: '6px 14px', fontWeight: 600,
                      fontSize: '0.8rem', whiteSpace: 'nowrap',
                    }}
                  >
                    Choose Video
                  </span>
                  <span className="text-muted small">No file chosen</span>
                  <input
                    type="file"
                    accept="video/mp4,video/mpeg,video/quicktime,video/webm"
                    style={{ display: 'none' }}
                    onChange={handleVideo}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="d-flex gap-3 align-items-stretch">
          <button className="btn btn-primary btn-lg flex-grow-1" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Listing'}
          </button>

          <button
            type="button"
            onClick={() => setFeatured((f) => !f)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 24px',
              borderRadius: 10,
              border: featured ? '2px solid #f59e0b' : '2px solid #e5e7eb',
              background: featured ? '#fffbeb' : '#fff',
              color: featured ? '#b45309' : '#6b7280',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
            title={featured ? 'Remove featured status' : 'Feature this listing (highlighted in search results)'}
          >
            <span style={{ fontSize: '1.2rem' }}>⭐</span>
            {featured ? 'Featured' : 'Feature'}
          </button>
        </div>
      </form>
      )} {/* end !isBlockedCategory */}
    </div>
  );
}
