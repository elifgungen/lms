# Web App Run & Fix Guide

## Problem
Web app fails to start or shows blank/error screen due to build caching or missing environment variables.

## Local Fix Checklist

Run these commands in order to reset and start the web application cleanly:

```bash
# 1. Clean build cache (CRITICAL)
rm -rf apps/web/.next

# 2. Install dependencies guarantees
npm install

# 3. Ensure API is running (in a separate terminal)
# cd apps/api && npm run dev

# 4. Start Web App
# Default runs on http://localhost:3000
npm --workspace apps/web run dev
```

## Environment Setup
Create/update `apps/web/.env.local` with:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Verification
1. Visit [http://localhost:3000/login](http://localhost:3000/login) -> Should see Login Form.
2. Login as `student@example.com` / `Password123!` -> Should redirect to `/student` dashboard.
3. Dashboard should show "My Courses" and "Exams".

## Files Validated
- `apps/web/src/app/(auth)/login/page.tsx`: Verified login flow.
- `apps/web/src/lib/services/auth.ts`: Verified API client usage.
- `apps/web/src/components/ui/`: Confirmed `progress.tsx` and `radio-group.tsx` exist (fixed in previous steps).
