# Web Exam Flow Walkthrough

## Quick Start (macOS)

```bash
cd /Users/elifgungen/final-project

# 1. Start infrastructure
docker compose -f infra/docker-compose.yml up -d

# 2. Apply migrations & seed
cd apps/api
DATABASE_URL="postgresql://lms_user:lms_password@localhost:5432/lms_db" npx prisma migrate dev
DATABASE_URL="postgresql://lms_user:lms_password@localhost:5432/lms_db" npx prisma db seed

# 3. Start API (Terminal 1)
npm run dev

# 4. Start Web (Terminal 2)
cd ../..
rm -rf apps/web/.next
npm --workspace apps/web run dev
```

---

## 5-Role Login Matrix

| Role | Email | Password | Landing | Sidebar Items |
|------|-------|----------|---------|---------------|
| Admin | admin@example.com | Password123! | /admin | Dashboard, Courses, Exams, Question Bank, Gradebook, Reports, Users, Settings |
| Instructor | instructor@example.com | Password123! | /instructor | Dashboard, Courses, Exams, Question Bank, Gradebook, Reports, Settings |
| Assistant | assistant@example.com | Password123! | /instructor | Same as instructor |
| Student | student@example.com | Password123! | /student | Dashboard, Courses, Exams, Gradebook, Settings |
| Guest | guest@example.com | Password123! | /guest | Dashboard, Courses, Exams, Settings (read-only) |

### Role Restrictions

| Role | Can Create Course | Can Create Exam | Can Manage Questions | Can Start Exam | Can Submit Exam |
|------|-------------------|-----------------|----------------------|----------------|-----------------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Instructor | ✅ | ✅ | ✅ | ✅ | ✅ |
| Assistant | ❌ | ❌ | ✅ | ✅ | ✅ |
| Student | ❌ | ❌ | ❌ | ✅ | ✅ |
| Guest | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Instructor Flow: Create Exam with Questions

### 1. Create Question Bank
```
1. Login as instructor@example.com
2. Go to Question Bank (sidebar)
3. Click "Create Bank"
4. Name: "Web Dev Questions"
5. Save
```

### 2. Add Questions
```
1. Click on the bank you created
2. Click "Create Question"
3. Add questions:
   - MCQ: "What is Next.js?" → Options: CSS framework, React framework, Database
   - True/False: "TypeScript is a superset of JavaScript"
   - Short Text: "What does CSS stand for?"
4. Save each question
```

### 3. Create Exam
```
1. Go to Exams (sidebar)
2. Click "Create Exam"
3. Fill form:
   - Title: "Midterm Exam"
   - Duration: 60 mins
   - SEB Enabled: Toggle ON (if secure)
4. Save
```

### 4. Attach Questions (via Question Bank)
The exam automatically uses questions from connected question banks.

---

## Student Flow: Take Regular Exam (Demo Exam)

### Step-by-Step UI
```
1. Open http://localhost:3000/login
2. Enter: student@example.com / Password123!
3. Click "Sign In" → Lands on /student
4. Click "Exams" in sidebar
5. Click "Demo Exam" row
6. Click "Start Exam" button
7. → Redirected to /student/exams/{id}/take?attemptId={attemptId}
8. Answer each question using radio buttons or text input
9. Click "Next" to move between questions
10. Click "Submit Exam" on last question
11. → See success message "Exam Submitted!"
12. Click "Back to Exams" to return
```

### curl Verification
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"student@example.com","password":"Password123!"}' | jq -r '.accessToken')

# Get exam list
curl -s http://localhost:4000/exams -H "Authorization: Bearer $TOKEN" | jq '.data[] | {id, title, sebEnabled}'

