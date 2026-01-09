# Web Application Walkthrough

## Quick Start (macOS)

```bash
# Terminal 1: Start Infrastructure
cd /Users/elifgungen/final-project
docker compose -f infra/docker-compose.yml up -d

# Terminal 2: Setup Database & Start API
cd /Users/elifgungen/final-project/apps/api
DATABASE_URL="postgresql://lms_user:lms_password@localhost:5432/lms_db" npx prisma migrate dev
DATABASE_URL="postgresql://lms_user:lms_password@localhost:5432/lms_db" npx prisma db seed
npm run dev

# Terminal 3: Start Web
cd /Users/elifgungen/final-project
rm -rf apps/web/.next
npm --workspace apps/web run dev
```

---

## 6-Role Matrix

| Role | Email | Landing | Sidebar Items | Restrictions |
|------|-------|---------|---------------|--------------|
| super_admin | (create manually) | /admin | All | None |
| admin | admin@example.com | /admin | Courses, Exams, Question Bank, Gradebook, Reports, Users | None |
| instructor | instructor@example.com | /instructor | Courses, Exams, Question Bank, Gradebook, Reports | No user management |
| assistant | assistant@example.com | /instructor | Courses, Exams, Question Bank, Gradebook | No publishing, no user management |
| student | student@example.com | /student | Courses, Exams, Gradebook | Read-only courses, no question bank/reports |
| guest | guest@example.com | /guest | Courses, Exams | Read-only, no exam start |

**Password for all**: `Password123!`

---

## Role Verification Tests

### Student
```
1. Login as student@example.com
2. ✓ Redirects to /student
3. ✓ Sidebar shows: Dashboard, Courses, Exams, Gradebook
4. ✗ Sidebar does NOT show: Question Bank, Reports, Users
5. ✓ Cannot create courses/exams (no buttons visible)
6. ✓ Typing /admin in URL → redirects to /student
7. ✓ Typing /instructor in URL → redirects to /student
```

### Guest
```
1. Login as guest@example.com
2. ✓ Redirects to /guest
3. ✓ Shows read-only banner
4. ✗ No Start Exam buttons
5. ✗ No Create buttons
```

### Instructor
```
1. Login as instructor@example.com
2. ✓ Redirects to /instructor
3. ✓ Can create courses, exams, questions
4. ✓ Can enable SEB on exam creation
5. ✗ Cannot access /admin (redirects to /instructor)
```

### Admin
```
1. Login as admin@example.com
2. ✓ Redirects to /admin
3. ✓ Full access to all features
4. ✓ Can manage users (when implemented)
```

---

## Exam Flow Tests

### Regular Exam (Demo Exam)

```
1. Login as student@example.com
2. Click "Exams" in sidebar
3. Click "Demo Exam" row
4. Click "Start Exam" button
5. → Redirects to /student/exams/{id}/take?attemptId={attemptId}
6. Questions display (MCQ, TF, Short Text)
7. Select answers and click Next
8. On last question, click "Submit Exam"
9. → Success message displayed
10. Click "Back to Exams"
```

**curl verification:**
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@example.com","password":"Password123!"}' | jq -r '.accessToken')

