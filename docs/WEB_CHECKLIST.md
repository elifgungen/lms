# Web Verification Checklist

This document provides step-by-step verification instructions for core web app features (UI, roles, PWA, SEB).

## Prerequisites

```bash
cd lms

# 1. Start Docker infrastructure
docker compose -f infra/docker-compose.yml up -d

# 2. Run database migration
cd apps/api
DATABASE_URL="postgresql://lms_user:lms_password@localhost:5432/lms_db" npx prisma migrate dev

# 3. Seed database
DATABASE_URL="postgresql://lms_user:lms_password@localhost:5432/lms_db" npx prisma db seed

# 4. Start API (Terminal 1)
npm run dev

# 5. Start Web (Terminal 2)
cd ../..
rm -rf apps/web/.next
npm --workspace apps/web run dev
```

---

## 5.1 General Requirements

### Responsive Design
| Step | Action | Expected |
|------|--------|----------|
| 1 | Open http://localhost:3000 in Chrome | Page loads with white background |
| 2 | Use DevTools (F12) > Toggle Device Toolbar | Layout adjusts properly |
| 3 | Test 320px, 768px, 1280px widths | Sidebar collapses, content reflows |

### SPA Architecture (Next.js App Router)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Login and navigate between pages | No full page reloads |
| 2 | Watch Network tab during navigation | Only XHR/fetch requests, no document fetches |
| 3 | Use browser back/forward | State preserved, no flicker |

### PWA Support
| Step | Action | Expected |
|------|--------|----------|
| 1 | Open DevTools > Application tab | Manifest shown with icons |
| 2 | Check Service Workers panel | SW registered (sw.js) |
| 3 | Go offline (DevTools Network: Offline) | Offline page displays |
| 4 | Go online and reload | App works normally |

### Browser Compatibility
Test login and navigation on:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari (Mac)
- [ ] Edge

### Performance (Lighthouse)
```bash
# Build production
cd apps/web
npm run build
npm run start

# Open Chrome, navigate to http://localhost:3000
# DevTools > Lighthouse > Generate Report
# Target: 90+ Lighthouse Performance
```

### Multi-language (i18n)
| Step | Action | Expected |
|------|--------|----------|
| 1 | Click language dropdown in header | EN/TR options shown |
| 2 | Select "Türkçe" | All labels change to Turkish |
| 3 | Refresh page | Turkish persists (localStorage) |
| 4 | Select "English" | Labels change to English |

### Theme Support
| Step | Action | Expected |
|------|--------|----------|
| 1 | Fresh load | White/light background default |
| 2 | Click sun/moon icon in header | Theme toggles to dark |
| 3 | Refresh page | Dark theme persists |
| 4 | Click again | Returns to light theme |

---

## 5 Role Verification (5 Logins)

### Test Credentials (Password: Password123!)

| Role | Email | Expected Landing | Sidebar Items |
|------|-------|------------------|---------------|
| Admin | admin@example.com | /admin | Dashboard, Courses, Exams, Question Bank, Gradebook, Reports, Users, Settings |
| Instructor | instructor@example.com | /instructor | Dashboard, Courses, Exams, Question Bank, Gradebook, Reports, Settings |
| Assistant | assistant@example.com | /instructor | Same as instructor |
| Student | student@example.com | /student | Dashboard, Courses, Exams, Gradebook, Settings |
| Guest | guest@example.com | /guest | Dashboard, Courses, Exams, Settings (read-only) |

### Role Restrictions

| Test | Action | Expected |
|------|--------|----------|
| Student can't access /admin | Login as student, type http://localhost:3000/admin | Redirected to /student |
| Student can't access /instructor | Login as student, type http://localhost:3000/instructor | Redirected to /student |
| Student no create buttons | Go to /student/courses | No "Create Course" button |
| Student no question bank | Check sidebar | No "Question Bank" link |
| Guest read-only | Login as guest, go to /guest | Info banner "Read-Only Mode" |
| Guest no start exam | View exam list | No "Start" buttons |

---

## SEB Integration Verification

### Student SEB Flow

| Step | Action | Expected |
|------|--------|----------|
| 1 | Login as student@example.com | Lands on /student |
| 2 | Go to Exams | List shows "SEB Required" badge for secure exam |
| 3 | Click secure exam | Detail page with red alert banner |
| 4 | Read banner | Shows Turkish/English SEB message |
| 5 | Click "Download SEB Config" | .seb file downloads |
| 6 | Click "Open with SEB" | Opens sebs:// URL (or shows instructions) |

### SEB API Verification

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@example.com","password":"Password123!"}' | jq -r '.accessToken')

# Get SEB exam ID
EXAM_ID=$(curl -s http://localhost:4000/exams -H "Authorization: Bearer $TOKEN" | jq -r '.data[] | select(.sebEnabled == true) | .id' | head -1)

# Try start from normal browser (should fail)
curl -s -X POST "http://localhost:4000/exams/$EXAM_ID/start" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"error":"SEB_REQUIRED",...}

# Simulate SEB browser (should succeed)
SEB_KEY=$(curl -s "http://localhost:4000/exams/$EXAM_ID" -H "Authorization: Bearer $TOKEN" | jq -r '.data.sebBrowserKey')
curl -s -X POST "http://localhost:4000/exams/$EXAM_ID/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "User-Agent: Mozilla/5.0 SEB/3.0" \
  -H "X-SafeExamBrowser-RequestHash: $SEB_KEY"
# Expected: {"data":{"id":"...","status":"in_progress",...}}
```

### Instructor SEB Form

| Step | Action | Expected |
|------|--------|----------|
| 1 | Login as instructor@example.com | Lands on /instructor |
| 2 | Go to Exams > Create Exam | Form with Security section |
| 3 | Toggle "SEB Enabled" | Additional fields appear |
| 4 | Fill quit password and URL rules | Fields accept input |
| 5 | Save exam | Created successfully |
| 6 | View exam detail | Shows SEB badge |

---

## Implementation Summary

### Files Changed/Created

| Category | Files |
|----------|-------|
| Theme | `layout.tsx` (defaultTheme="light") |
| PWA | `manifest.json`, `sw.js`, `icons/`, `offline/page.tsx`, `ServiceWorkerRegistration.tsx` |
| i18n | `tr.json`, `en.json` (20+ new keys) |
| Guest | `guest/layout.tsx`, `guest/page.tsx` |
| SEB UI | `student/exams/[id]/page.tsx` (enhanced), `instructor/exams/new/page.tsx` |
| Services | `exams.ts` (SEB field mapping) |

### Coverage Summary

| Area | Status | Location |
|-------------|--------|----------|
| Responsive UI | ✅ | Tailwind + grid layouts |
| SPA navigation | ✅ | Next.js App Router |
| PWA | ✅ | manifest.json, sw.js |
| Browser compat | ✅ | Standard React/CSS |
| Performance | ⚠️ | Run Lighthouse on prod build |
| i18n | ✅ | LanguageContext + JSON files |
| Theme | ✅ | next-themes, defaultTheme=light |
| Course mgmt | ⚠️ | Basic CRUD exists; WYSIWYG/drag-drop partial |
| Assessment | ⚠️ | Question types exist; rubric/random partial |
| SEB Integration | ✅ | Full flow implemented |
| Role lanes | ✅ | 5 roles with proper restrictions |