# Get regular exam ID
EXAM_ID=$(curl -s http://localhost:4000/exams -H "Authorization: Bearer $TOKEN" | jq -r '.data[] | select(.sebEnabled != true) | .id' | head -1)

# Start exam
ATTEMPT_ID=$(curl -s -X POST "http://localhost:4000/exams/$EXAM_ID/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq -r '.data.id')

echo "Attempt ID: $ATTEMPT_ID"
echo "Take URL: http://localhost:3000/student/exams/$EXAM_ID/take?attemptId=$ATTEMPT_ID"

# Get questions
curl -s "http://localhost:4000/exams/$EXAM_ID/questions" -H "Authorization: Bearer $TOKEN" | jq '.data'

# Submit answer
QUESTION_ID=$(curl -s "http://localhost:4000/exams/$EXAM_ID/questions" -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')
curl -s -X POST "http://localhost:4000/attempts/$ATTEMPT_ID/answer" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"questionId\":\"$QUESTION_ID\",\"answer\":{\"value\":\"A React framework\"}}"

# Submit exam
curl -s -X POST "http://localhost:4000/attempts/$ATTEMPT_ID/submit" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Student Flow: Take SEB Exam (Secure Proctored Exam)

### Step-by-Step UI
```
1. Login as student@example.com
2. Click "Exams" in sidebar
3. Click "Secure Proctored Exam"
4. → See red alert banner:
   "Bu sınav Safe Exam Browser (SEB) gerektirir. Normal tarayıcıdan başlatılamaz."
5. Click "Download SEB Configuration (.seb)"
   → .seb file downloads
6. Double-click the .seb file
   → SEB launches with the exam page
7. In SEB: Click "Start Exam"
   → Works because SEB sends correct headers
8. Answer questions and submit
```

### curl: SEB Blocked Without Headers
```bash
# Get SEB exam ID
SEB_EXAM_ID=$(curl -s http://localhost:4000/exams -H "Authorization: Bearer $TOKEN" | jq -r '.data[] | select(.sebEnabled == true) | .id' | head -1)

# Try start from normal browser (should fail with 403)
curl -s -X POST "http://localhost:4000/exams/$SEB_EXAM_ID/start" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"error":"SEB_REQUIRED","message":"This exam requires Safe Exam Browser..."}
```

### curl: SEB Allowed With Headers
```bash
# Get browser key
SEB_KEY=$(curl -s "http://localhost:4000/exams/$SEB_EXAM_ID" -H "Authorization: Bearer $TOKEN" | jq -r '.data.sebBrowserKey')

# Start with SEB headers (should succeed with 201)
curl -s -X POST "http://localhost:4000/exams/$SEB_EXAM_ID/start" \
  -H "Authorization: Bearer $TOKEN" \
  -H "User-Agent: Mozilla/5.0 SEB/3.0" \
  -H "X-SafeExamBrowser-RequestHash: $SEB_KEY"
# Expected: {"data":{"id":"...","status":"in_progress"}}
```

---

## Canonical Take URL Format

```
/student/exams/[examId]/take?attemptId=[attemptId]
```

Example:
```
/student/exams/abc123-uuid/take?attemptId=xyz789-uuid
```

---

## Files Changed

| File | Change |
|------|--------|
| `apps/api/src/routes/exams.js` | Added GET /exams/:id/questions endpoint |
| `apps/api/prisma/seed.js` | Added 5 questions, made idempotent |
| `apps/web/src/app/student/exams/[id]/take/page.tsx` | NEW: Complete exam take page |

---

## Verification Checklist

- [ ] Docker containers running (postgres, redis, minio)
- [ ] API starts without errors on :4000
- [ ] Web starts without errors on :3000
- [ ] Login as student → lands on /student
- [ ] Click Demo Exam → see detail page
- [ ] Click Start Exam → redirected to /take (no 404)
- [ ] Questions render (see MCQ, TF, short text)
- [ ] Can select answers and navigate
- [ ] Submit → success message shown
- [ ] Login as student → click SEB exam
- [ ] See red SEB required banner
- [ ] Download .seb file works
- [ ] curl SEB start without headers → 403 SEB_REQUIRED
- [ ] curl SEB start with headers → 201 success
- [ ] Login as guest → no Start buttons
- [ ] Login as instructor → can create exam with SEB toggle