# Get Demo Exam ID
EXAM=$(curl -s http://localhost:4000/exams -H "Authorization: Bearer $TOKEN")
EXAM_ID=$(echo $EXAM | jq -r '.data[] | select(.sebEnabled != true) | .id' | head -1)
echo "Demo Exam ID: $EXAM_ID"

# Start attempt
ATTEMPT=$(curl -s -X POST "http://localhost:4000/exams/$EXAM_ID/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")
ATTEMPT_ID=$(echo $ATTEMPT | jq -r '.data.id')
echo "Attempt ID: $ATTEMPT_ID"

# Get questions
curl -s "http://localhost:4000/exams/$EXAM_ID/questions" -H "Authorization: Bearer $TOKEN" | jq

# Submit exam
curl -s -X POST "http://localhost:4000/attempts/$ATTEMPT_ID/submit" \
  -H "Authorization: Bearer $TOKEN"
```

### SEB Exam (Secure Proctored Exam)

**In normal browser:**
```
1. Login as student@example.com
2. Click "Exams" → "Secure Proctored Exam"
3. ✓ Red banner shows: "Bu sınav Safe Exam Browser (SEB) gerektirir..."
4. ✓ "Download SEB Config" button visible
5. ✓ Click Start → blocked with SEB_REQUIRED error
```

**curl verification (blocked):**
```bash
# Get SEB Exam ID
SEB_EXAM_ID=$(echo $EXAM | jq -r '.data[] | select(.sebEnabled == true) | .id' | head -1)

# Try start without SEB headers (should fail)
curl -s -X POST "http://localhost:4000/exams/$SEB_EXAM_ID/start" \
  -H "Authorization: Bearer $TOKEN" | jq
# Expected: {"error":"SEB_REQUIRED",...}
```

**curl verification (allowed with SEB headers):**
```bash
# Get SEB browser key
SEB_KEY=$(curl -s "http://localhost:4000/exams/$SEB_EXAM_ID" -H "Authorization: Bearer $TOKEN" | jq -r '.data.sebBrowserKey')

# Start with SEB headers (should succeed)
curl -s -X POST "http://localhost:4000/exams/$SEB_EXAM_ID/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "User-Agent: Mozilla/5.0 SEB/3.0" \
  -H "X-SafeExamBrowser-RequestHash: $SEB_KEY" | jq
# Expected: {"data":{"id":"...","status":"in_progress"}}
```

---

## Seeded Data Summary

| Item | Count | Details |
|------|-------|---------|
| Users | 5 | admin, instructor, assistant, student, guest |
| Courses | 1 | Demo Course (student enrolled) |
| Exams | 2 | Demo Exam (regular), Secure Proctored Exam (SEB) |
| Question Bank | 1 | Default Question Bank |
| Questions | 5 | 2x MCQ, 2x True/False, 1x Short Text |
| Assignments | 1 | Demo Assignment (due in 7 days) |

---

## Assignment Flow (Ödevler)

### Instructor Flow

```
1. Login as instructor@example.com
2. Navigate to /instructor/assignments
3. Click "Yeni Ödev" button
4. Select course, fill title + description + due date
5. Click "Ödev Oluştur" → redirects to list
6. Click assignment row → view submissions
7. When students submit: click "İndir" to download
8. Click "Notla" → enter score 0-100 + feedback
9. Click "Kaydet"
```

### Student Flow

```
1. Login as student@example.com
2. Navigate to /student/assignments
3. See available assignments with due dates
4. Click assignment row → view details
5. Select file and click upload
6. ✓ "Dosyanız başarıyla gönderildi" message
7. After grading: score + feedback displayed
```

**curl verification (as instructor):**
```bash
# Create assignment
INST_TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"instructor@example.com","password":"Password123!"}' | jq -r '.accessToken')

COURSE_ID=$(curl -s http://localhost:4000/courses -H "Authorization: Bearer $INST_TOKEN" | jq -r '.data[0].id')

curl -X POST http://localhost:4000/assignments \
  -H "Authorization: Bearer $INST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\":\"$COURSE_ID\",\"title\":\"Test Assignment\",\"description\":\"Submit PDF\",\"allowedFileTypes\":\"pdf\"}"
```

---

## SEB Full Flow

### Prerequisites
- Install Safe Exam Browser from https://safeexambrowser.org/download
- Ensure API and Web are running

### Step-by-Step

```
1. In NORMAL browser: Login as student@example.com
2. Click Exams → "Secure Proctored Exam"
3. ✓ See red banner: "Bu sınav Safe Exam Browser (SEB) gerektirir..."
4. Click "Download SEB Config (Mac)" or "(Windows)"
5. File downloads as exam_xxx_mac.seb
6. Double-click .seb file → SEB opens
7. ✓ Login page appears inside SEB
8. Login with student@example.com / Password123!
9. ✓ Redirects to exam detail page inside SEB
10. ✓ Green banner: "SEB Aktif - Safe Exam Browser içindesiniz"
11. Click "Start Exam" → works inside SEB
12. Complete exam normally
13. ✓ To quit SEB: Use Quit button or menu (no password needed)
```

### Config Details
The SEB config file includes:
- `allowQuit: true` - User can quit
- `allowUserToQuit: true` - Quit option enabled
- `showQuitButton: true` - Button visible
- `showMenuBar: true` - Menu accessible

---

## Verification Checklist

- [ ] Docker containers running
- [ ] API starts on :4000 without errors
- [ ] Web starts on :3000 without errors
- [ ] Login as student → lands on /student
- [ ] Student sidebar hides Question Bank and Reports
- [ ] Student cannot access /admin (redirects)
- [ ] Demo Exam → Start → take page loads (no 404)
- [ ] Questions render in take page
- [ ] Submit exam shows success message
- [ ] SEB exam shows red banner
- [ ] SEB config downloads as .seb file
- [ ] curl SEB start without headers → 403
- [ ] curl SEB start with headers → 201
- [ ] Guest login → read-only mode
- [ ] Instructor can create exam with SEB toggle
- [ ] Instructor can create assignment
- [ ] Student can submit assignment file
- [ ] Instructor can grade submission
- [ ] Student sees grade + feedback
