# EthioGebiya — Ethiopian Online Marketplace

EthioGebiya (ኢትዮ ገቢያ) is a full-stack online marketplace and classifieds platform built specifically for Ethiopia. It lets individuals, licensed brokers, and registered companies post and browse listings across 13 categories — from real estate and automotive to jobs and agriculture. The platform includes real-time messaging, a subscription-based posting model, company profiles, and a full admin control panel.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Getting Started](#4-getting-started)
5. [Environment Variables](#5-environment-variables)
6. [User Roles](#6-user-roles)
7. [Features](#7-features)
8. [Subscription & Payment System](#8-subscription--payment-system)
9. [Real-Time Features](#9-real-time-features)
10. [API Reference](#10-api-reference)
11. [Database Models](#11-database-models)
12. [Frontend Pages](#12-frontend-pages)
13. [Internationalization](#13-internationalization)
14. [Admin Panel](#14-admin-panel)

---

## 1. Project Overview

EthioGebiya is designed to be the go-to classifieds platform for Ethiopia. The core idea is simple: sellers post listings, buyers browse and contact them. What makes it different is the subscription model — to post in a category, a seller must either use their one free trial listing or subscribe to that specific category. This keeps the platform monetized while still being accessible to first-time users.

The platform supports three types of sellers:

- **Individual users** — can post in everyday categories like electronics, fashion, and automotive
- **Brokers** — licensed professionals who can post in all categories including real estate and domestic jobs
- **Companies** — registered businesses that can post professional jobs, services, and business listings under their company brand

Buyers can browse and search for free without an account. They only need to register when they want to contact a seller or post a listing.

---

## 2. Tech Stack

### Backend
- **Runtime**: Node.js (CommonJS modules)
- **Framework**: Express 5
- **Database**: MongoDB with Mongoose 9
- **Cache & Sessions**: Redis (Upstash) via ioredis
- **Real-time**: Socket.io v4 with Redis pub/sub adapter
- **Authentication**: JWT (jsonwebtoken) + bcryptjs
- **File Uploads**: Multer (memory storage) → Cloudinary
- **SMS / OTP**: Afromessage API
- **Payments**: Chapa API (Ethiopian payment gateway)
- **Scheduled Jobs**: node-cron
- **Security**: helmet, cors, express-rate-limit

### Frontend
- **Framework**: React 19 with Vite 8
- **Routing**: React Router DOM v7 (lazy-loaded routes)
- **State Management**: Redux Toolkit + React Redux
- **HTTP Client**: Axios (with automatic token refresh interceptor)
- **Real-time**: Socket.io-client v4
- **UI**: Bootstrap 5.3
- **Internationalization**: i18next + react-i18next (English + Amharic)

---

## 3. Project Structure

```
ethiogebiya/
├── backend/
│   ├── server.js                  # Express app entry point
│   ├── seedCategories.js          # One-time DB seed script
│   └── src/
│       ├── config/
│       │   ├── db.js              # MongoDB connection
│       │   ├── redis.js           # Redis singleton
│       │   ├── cloudinary.js      # Cloudinary config
│       │   └── socket.js          # Socket.io setup + JWT auth
│       ├── controllers/           # Route handler logic
│       ├── middleware/            # Auth, error handling, uploads, security
│       ├── models/                # Mongoose schemas
│       ├── routes/                # Express routers
│       ├── services/              # Notification + OTP services
│       ├── jobs/                  # Cron jobs (expiry, subscription renewal)
│       └── utils/                 # Shared utilities (Cloudinary helpers)
│
└── frontend/
    ├── index.html
    └── src/
        ├── App.jsx                # Routes + lazy loading
        ├── main.jsx               # React entry point
        ├── api/
        │   └── client.js          # Axios instance with interceptors
        ├── components/            # Shared UI components
        ├── pages/                 # Page-level components
        ├── store/                 # Redux slices
        └── i18n/                  # Translation files (en.json, am.json)
```

---

## 4. Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Redis instance (Upstash recommended)
- Cloudinary account
- Chapa account (for payments)
- Afromessage account (for SMS OTP) — optional in development

### Backend Setup

```bash
cd backend
npm install

# Copy the environment variables (see Section 5)
# Create a .env file in the backend/ folder

# Seed the 13 categories into MongoDB (run once)
node seedCategories.js

# Start development server (hot reload)
npm run dev

# Start production server
npm start
```

The backend runs on `http://localhost:5000` by default.

### Frontend Setup

```bash
cd frontend
npm install

# Create a .env file in the frontend/ folder:
# VITE_API_URL=http://localhost:5000/api
# VITE_SOCKET_URL=http://localhost:5000

# Start development server
npm run dev

# Build for production
npm run build
```

The frontend runs on `http://localhost:5173` by default.

### Development Mode (No SMS)

If `AFROMESSAGE_TOKEN` is not set in the backend `.env`, the app runs in development mode:
- Phone numbers are auto-verified on registration — no OTP required
- OTP codes are printed to the backend console instead of being sent via SMS

---

## 5. Environment Variables

Create a `.env` file in the `backend/` folder with the following keys:

```env
# MongoDB
MONGO_URI=mongodb+srv://...

# Redis
REDIS_URL=rediss://...

# JWT Secrets (use long random strings)
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Chapa (Ethiopian payment gateway)
CHAPA_SECRET_KEY=CHASECK_TEST-...

# SMS Gateway — Afromessage (leave empty for dev mode)
AFROMESSAGE_TOKEN=
AFROMESSAGE_IDENTIFIER=
AFROMESSAGE_SENDER=EthioGebiya

# Platform
PLATFORM_COMMISSION_RATE=0.05
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
```

Create a `.env` file in the `frontend/` folder:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 6. User Roles

The platform has four roles. Each role has a different set of permissions.

### User (Individual)
The default role for anyone who registers. Users can browse all listings, contact sellers, and post listings in everyday categories (electronics, fashion, sports, books, pets, home & furniture, automotive, real estate). They get one free trial listing. After that, they need a subscription per category.

### Broker
A licensed professional (real estate agent, car dealer, etc.). Brokers can post in all categories including domestic jobs. They have access to listing analytics and can feature up to 5 listings. Broker accounts require a business license document at registration and go through admin verification.

### Company
A registered business. Companies can post in all categories including professional jobs and services. Listings are attributed to the company brand rather than the individual user. Company registration requires a business registration document and admin approval before the company dashboard is activated.

### Admin
Full platform control. Admins can manage users, approve/reject listings and companies, activate subscriptions, manage categories, view analytics, and handle content moderation. Admin accounts are created directly in the database — there is no public admin registration.

---

## 7. Features

### Listing Creation
Users fill out a multi-step form with a title, description, price, location, and category-specific fields (e.g., bedrooms for real estate, make/model for automotive). They can upload up to 10 photos and 1 video. Before the listing is created, the system checks whether the user has an active subscription for that category or a free trial available.

Listings are automatically approved for brokers and companies. Individual user listings go through an admin approval queue.

Listings expire after 30 days and can be renewed. Owners can deactivate, reactivate, or delete their listings from the listing detail page or the My Listings page.

### Search
The search page supports full-text keyword search, category filtering, price range, region/city, and geo-radius search. Results show featured listings first, then newest. Users can save searches and get notified when new matching listings appear.

### Messaging
Buyers can contact sellers directly from a listing detail page. This creates a conversation tied to that listing. Messages are delivered in real-time via Socket.io. Phone numbers and email addresses are automatically stripped from message bodies to protect privacy. Users can block others to stop receiving messages.

### Notifications
The platform sends in-app notifications for events like new messages, subscription activation/rejection, listing expiry warnings, and identity verification results. Notifications appear in the bell icon in the navbar and are delivered in real-time. Opening the notification dropdown auto-marks visible notifications as read after 1.5 seconds. Clicking a message notification navigates directly to that conversation.

### Company Profiles
Companies have a public profile page showing their logo, cover photo, description, contact info, and active listings. Company admins can invite team members with editor or viewer roles. Visitors can submit a contact inquiry directly from the company profile.

### Free Trial
Every user gets 2 free trial listings. The first time they post, the system uses one trial. After both are used, they must subscribe to a category to post again. The plan selection modal shows the remaining trial count.

---

## 8. Subscription & Payment System

Subscriptions are per-category, not platform-wide. A user who wants to post in both Real Estate and Automotive needs two separate subscriptions.

### Pricing

Prices depend on the user's role and the category's price level:

| Category Level | User (monthly/yearly) | Broker (monthly/yearly) | Company (monthly/yearly) |
|---|---|---|---|
| Low | 50 / 500 ETB | 150 / 1,500 ETB | 300 / 3,000 ETB |
| Medium | 100 / 1,000 ETB | 300 / 3,000 ETB | 600 / 6,000 ETB |
| High | 200 / 2,000 ETB | 600 / 6,000 ETB | 1,200 / 12,000 ETB |

**High price level**: Real Estate, Automotive, Business & Industrial
**Medium price level**: Professional Jobs, Domestic Jobs, Services
**Low price level**: Electronics, Home & Furniture, Fashion, Sports, Books, Pets, Agriculture

### Payment Methods

**Chapa (recommended)**: The user is redirected to Chapa's checkout page which supports Telebirr, CBE Birr, M-Pesa, and bank cards. After payment, Chapa sends a webhook to the backend and the frontend verifies the transaction. The subscription stays in `pending` status until an admin activates it.

**Manual transfer**: The user transfers money via CBE, Telebirr, or M-Pesa and uploads a screenshot of the receipt. An admin reviews the receipt and activates the subscription manually.

### Subscription Lifecycle

1. User submits payment → subscription created with `status: pending`
2. Admin reviews and activates → `status: active`, expiry date set (30 or 365 days)
3. Hourly cron job checks for expired subscriptions → `status: expired`
4. 7-day renewal reminder sent before expiry
5. User can subscribe again to renew

---

## 9. Real-Time Features

The backend uses Socket.io with a Redis adapter, which means it can scale across multiple server instances.

### How it works

When a user logs in, the frontend (`NotificationProvider`) opens a Socket.io connection authenticated with the user's JWT access token. The server verifies the token and automatically places the socket in a personal room named `user:{userId}`.

When a user opens a chat, the `Chat` page opens a second socket connection and joins the conversation room (`conversationId`).

### Events

| Event | Who sends it | What it does |
|---|---|---|
| `message:receive` | Server → Client | Delivers a new message to the conversation room and the recipient's personal room |
| `notification:new` | Server → Client | Pushes a new notification to the user's personal room |
| `conversation:typing` | Client ↔ Server | Broadcasts typing indicator to other participants |
| `message:send` | Client → Server | Alternative way to send a message via socket (also persisted to DB) |

### Deduplication

When a sender sends a message via HTTP, the backend emits `message:receive` to the conversation room. The sender's own socket is also in that room, but the Redux `appendMessage` reducer checks for duplicate `_id` values and ignores the socket event if the message is already in the store from the HTTP response.

---

## 10. API Reference

All API routes are prefixed with `/api`. Protected routes require an `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register a new account |
| POST | `/auth/verify-otp` | No | Verify phone with OTP |
| POST | `/auth/resend-otp` | No | Resend OTP |
| POST | `/auth/login` | No | Login, returns JWT pair |
| POST | `/auth/refresh` | No | Refresh access token |
| POST | `/auth/logout` | No | Revoke refresh token |
| GET | `/auth/me` | Yes | Get current user |
| PUT | `/auth/me` | Yes | Update profile |
| POST | `/auth/change-password` | Yes | Change password |
| POST | `/auth/forgot-password` | No | Request password reset OTP |
| POST | `/auth/reset-password` | No | Reset password |
| POST | `/auth/upload-id` | Yes | Upload ID document |
| POST | `/auth/register-broker` | No | Register broker account |
| POST | `/auth/register-company` | No | Register company account |
| GET | `/auth/settings` | Yes | Get account settings |
| PUT | `/auth/settings` | Yes | Update account settings |

### Listings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/listings` | Yes | Create listing (multipart/form-data) |
| GET | `/listings/my` | Yes | Get own listings |
| GET | `/listings/:id` | No | Get listing detail |
| PUT | `/listings/:id` | Yes (owner) | Update listing |
| DELETE | `/listings/:id` | Yes (owner) | Delete listing |
| PATCH | `/listings/:id/status` | Yes (owner) | Change listing status |
| PATCH | `/listings/:id/feature` | Yes (owner) | Toggle featured |

### Search

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/search` | No | Search listings |
| POST | `/search/saved` | Yes | Save a search |
| GET | `/search/saved` | Yes | Get saved searches |
| DELETE | `/search/saved/:id` | Yes | Delete saved search |

### Messaging

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/conversations` | Yes | Start or get conversation |
| GET | `/conversations` | Yes | List conversations |
| GET | `/conversations/:id/messages` | Yes | Get messages |
| POST | `/conversations/:id/messages` | Yes | Send message |

### Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | Yes | Get notifications |
| PATCH | `/notifications/:id/read` | Yes | Mark as read |

### Premium Subscriptions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/premium-subscriptions/pricing` | No | Get pricing table |
| POST | `/premium-subscriptions/chapa/initialize` | Yes | Start Chapa payment |
| GET | `/premium-subscriptions/chapa/verify` | Yes | Verify Chapa payment |
| POST | `/premium-subscriptions` | Yes | Submit manual receipt |
| GET | `/premium-subscriptions/my` | Yes | Get own subscriptions |
| PATCH | `/premium-subscriptions/:id/activate` | Admin | Activate subscription |
| PATCH | `/premium-subscriptions/:id/reject` | Admin | Reject subscription |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/admin/users` | Admin | List users |
| PATCH | `/admin/users/:id/suspend` | Admin | Suspend user |
| PATCH | `/admin/users/:id/reinstate` | Admin | Reinstate user |
| DELETE | `/admin/users/:id` | Admin | Delete user and all data |
| GET | `/admin/verifications` | Admin | Pending ID verifications |
| PATCH | `/admin/verifications/:id` | Admin | Approve or reject verification |
| GET | `/admin/listings` | Admin | All listings |
| GET | `/admin/listings/pending` | Admin | Pending approval queue |
| PATCH | `/admin/listings/:id/approve` | Admin | Approve listing |
| PATCH | `/admin/listings/:id/reject` | Admin | Reject listing |
| DELETE | `/admin/listings/:id` | Admin | Delete listing |
| GET | `/admin/companies` | Admin | All companies |
| PATCH | `/admin/companies/:id/approve` | Admin | Approve company |
| PATCH | `/admin/companies/:id/reject` | Admin | Reject company |
| GET | `/admin/analytics` | Admin | Analytics data |
| GET | `/admin/analytics/export` | Admin | Download CSV |
| GET | `/admin/categories` | Admin | List categories |
| POST | `/admin/categories` | Admin | Create category |
| PUT | `/admin/categories/:id` | Admin | Edit category |
| PATCH | `/admin/categories/:id/status` | Admin | Toggle active |
| DELETE | `/admin/categories/:id` | Admin | Delete category |

---

## 11. Database Models

### User
Stores account information for all roles. Key fields: `phone` (unique), `fullName`, `passwordHash`, `role`, `isPhoneVerified`, `verificationStatus`, `profilePhoto`, `isActive`, `hasUsedFreeTrial`, `settings` (notifications, privacy, language preferences).

### Listing
The core content model. Stores the listing details plus category-specific sub-documents (e.g., `realEstate`, `automotive`, `professionalJobs`). Key fields: `owner`, `title`, `description`, `categorySlug`, `price`, `location`, `images[]`, `status`, `approvalStatus`, `isFeatured`, `viewCount`, `expiresAt`.

### Category
Defines the 13 listing categories. Each category has a name (English + Amharic), a slug, and a list of required fields with their types and options. Managed by admins.

### PremiumSubscription
Tracks each subscription a user has for a specific category. Key fields: `user`, `categorySlug`, `duration`, `paymentMethod`, `fee`, `status` (pending/active/inactive/expired), `startDate`, `expiryDate`, `txRef` (for Chapa).

### Conversation & Message
Conversations are tied to a specific listing and a pair of participants. Messages belong to a conversation and track read status.

### Notification
In-app notifications with a `type`, `title`, `body`, and optional `relatedId` for navigation. Notifications are delivered in real-time and stored for later retrieval.

### Company
Company profile with registration documents, contact info, logo, and verification status. Linked to an admin user.

### ModerationReport
Records user reports of listings or messages. Admins can action (remove the content) or dismiss reports.

### ActivityLog
Audit trail of user actions (login, listing created, etc.). Auto-deleted after 90 days via a TTL index.

---

## 12. Frontend Pages

| Page | Route | Requires Login | Description |
|---|---|---|---|
| Home | `/` | No | Landing page with category grid and featured listings |
| How It Works | `/how-it-works` | No | Explainer page for buyers and sellers |
| Search | `/search` | No | Browse and filter all listings |
| Listing Detail | `/listings/:id` | No | Full listing view with contact button |
| Company Profile | `/companies/:id` | No | Public company page |
| Register | `/register` | No | Account registration |
| Login | `/login` | No | Login form |
| Verify OTP | `/verify-otp` | No | Phone verification |
| Forgot Password | `/forgot-password` | No | Password reset request |
| Reset Password | `/reset-password` | No | Set new password |
| Register Company | `/register-company` | No | Company registration |
| Profile | `/profile` | Yes | View and edit own profile |
| My Listings | `/my-listings` | Yes | Manage own listings |
| Create Listing | `/listings/create` | Yes | Post a new listing |
| Edit Listing | `/listings/:id/edit` | Yes | Edit an existing listing |
| Messages | `/messages` | Yes | Conversation list |
| Chat | `/messages/:id` | Yes | Real-time chat |
| Notifications | `/notifications` | Yes | All notifications |
| Premium Subscription | `/premium-subscription` | Yes | Subscribe to a category |
| Settings | `/settings` | Yes | Account settings |
| Admin Panel | `/admin-panel` | Admin only | Full admin dashboard |
| Admin Subscriptions | `/admin-subscriptions` | Admin only | Subscription management |

---

## 13. Internationalization

The platform supports two languages: **English** and **Amharic (አማርኛ)**. Users can switch languages from the Settings page or the navbar menu. The preference is saved to their account.

Translation files are located at:
- `frontend/src/i18n/en.json` — English
- `frontend/src/i18n/am.json` — Amharic

The language is detected in this order: user's saved preference → browser language → fallback to English.

To add a new translation key, add it to both JSON files under the appropriate section (e.g., `nav`, `listing`, `messages`, `notifications`).

---

## 14. Admin Panel

The admin panel is accessible at `/admin-panel` for users with the `admin` role. It has the following tabs:

**Overview** — A dashboard showing total users, active users, total listings, active listings, pending items (listings, companies, verifications), and open reports. Clicking a stat card navigates to the relevant tab.

**Users** — Search and manage all user accounts. Admins can suspend (blocks login and revokes sessions), reinstate, or permanently delete a user. Deleting a user removes all their listings, messages, notifications, subscriptions, and company memberships.

**Listings** — View all listings with filters by status and approval status. Admins can approve or reject pending listings (rejection requires a reason), and delete any listing.

**Verifications** — Review ID documents uploaded by users and brokers. Approve or reject with a notification sent to the user.

**Companies** — Review company registration documents. Approve, reject, suspend, or delete companies.

**Subscriptions** — View pending subscription requests with receipt images. Activate or reject each request.

**Reports** — Review user-submitted reports of listings and messages. Action (removes the content) or dismiss.

**Analytics** — Period-based analytics with preset filters (Today, This Week, This Month, This Year, All Time) and a custom date range picker. Shows new users, new listings, new subscriptions, and revenue for the selected period, plus all-time totals, a category breakdown bar chart, and detailed tables of new users, listings, and subscriptions. Export to CSV downloads an authenticated file with all three tables.

**Categories** — Create, edit, toggle active/inactive, and delete listing categories. The slug cannot be changed after creation.

**Settings** — Platform-level settings for the admin account.
