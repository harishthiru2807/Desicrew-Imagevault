# ImageVault — Cloud-Synced Mobile App with Firebase Authentication & Email OTP

A complete, modern, mobile-first image record management application built with **React**, **Vite**, **Firebase**, and **Capacitor**.

---

## 🌟 Key Upgrades & Architecture

- 🔐 **Passwordless Email OTP Authentication**: Cryptographically secure 6-digit one-time verification passcode.
- 📱 **Persistent Device Login**: Enforces `browserLocalPersistence` so sessions survive browser restarts, tab closes, system reboots, and page refreshes.
- ☁️ **Cloud Firestore Storage**: Multi-device real-time sync for record metadata (`users/{uid}/records/{recordId}`) and user profile (`users/{uid}`).
- 🖼️ **Firebase Storage for Images**: High-resolution image uploads with dedicated user storage paths and download URLs.
- 🛡️ **Strict Security Rules**: Zero public access; strict user isolation (`request.auth.uid == userId`) in both Firestore and Storage.
- 📦 **Backward Compatible**: Preserves existing local data and provides one-click migration from browser IndexedDB to Firebase Cloud.
- 🎨 **Mobile & Desktop Layout**: Preserves existing responsive UI, dark/light themes, category filters, and search.

---

## 📋 Prerequisites

- **Node.js** v18 or later (v20+ recommended)
- **npm** v9 or later
- **Firebase CLI**: `npm install -g firebase-tools` (for deploying Cloud Functions and rules)

Verify versions:
```powershell
node --version
npm --version
```

---

## 🚀 Quick Start (Windows PowerShell)

### 1. Install Dependencies
In the root directory:
```powershell
npm install
```

In the functions directory (for Cloud Functions):
```powershell
cd functions
npm install
cd ..
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

Open `.env` and fill in your Firebase Web App credentials (see [Firebase Console Setup](#firebase-console-setup)):
```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-app
VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef

# Backend OTP Service URL (Cloud Function or API)
VITE_OTP_API_URL=https://us-central1-your-app.cloudfunctions.net
```

### 3. Run Development Server
```powershell
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🔥 Firebase Console Setup Guide

Follow these steps in the [Firebase Console](https://console.firebase.google.com/):

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
2. Name your project (e.g. `imagevault-app`) and disable or enable Google Analytics as preferred.

### 2. Register Web App
1. On the Project Overview page, click the **Web icon (`</>`)**.
2. Enter App nickname (e.g., `ImageVault Web`) and click **Register app**.
3. Copy the `firebaseConfig` keys into your `.env` file.

### 3. Enable Authentication
1. Go to **Build → Authentication** and click **Get Started**.
2. Click the **Sign-in method** tab.
3. Enable **Email/Password** (Email link or custom token login will use this provider).

### 4. Enable Cloud Firestore
1. Go to **Build → Firestore Database** and click **Create database**.
2. Choose a location (e.g., `nam5 (us-central)`) and start in **Production mode**.
3. Deploy the included `firestore.rules` (see below).

### 5. Enable Firebase Storage
1. Go to **Build → Storage** and click **Get Started**.
2. Choose a cloud location matching your Firestore database.
3. Deploy the included `storage.rules` (see below).

---

## ⚡ Deploying Security Rules & Cloud Functions

### 1. Login to Firebase CLI
```powershell
firebase login
```

### 2. Associate Project
```powershell
firebase use --add your-project-id
```

### 3. Deploy Security Rules
Deploy the provided `firestore.rules` and `storage.rules`:
```powershell
firebase deploy --only firestore:rules,storage
```

### 4. Configure Backend Email Provider (SMTP)
Set your SMTP credentials for the Cloud Functions:
```powershell
firebase functions:config:set smtp.host="smtp.gmail.com" smtp.port="465" smtp.user="your-email@gmail.com" smtp.pass="your-app-password"
```
*(For Gmail, generate an App Password at https://myaccount.google.com/apppasswords)*

### 5. Deploy Cloud Functions
```powershell
firebase deploy --only functions
```
Once deployed, copy the Function URL (`sendOtp` / `verifyOtp`) and set it as `VITE_OTP_API_URL` in your `.env`.

---

## 🧪 Testing Checklist

| Test Case | Description | Expected Behavior |
| :--- | :--- | :--- |
| **1. Unauthenticated Visit** | Open browser without session | Displays branded Login / Email OTP screen |
| **2. Email Entry & OTP Dispatch** | Enter valid email and click continue | 6-digit OTP code sent, 60s resend timer starts |
| **3. Invalid Email** | Enter malformed address | Shows clear validation error |
| **4. Rate Limiting** | Resend code within 60s | Rejected with countdown timer |
| **5. Expiry Check** | Enter code after 5 minutes | Rejected as expired; prompts new code request |
| **6. Attempt Lockout** | Enter 5 incorrect codes | Request locked; doc deleted to prevent brute-force |
| **7. Successful Login** | Enter correct 6 digits | Profile created/fetched in Firestore; navigates to Dashboard |
| **8. Session Persistence** | Refresh, close/reopen browser, reboot OS | Automatically restores authenticated profile without login screen |
| **9. Multi-Device Independence** | Open incognito / separate browser profile | Requires its own OTP authentication |
| **10. Cloud Records Sync** | Add record with image on Device A | Appears on Device B logged into the same account |
| **11. Local Migration** | Returning user with IndexedDB records | Migration card appears in Profile with one-click transfer |
| **12. Sign Out** | Click Sign Out in Account menu | Invalidates local session and redirects to Login |

---

## 📁 Project Structure

```
├── functions/                     # Firebase Cloud Functions (Backend)
│   ├── index.js                   # Secure OTP generation, hashing, verification & custom token minting
│   └── package.json               # firebase-admin, nodemailer, cors
├── src/
│   ├── components/                # UI components (RecordCard, RecordForm, Navigation, etc.)
│   ├── context/
│   │   ├── AuthContext.jsx        # Persistent device session, onAuthStateChanged, OTP state
│   │   └── AppContext.jsx         # Cloud Firestore & Storage synchronization
│   ├── pages/
│   │   ├── Login.jsx              # Login & 6-digit OTP entry screen
│   │   ├── Profile.jsx            # Account profile, avatar upload, session info, logout
│   │   ├── Dashboard.jsx          # Records overview & search
│   │   ├── RecordDetail.jsx       # View high-res cloud image & metadata
│   │   ├── Categories.jsx         # Category management
│   │   └── Settings.jsx           # Preferences, storage stats, JSON export
│   ├── services/
│   │   ├── firebase.js            # Firebase App, Auth with browserLocalPersistence, Firestore, Storage
│   │   ├── cloudStorage.js        # Firestore & Storage operations
│   │   ├── otpService.js          # API client for backend OTP service
│   │   ├── browserStorage.js      # IndexedDB fallback & migration source
│   │   └── database.js            # Storage facade
│   └── styles/                    # Design tokens & responsive styles
├── firestore.rules                # Strict Firestore Security Rules
├── storage.rules                  # Strict Storage Security Rules
├── .env.example                   # Environment configuration template
└── README.md                      # Documentation
```
