<div align="center">

# 🛒 EthioGebiya — ኢትዮ ገቢያ

### Ethiopia's Premier Online Marketplace

**The go-to classifieds platform for buying, selling, and connecting across Ethiopia.**  
Built for individuals, licensed brokers, and registered companies.

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-9-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-v4-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![Redis](https://img.shields.io/badge/Redis-Upstash-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://upstash.com)

</div>

---

## 📌 Table of Contents

| # | Section |
|---|---|
| 1 | [What is EthioGebiya?](#-what-is-ethiogebiya) |
| 2 | [Background of the Project](#-background-of-the-project) |
| 3 | [Tech Stack](#-tech-stack) |
| 4 | [Project Structure](#-project-structure) |
| 5 | [Getting Started](#-getting-started) |
| 6 | [Environment Variables](#-environment-variables) |
| 7 | [User Roles](#-user-roles) |
| 8 | [Core Features](#-core-features) |
| 9 | [Subscription & Payments](#-subscription--payment-system) |
| 10 | [Real-Time Features](#-real-time-features) |
| 11 | [API Reference](#-api-reference) |
| 12 | [Database Models](#-database-models) |
| 13 | [Frontend Pages](#-frontend-pages) |
| 14 | [Internationalization](#-internationalization) |
| 15 | [Admin Panel](#-admin-panel) |

---

## 🇪🇹 What is EthioGebiya?

> **EthioGebiya** (ኢትዮ ገቢያ) means *"Ethiopian Market"* — a full-stack classifieds platform purpose-built for Ethiopia.

Sellers post listings. Buyers browse and contact them. Simple — but powerful.

### ✨ What makes it different?

| Feature | Description |
|---|---|
| 📍 **Interactive Map** | Sellers drop a pin on OpenStreetMap. Buyers see the exact location. |
| 💳 **Subscription Model** | Post per category — monthly (up to 100 listings) or yearly (up to 1,500 listings). |
| 👤 **Rich Seller Profiles** | Every listing shows the seller's full profile: phone, email, bio, license, specializations. |
| 💬 **Real-Time Messaging** | Socket.io-powered chat with typing indicators and instant notifications. |
| 🛡️ **Content Moderation** | Admins warn or remove listings. Owners see a moderation notice on their listing. |
| 🌐 **Bilingual** | Full English + Amharic (አማርኛ) support. |
| 🏢 **Company Profiles** | Businesses post under their brand with a dedicated public profile page. |

---

## 🛠 Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 18+ | Runtime (CommonJS) |
| **Express** | 5 | Web framework |
| **MongoDB + Mongoose** | 9 | Primary database |
| **Redis (Upstash) + ioredis** | — | Cache, sessions, Socket.io adapter |
| **Socket.io** | v4 | Real-time messaging & notifications |
| **JWT + bcryptjs** | — | Authentication & password hashing |
| **Multer → Cloudinary** | — | Image & video uploads |
| **Chapa API** | — | Ethiopian payment gateway |
| **Afromessage API** | — | SMS OTP verification |
| **node-cron** | — | Scheduled jobs (listing expiry) |
| **helmet + cors + rate-limit** | — | Security hardening |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React + Vite** | 19 + 8 | UI framework & build tool |
| **React Router DOM** | v7 | Client-side routing (lazy-loaded) |
| **Redux Toolkit** | — | Global state management |
| **Axios** | — | HTTP client with auto token refresh |
| **Socket.io-client** | v4 | Real-time client |
| **Bootstrap** | 5.3 | UI styling |
| **Leaflet + react-leaflet** | — | Interactive maps (OpenStreetMap — free) |
| **i18next + react-i18next** | — | English + Amharic internationalization |

---

## 📁 Project Structure

```
ethiogebiya/
│
├── 📂 backend/
│   ├── server.js                  ← Express app entry point
│   ├── seedCategories.js          ← One-time DB seed script
│   └── src/
│       ├── config/                ← DB, Redis, Cloudinary, Socket.io
│       ├── controllers/           ← Route handler logic
│       ├── middleware/            ← Auth, uploads, error handling, security
│       ├── models/                ← Mongoose schemas
│       ├── routes/                ← Express routers
│       ├── services/              ← Notification & OTP services
│       ├── jobs/                  ← Cron jobs (listing expiry)
│       └── utils/                 ← Cloudinary helpers
│
└── 📂 frontend/
    ├── index.html
    └── src/
        ├── App.jsx                ← Routes + lazy loading
        ├── main.jsx               ← React entry point
        ├── api/client.js          ← Axios instance with interceptors
        ├── components/            ← Shared UI components
        ├── pages/                 ← Page-level components
        ├── store/                 ← Redux slices
        └── i18n/                  ← en.json + am.json translations
```

---

## 🚀 Getting Started

### Prerequisites

- ✅ Node.js 18+
- ✅ MongoDB Atlas (or local MongoDB)
- ✅ Redis instance (Upstash recommended — free tier available)
- ✅ Cloudinary account (free tier available)
- ✅ Chapa account (for payments)
- ⚙️ Afromessage account (SMS OTP — optional in development)

### 1️⃣ Backend Setup

```bash
cd backend
npm install

# Create backend/.env (see Environment Variables section)

# Seed the 13 categories into MongoDB — run once
node seedCategories.js

# Development (hot reload)
npm run dev

# Production
npm start
```

> 🌐 Backend runs on **http://localhost:5000**

### 2️⃣ Frontend Setup

```bash
cd frontend
npm install

# Create frontend/.env (see Environment Variables section)

# Development
npm run dev

# Production build
npm run build
```

> 🌐 Frontend runs on **http://localhost:5173**

### 💡 Development Mode (No SMS Required)

Leave `AFROMESSAGE_TOKEN` empty in `.env` to enable dev mode:
- Phone numbers are **auto-verified** on registration
- OTP codes are **printed to the console** instead of sent via SMS

---

## 🔐 Environment Variables

### `backend/.env`

```env
# ── Database ──────────────────────────────────────
MONGO_URI=mongodb+srv://...
REDIS_URL=rediss://...

# ── Authentication ────────────────────────────────
JWT_ACCESS_SECRET=your_long_random_secret
JWT_REFRESH_SECRET=your_long_random_secret

# ── Cloudinary ────────────────────────────────────
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ── Payments ──────────────────────────────────────
CHAPA_SECRET_KEY=CHASECK_TEST-...

# ── SMS (leave empty for dev mode) ────────────────
AFROMESSAGE_TOKEN=
AFROMESSAGE_IDENTIFIER=
AFROMESSAGE_SENDER=EthioGebiya

# ── Platform ──────────────────────────────────────
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
```

### `frontend/.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 👥 User Roles

```
┌─────────────────────────────────────────────────────────────────┐
│                        PLATFORM ROLES                           │
├──────────────┬──────────────────┬──────────────┬───────────────┤
│   👤 USER    │   🏷️ BROKER      │  🏢 COMPANY  │  🔑 ADMIN    │
├──────────────┼──────────────────┼──────────────┼───────────────┤
│ Default role │ Licensed         │ Registered   │ Full platform │
│ for all new  │ professional     │ business     │ control       │
│ registrants  │ (agent, dealer)  │              │               │
├──────────────┼──────────────────┼──────────────┼───────────────┤
│ Post in 8    │ Post in ALL      │ Post in ALL  │ Manage users, │
│ everyday     │ categories incl. │ categories   │ listings,     │
│ categories   │ domestic jobs    │ incl. jobs & │ subscriptions,│
│              │                  │ services     │ moderation    │
├──────────────┼──────────────────┼──────────────┼───────────────┤
│ 1 free trial │ Requires license │ Requires     │ Created       │
│ listing      │ doc + admin      │ reg. doc +   │ directly in   │
│              │ verification     │ admin approval│ database      │
└──────────────┴──────────────────┴──────────────┴───────────────┘
```

---

## 📖 Background of the Project

### The Traditional Brokerage System in Ethiopia

In Ethiopia, the brokerage system—known locally as **"Delala" (ደላላ)**—has been an integral part of commerce for generations. Traditional brokers serve as trusted intermediaries connecting buyers and sellers across various sectors including real estate, automotive, agricultural products, and general merchandise. These brokers facilitate transactions by leveraging their personal networks, market knowledge, and negotiation skills.

However, this system operates largely through informal channels, face-to-face interactions, and word-of-mouth referrals, presenting several challenges in the modern context:

| Challenge | Impact |
|---|---|
| 🗺️ **Limited Geographical Reach** | Brokers are constrained by Ethiopia's vast landscape, unable to connect parties across regions |
| ⚖️ **Information Asymmetry** | Buyers and sellers lack transparent access to market information |
| 💰 **Unstandardized Pricing** | No consistent pricing mechanisms lead to market inefficiencies |
| 🔍 **Credibility Verification** | Difficulty in verifying the trustworthiness and credentials of participants |
| 📞 **Inefficient Communication** | Reliance on phone calls and in-person meetings limits transaction speed |

### Digital Transformation in Ethiopia

The Ethiopian economy has been experiencing significant growth and digital transformation in recent years. With the government's commitment to the **Digital Ethiopia 2025 strategy**, there is an increasing push toward digital solutions that address traditional market inefficiencies. 

The brokerage sector, which handles **billions of Birr in transactions annually**, remains largely untouched by this digital revolution. Institutions like Debre Markos University recognize the urgent need for digital transformation in commercial activities to:

- Expand market access across urban and rural areas
- Create transparent, verifiable transaction systems
- Empower traditional brokers with modern tools
- Build trust through digital verification systems
- Enable efficient, real-time communication

### The EthioGebiya Solution

**EthioGebiya** (formerly Digital Delala) is an innovative digital marketplace platform that transforms the traditional brokerage system by leveraging modern technology. Rather than eliminating brokers, the platform **empowers them** with digital tools that:

✅ **Extend their reach** — Connect with buyers and sellers across all regions of Ethiopia  
✅ **Improve efficiency** — Manage multiple listings and conversations from one platform  
✅ **Build verifiable trust** — License verification and public profile systems  
✅ **Preserve their role** — Maintain the valuable human element of brokerage while adding digital capabilities

The platform serves as a comprehensive digital ecosystem accessible across all regions of Ethiopia—from major urban centers like Addis Ababa, Bahir Dar, Dire Dawa, and Hawassa to smaller towns and rural areas where traditional brokerage plays a crucial role in local economies.

### Technical Foundation

Built on the **MERN stack** (MongoDB, Express, React, Node.js), EthioGebiya provides a robust, scalable, and modern technology foundation that supports:

- Real-time messaging and notifications via Socket.io
- Geolocation-based search with interactive maps
- Secure payment processing through Ethiopian payment gateways
- Multi-language support (English and Amharic)
- Role-based access control for users, brokers, companies, and administrators
- Content moderation and trust systems

By bridging the gap between traditional commerce and digital innovation, EthioGebiya aims to unlock the full potential of Ethiopia's marketplace economy while preserving the cultural and economic significance of the Delala system.

---

## ⚡ Core Features

### 🗂️ 13 Listing Categories

| Category | Level | Who Can Post |
|---|---|---|
| 🏠 Real Estate | High | User, Broker, Company |
| 🚗 Automotive | High | User, Broker, Company |
| 🏭 Business & Industrial | High | Broker, Company |
| 💼 Professional Jobs | Medium | Company only |
| 🏡 Domestic Jobs | Medium | Broker, Company |
| 🔧 Services | Medium | Company only |
| 📱 Electronics | Low | User, Broker, Company |
| 🛋️ Home & Furniture | Low | User, Broker, Company |
| 👕 Fashion & Clothing | Low | User, Broker, Company |
| ⚽ Sports & Fitness | Low | User, Broker, Company |
| 📚 Books & Media | Low | User, Broker, Company |
| 🐾 Pets & Animals | Low | User, Broker, Company |
| 🌾 Agriculture | Low | Broker, Company |

---

### 📝 Listing Creation
- Multi-step form: title, description, price, location, category-specific fields
- Up to **5 photos** + **1 video** per listing
- **Interactive map** — click to drop a pin (OpenStreetMap, free, no API key)
- Coordinates stored as GeoJSON Point for geo-radius search
- Listings expire after **30 days** — owners can renew, deactivate, or delete

### 👤 Seller Profile Card
Every listing detail page shows the seller's full profile:

```
┌─────────────────────────────────────────────────┐
│  [Photo]  Full Name          [🏷️ Broker] [✓ Verified]  │
│           ─────────────────────────────────────  │
│  📖  Bio / description                           │
│  📞  +251 9XX XXX XXX  (clickable)               │
│  ✉️   email@example.com  (clickable)              │
│  📍  Addis Ababa, Bole                           │
│  🌐  www.website.com                             │
│  🏷️  License: BR-12345  [Real Estate]            │
│  🎯  Specializations: [Residential] [Commercial] │
│                              [💬 Message]        │
└─────────────────────────────────────────────────┘
```

> Contact info visibility respects the seller's privacy settings.

### 🗺️ Interactive Map
- Seller drops a pin when creating the listing
- Buyer sees a read-only Leaflet map on the listing detail page
- Powered by **OpenStreetMap** — 100% free, no API key, no billing

### 🔍 Search & Discovery
- Full-text keyword search
- Category, price range, region/city filters
- Geo-radius search
- Featured listings appear first
- Save searches for later

### 💬 Real-Time Messaging
- Buyers contact sellers directly from a listing
- Conversations tied to the listing
- Phone numbers & emails **auto-stripped** from messages (privacy protection)
- Users can block others
- Typing indicators

### 🔔 Notifications
- New messages, subscription updates, listing expiry warnings, verification results, moderation actions
- Delivered **instantly** via Socket.io
- Stored for later retrieval

### 🛡️ Content Moderation
When an admin actions a report:
- Owner receives an **in-app notification** with the admin's note
- A **moderation banner** appears on the listing (visible to owner only):
  - ⚠️ Yellow banner for warnings
  - 🚫 Red banner for removed listings

---

## 💳 Subscription & Payment System

### Listing Limits

| Plan | Duration | Listings Allowed |
|---|---|---|
| ⭐ Monthly | 30 days | Up to **100** listings |
| 🏆 Yearly | 365 days | Up to **1,500** listings |

### Pricing Table

| Category Level | 👤 User | 🏷️ Broker | 🏢 Company |
|---|---|---|---|
| 🔴 High (monthly / yearly) | 200 / 2,000 ETB | 600 / 6,000 ETB | 1,200 / 12,000 ETB |
| 🟡 Medium (monthly / yearly) | 100 / 1,000 ETB | 300 / 3,000 ETB | 600 / 6,000 ETB |
| 🟢 Low (monthly / yearly) | 50 / 500 ETB | 150 / 1,500 ETB | 300 / 3,000 ETB |

### Payment Methods

| Method | How it works |
|---|---|
| ⚡ **Chapa** (recommended) | Redirect to Chapa checkout → Telebirr, CBE Birr, M-Pesa, bank cards |
| 📤 **Manual Transfer** | CBE / Telebirr / M-Pesa → upload receipt → admin activates |

### Subscription Lifecycle

```
User pays  →  [pending]  →  Admin activates  →  [active]  →  Cron job  →  [expired]
                                                                              ↓
                                                                         User renews
```

---

## 📡 Real-Time Features

Socket.io with a **Redis adapter** — scales across multiple server instances.

### Socket Events

| Event | Direction | Description |
|---|---|---|
| `message:receive` | Server → Client | New message to conversation room + recipient's personal room |
| `notification:new` | Server → Client | Push notification to user's personal room |
| `conversation:typing` | Client ↔ Server | Typing indicator broadcast |
| `message:send` | Client → Server | Send message via socket (persisted to DB) |

### Connection Model

```
Login  →  NotificationProvider opens socket  →  joins user:{userId} room
Open chat  →  Chat page joins conversationId room
```

---

## 📖 API Reference

> All routes prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### 🔑 Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register new account |
| POST | `/auth/verify-otp` | — | Verify phone with OTP |
| POST | `/auth/login` | — | Login → returns JWT pair |
| POST | `/auth/refresh` | — | Refresh access token |
| POST | `/auth/logout` | — | Revoke refresh token |
| GET | `/auth/me` | ✅ | Get current user |
| PUT | `/auth/me` | ✅ | Update profile |
| POST | `/auth/forgot-password` | — | Request password reset |
| POST | `/auth/reset-password` | — | Set new password |
| GET/PUT | `/auth/settings` | ✅ | Get / update account settings |

### 📋 Listings
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/listings` | ✅ | Create listing (multipart/form-data) |
| GET | `/listings/my` | ✅ | Get own listings |
| GET | `/listings/:id` | — | Get listing detail with full owner profile |
| PUT | `/listings/:id` | ✅ owner | Update listing |
| DELETE | `/listings/:id` | ✅ owner | Delete listing |
| PATCH | `/listings/:id/status` | ✅ owner | Activate / deactivate / renew |

### 💬 Messaging
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/conversations` | ✅ | Start or get conversation |
| GET | `/conversations` | ✅ | List conversations |
| GET | `/conversations/:id/messages` | ✅ | Get messages |
| POST | `/conversations/:id/messages` | ✅ | Send message |

### 💳 Subscriptions
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/premium-subscriptions/pricing` | — | Get pricing table |
| POST | `/premium-subscriptions/chapa/initialize` | ✅ | Start Chapa payment |
| GET | `/premium-subscriptions/chapa/verify` | ✅ | Verify Chapa payment |
| POST | `/premium-subscriptions` | ✅ | Submit manual receipt |
| GET | `/premium-subscriptions/my` | ✅ | Get own subscriptions |
| PATCH | `/premium-subscriptions/:id/activate` | 🔑 Admin | Activate |
| PATCH | `/premium-subscriptions/:id/reject` | 🔑 Admin | Reject |

### 🔑 Admin
| Method | Endpoint | Description |
|---|---|---|
| GET/PATCH/DELETE | `/admin/users/:id` | Manage users |
| GET/PATCH | `/admin/verifications/:id` | Verification queue |
| GET/DELETE | `/admin/listings/:id` | Manage listings |
| GET/PATCH | `/admin/companies/:id` | Manage companies |
| GET/PATCH | `/admin/reports/:id` | Moderation reports |
| GET | `/admin/analytics` | Analytics data |
| GET | `/admin/analytics/export` | Download CSV |
| GET/POST/PUT/DELETE | `/admin/categories/:id` | Category management |
| GET | `/admin/conversations` | All chat conversations |
| GET | `/admin/conversations/:id/messages` | Messages in a conversation |

---

## 🗄️ Database Models

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│    User      │────▶│   Listing    │────▶│  ModerationReport    │
│──────────────│     │──────────────│     │──────────────────────│
│ phone        │     │ owner        │     │ targetId             │
│ fullName     │     │ title        │     │ reportedBy           │
│ role         │     │ categorySlug │     │ reason               │
│ profilePhoto │     │ price        │     │ status               │
│ bio          │     │ location     │     │ actionType           │
│ phone/email  │     │ images[]     │     │ adminNote            │
│ specializ.   │     │ status       │     └──────────────────────┘
│ settings     │     │ moderationX  │
└──────────────┘     │ realEstate{} │     ┌──────────────────────┐
                     │ automotive{} │     │  PremiumSubscription │
┌──────────────┐     │ ...          │     │──────────────────────│
│   Company    │     └──────────────┘     │ user                 │
│──────────────│                          │ categorySlug         │
│ companyName  │     ┌──────────────┐     │ duration             │
│ logo         │     │ Conversation │     │ fee                  │
│ verif.Status │     │──────────────│     │ status               │
│ adminUser    │     │ participants │     │ expiryDate           │
└──────────────┘     │ listing      │     └──────────────────────┘
                     │ lastMessage  │
                     └──────────────┘
```

---

## 🖥️ Frontend Pages

| Page | Route | 🔒 Auth | Description |
|---|---|---|---|
| 🏠 Home | `/` | — | Landing page with category grid & featured listings |
| 🔍 Search | `/search` | — | Browse and filter all listings |
| 📋 Listing Detail | `/listings/:id` | — | Full listing view with map & seller profile |
| 🏢 Company Profile | `/companies/:id` | — | Public company page |
| 📝 Register | `/register` | — | Account registration |
| 🔑 Login | `/login` | — | Login form |
| 📱 Verify OTP | `/verify-otp` | — | Phone verification |
| 🔓 Forgot Password | `/forgot-password` | — | Password reset request |
| 👤 Profile | `/profile` | ✅ | View and edit own profile |
| 📦 My Listings | `/my-listings` | ✅ | Manage own listings |
| ➕ Create Listing | `/listings/create` | ✅ | Post a new listing with map pin |
| ✏️ Edit Listing | `/listings/:id/edit` | ✅ | Edit an existing listing |
| 💬 Messages | `/messages` | ✅ | Conversation list |
| 💬 Chat | `/messages/:id` | ✅ | Real-time chat |
| 🔔 Notifications | `/notifications` | ✅ | All notifications |
| 💳 Subscription | `/premium-subscription` | ✅ | Subscribe to a category |
| ⚙️ Settings | `/settings` | ✅ | Account settings |
| 🔑 Admin Panel | `/admin-panel` | 🔑 Admin | Full admin dashboard |

---

## 🌐 Internationalization

The platform supports **2 languages**:

| Language | Code | File |
|---|---|---|
| 🇬🇧 English | `en` | `frontend/src/i18n/en.json` |
| 🇪🇹 Amharic (አማርኛ) | `am` | `frontend/src/i18n/am.json` |

**Detection order:** Saved user preference → Browser language → Fallback to English

Users switch languages from the **Settings page** or the **navbar**. The preference is saved to their account.

---

## 🔑 Admin Panel

> Accessible at `/admin-panel` — `admin` role only.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ADMIN PANEL TABS                                                   │
├──────────────┬──────────────────────────────────────────────────────┤
│  📊 Overview │ Stat cards: Users, Listings, Companies, Reports      │
│              │ System Health + Pending Actions panels               │
├──────────────┼──────────────────────────────────────────────────────┤
│  👥 Users    │ Search, suspend, reinstate, or permanently delete    │
│              │ users. Deleting removes all their data.              │
├──────────────┼──────────────────────────────────────────────────────┤
│  📋 Listings │ View all listings. Delete any listing permanently.   │
├──────────────┼──────────────────────────────────────────────────────┤
│  🔍 Verif.   │ Company / Broker / Individual verification queues.   │
│              │ Approve or reject with notification to user.         │
├──────────────┼──────────────────────────────────────────────────────┤
│  🚨 Reports  │ Listing reports grouped by listing. Expand to see    │
│              │ reporters with View Account button. Actions:         │
│              │ Warn Owner · Remove Listing · Suspend · Dismiss      │
├──────────────┼──────────────────────────────────────────────────────┤
│  💳 Subs     │ Pending/active/rejected subscriptions. View receipt. │
│              │ Activate or reject each request.                     │
├──────────────┼──────────────────────────────────────────────────────┤
│  📈 Analytics│ Period presets + custom date range. New users,       │
│              │ listings, subscriptions. Category bar chart.         │
│              │ Detailed tables. Export to CSV.                      │
├──────────────┼──────────────────────────────────────────────────────┤
│  💬 Chats    │ Full chat history. Search by user name/phone.        │
│              │ Click conversation → full message thread.            │
├──────────────┼──────────────────────────────────────────────────────┤
│  🏷️ Categories│ Create, edit, toggle active/inactive, delete.       │
│              │ Slug cannot be changed after creation.               │
├──────────────┼──────────────────────────────────────────────────────┤
│  ⚙️ Settings │ Admin notification preferences + language.           │
└──────────────┴──────────────────────────────────────────────────────┘
```

---

<div align="center">

## 🏗️ Built With

**MongoDB · Express · React · Node.js · Socket.io · Redis · Cloudinary · Chapa · Leaflet**

---

*EthioGebiya — Connecting Ethiopia's buyers and sellers, one listing at a time.*

**🇪🇹 Made for Ethiopia**

</div>
