# AeroSign - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Setup Environment (2 min)
```bash
cd frontend
touch .env.local
```

Edit `.env.local` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 2: Install Dependencies (2 min)
```bash
npm install
```

### Step 3: Run Development Server (1 min)
```bash
npm run dev
```

Then open: **http://localhost:5173**

---

## 🧪 Test the Full Flow

### Unauthenticated User
1. Click **"Start Signing"** on landing page
2. Should see **Registration Form** (not signature canvas)
3. Enter email, password, name, accept terms
4. Click **"Sign Up"** → Success banner → Auto-redirect to **Login**
5. Enter email & password → Success banner → Auto-redirect to **Signature Canvas**

### Authenticated User
1. Reload the page → Should still be logged in
2. Click **"Start Signing"** → Should **skip** registration, go directly to **Signature Canvas**

---

## 📂 Key Files

| File | Purpose |
|------|---------|
| `App.jsx` | Main routing & auth state |
| `components/LoginPage.jsx` | Login form component |
| `components/RegistrationPage.jsx` | Registration form component |
| `hooks/useAuth.js` | Auth state management hook |
| `utils/supabaseClient.js` | Supabase client |

---

## 🔑 How It Works

```
Landing Page (always visible)
   ↓ Click "Start Signing"
   ├─→ If user logged in: Go to Signature Canvas
   └─→ If NOT logged in: Go to Registration
        ↓ After registration success
        └─→ Go to Login
             ↓ After login success
             └─→ Go to Signature Canvas
```

---

## 🐛 Troubleshooting

### Issue: "Missing Supabase environment variables"
→ Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`

### Issue: Login not working
→ Make sure your Supabase project is active and has auth enabled

### Issue: Session lost on reload
→ Ensure `@supabase/supabase-js` is installed: `npm install @supabase/supabase-js`

### Issue: SignatureCanvas not loading after login
→ Check browser console for errors, verify Supabase auth response

---

## 📚 More Documentation

- **AuthFlow_Integration_Complete.md** - Detailed setup & architecture
- **PROGRESS.md** - Development progress summary
- **RegistrationPage_Integration.md** - Registration form details

---

## ✅ Features Implemented

- [x] User registration with Supabase Auth
- [x] User login with email/password
- [x] Session persistence (survives page reload)
- [x] Auth-gated signature canvas access
- [x] Responsive design (mobile to desktop)
- [x] Full accessibility compliance
- [x] Error handling with user-friendly messages
- [x] Loading states & success feedback

---

## 🎯 Next Steps After Setup

1. Test the full registration → login → canvas flow
2. Verify session persists on page reload
3. Add sign-out button to SignatureCanvas (optional)
4. Implement signature storage in database (future)
5. Add user profile view (future)

---

**Status**: ✅ Ready to use  
**Last Updated**: 2026-04-12  
**Git Branch**: velocity-lstm
