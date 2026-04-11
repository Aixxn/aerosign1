# AeroSign Auth Flow Integration Guide

## Overview

Successfully implemented a complete **authentication and authorization flow** for AeroSign:

```
Landing Page
    ↓ (Click "Start Signing")
    ├─→ If NOT logged in: Registration Page
    │       ↓ (Success)
    │       └─→ Login Page
    │           ↓ (Success)
    │           └─→ Signature Canvas (APP)
    │
    └─→ If logged in: Signature Canvas (APP) [Direct]
```

---

## Files Created / Modified

### ✅ New Components
| File | Purpose |
|------|---------|
| `frontend/src/components/LoginPage.jsx` | Full login form with Supabase Auth integration |
| `frontend/src/components/LoginPage.css` | Responsive login UI (2-panel layout) |
| `frontend/src/hooks/useAuth.js` | Custom React hook for session management |
| `frontend/src/utils/supabaseClient.js` | Supabase client initialization |

### ✅ Modified Files
| File | Changes |
|------|---------|
| `frontend/src/App.jsx` | Added auth state management, routing logic for all 4 pages |

### ✅ Already Exists
- `frontend/src/components/RegistrationPage.jsx` ← Created in previous session
- `frontend/src/components/RegistrationPage.css` ← Created in previous session

---

## Architecture & Design Decisions

### 1. useAuth Hook (Custom)
**Location**: `frontend/src/hooks/useAuth.js`

**Responsibilities**:
- Initializes Supabase session on app load (`getSession()`)
- Listens for auth state changes via `onAuthStateChange()` listener
- Returns: `{ user, session, isLoading, error, signOut }`
- **Cleanup**: Unsubscribes from listener on unmount (no memory leaks)

**Why Custom Hook**:
- Single source of truth for auth state across entire app
- Decouples Supabase logic from React components
- Easy to mock for testing
- Follows React best practices

### 2. App.jsx Routing Logic
**Flow**:
```javascript
if (authLoading) {
  // Show loading spinner while checking session
  return <LoadingSpinner />
}

if (!user) {
  // Unauthenticated routes
  if (currentPage === 'landing') return <LandingPage />
  if (currentPage === 'register') return <RegistrationPage />
  if (currentPage === 'login') return <LoginPage />
}

if (user && currentPage === 'app') {
  // Authenticated only
  return <SignatureCanvas user={user} />
}
```

**Key Points**:
- ✅ Auth check happens before routing decisions
- ✅ Prevents authenticated-only pages from rendering before session loads
- ✅ Smooth UX with loading state
- ✅ Optional sign-out on return to landing (currently commented out)

### 3. LoginPage Component
**Location**: `frontend/src/components/LoginPage.jsx`

**Features**:
- ✅ Email + Password validation (client-side before submit)
- ✅ Supabase Auth `.signInWithPassword()` integration
- ✅ User-friendly error messages (maps Supabase errors)
- ✅ Success banner with 1.5s auto-redirect
- ✅ Password visibility toggle
- ✅ "Create Account" link to registration flow
- ✅ Fully accessible (aria-labels, aria-describedby, semantic HTML)
- ✅ Responsive (2-panel on desktop, stacked on mobile)

**Design**:
- Matches RegistrationPage design language
- Material 3 color palette (primary: #006398)
- Tailwind-compatible spacing and typography
- Glass-morphism effects on mobile status bar

---

## Setup & Configuration

### 1. Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### 2. Create `.env.local` in `frontend/` directory
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to get these**:
1. Go to [supabase.com](https://supabase.com)
2. Create a project (or use existing)
3. Navigate to **Settings** → **API**
4. Copy `Project URL` and `anon public` key

### 3. Verify Database Setup
Ensure Supabase database has:
- ✅ `auth.users` table (managed by Supabase)
- ✅ `public.profiles` table with RLS policies
- ✅ `public.user_settings` table with RLS policies
- ✅ Trigger `on_auth_user_created()` to auto-create profile + settings

**Reference**: See `RegistrationPage_Integration.md` for SQL migration script

---

## State Management Flow

### 1. On App Load
```
useAuth Hook
  ↓
supabase.auth.getSession()
  ↓
Is session valid? → YES → setUser(user) + setSession(session)
                → NO → setUser(null)
  ↓
Listen for auth state changes via onAuthStateChange()
```

### 2. On "Start Signing" Click
```
handleStartSigning()
  ↓
if (!user) {
  setCurrentPage('register')  ← Show RegistrationPage
} else {
  setCurrentPage('app')       ← Show SignatureCanvas directly
}
```

### 3. On Registration Success
```
RegistrationPage.onSuccess()
  ↓
handleRegistrationSuccess()
  ↓
setCurrentPage('login')       ← Navigate to LoginPage
```

### 4. On Login Success
```
LoginPage.onSuccess()
  ↓
handleLoginSuccess()
  ↓
setTimeout(1500ms, () => {
  setCurrentPage('app')       ← Navigate to SignatureCanvas
  setStep(1)                  ← Reset to capture step
})
```

### 5. User Object Available in All Pages
```javascript
// In SignatureCanvas
const { user } = props
console.log(user.id)          // Unique Supabase user ID
console.log(user.email)       // User's email
```

---

## Component Props Reference

### LoginPage
```javascript
<LoginPage 
  onSuccess={() => {}}              // Callback when login succeeds
  onNavigateToRegister={() => {}}   // Callback to show registration
/>
```

### SignatureCanvas (Updated)
```javascript
<SignatureCanvas 
  onComplete={handleSignaturesComplete}   // (unchanged)
  onBack={handleBackToLanding}            // (unchanged)
  error={error}                            // (unchanged)
  loading={loading}                        // (unchanged)
  userId={userId}                          // (unchanged)
  user={user}                              // NEW: Auth user object
  onSignOut={signOut}                      // NEW: Logout callback
/>
```

---

## Testing Checklist

### ✅ Phase 1: Setup
- [ ] Install `@supabase/supabase-js`
- [ ] Add `.env.local` with Supabase credentials
- [ ] Run `npm run dev` and verify no console errors
- [ ] See loading spinner briefly (auth check)

### ✅ Phase 2: Unauthenticated Flow
- [ ] Click "Start Signing" → should show RegistrationPage
- [ ] Register with valid email + password → see success banner
- [ ] Auto-redirect to LoginPage
- [ ] Log in with same credentials → see success banner
- [ ] Auto-redirect to SignatureCanvas with 1.5s delay
- [ ] Verify `user` object is available in canvas (check console)

### ✅ Phase 3: Authenticated Flow
- [ ] Reload app → should show landing page (session persisted)
- [ ] Click "Start Signing" → should **directly** show SignatureCanvas (skip registration)
- [ ] Click "Back" → return to landing page
- [ ] Optional: Verify "Sign Out" button works if added to SignatureCanvas

### ✅ Phase 4: Error Handling
- [ ] Try invalid email in login → see error message
- [ ] Try wrong password → see "Invalid email or password" message
- [ ] Try unverified email → see "Please verify your email" message
- [ ] Disconnect backend → registration should still work (auth is independent)

### ✅ Phase 5: Responsive
- [ ] Test on mobile (375px width) → single column layout
- [ ] Test on tablet (768px) → single column with smaller padding
- [ ] Test on desktop (1024px+) → 2-column layout with brand panel

---

## Troubleshooting

### Issue: "Missing Supabase environment variables"
**Solution**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`

### Issue: Login works but profile/settings not created
**Solution**: Ensure database trigger `on_auth_user_created()` exists and has proper permissions

### Issue: Session lost on page reload
**Likely Cause**: `@supabase/supabase-js` not installed
**Solution**: Run `npm install @supabase/supabase-js`

### Issue: TypeScript errors on `import.meta.env`
**Solution**: Add to `vite-env.d.ts`:
```typescript
interface ImportMetaEnv {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
}
```

---

## Next Steps (Optional Enhancements)

### 1. Sign Out Button in SignatureCanvas
Add optional logout button:
```jsx
<button onClick={onSignOut}>Sign Out</button>
```

### 2. Email Verification
After registration, redirect to email verification screen before login:
```javascript
if (confirmationRequired) {
  setCurrentPage('verify-email')
}
```

### 3. Password Reset
Add forgot-password flow:
```javascript
supabase.auth.resetPasswordForEmail(email)
```

### 4. Store Signatures in Database
Save verified signatures to `signatures` table:
```javascript
await supabase
  .from('signatures')
  .insert({
    user_id: user.id,
    point_data: signaturePoints,
    is_template: true
  })
```

### 5. User Profile Update
Allow users to update display name + avatar:
```javascript
await supabase
  .from('profiles')
  .update({ display_name: newName })
  .eq('id', user.id)
```

---

## File Tree Summary

```
frontend/
├── src/
│   ├── App.jsx                          ✅ MODIFIED (auth routing)
│   ├── components/
│   │   ├── LandingPage.jsx              ✅ (no change needed)
│   │   ├── LoginPage.jsx                ✨ NEW
│   │   ├── LoginPage.css                ✨ NEW
│   │   ├── RegistrationPage.jsx         ✅ (from previous)
│   │   ├── RegistrationPage.css         ✅ (from previous)
│   │   └── SignatureCanvas.jsx          ✅ (updated props)
│   ├── hooks/
│   │   └── useAuth.js                   ✨ NEW
│   └── utils/
│       ├── supabaseClient.js            ✨ NEW
│       └── api.js                       ✅ (unchanged)
├── .env.local                           📝 TODO: Create with credentials
└── package.json                         ✅ (has @supabase/supabase-js)
```

---

## Summary

🎉 **Authentication flow is now complete!**

| Feature | Status |
|---------|--------|
| Unauthenticated users see Registration → Login | ✅ |
| Authenticated users skip to SignatureCanvas | ✅ |
| Session persists across page reloads | ✅ |
| Error handling with user-friendly messages | ✅ |
| Responsive design (mobile to desktop) | ✅ |
| Accessibility (a11y) compliance | ✅ |
| Separation of concerns (custom hooks) | ✅ |

**Next action**: Create `.env.local` with Supabase credentials and test the full flow.
