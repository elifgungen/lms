#!/bin/bash
# Web Application Verification Script
# Run this after starting API on :4000 and Web on :3000

set -e

API_URL="http://localhost:4000"
PASS=0
FAIL=0

echo "============================================"
echo "   LMS Web Application Verification"
echo "============================================"
echo ""

# Function to check result
check() {
    if [ "$1" = "true" ]; then
        echo "✓ PASS: $2"
        PASS=$((PASS + 1))
    else
        echo "✗ FAIL: $2"
        FAIL=$((FAIL + 1))
    fi
}

# 1. Check API health
echo "1. API Health Check"
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")
check "[ $API_HEALTH = '200' ]" "API responds on /health"

# 2. Student Login
echo ""
echo "2. Student Login"
LOGIN_RESP=$(curl -s -X POST "$API_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"student@example.com","password":"Password123!"}')
TOKEN=$(echo "$LOGIN_RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
check "[ -n '$TOKEN' ]" "Student login returns token"

# 3. Get Exams
echo ""
echo "3. Exam List"
EXAMS=$(curl -s "$API_URL/exams" -H "Authorization: Bearer $TOKEN")
EXAM_COUNT=$(echo "$EXAMS" | grep -o '"id"' | wc -l)
check "[ $EXAM_COUNT -ge 2 ]" "At least 2 exams exist"

# 4. Demo Exam (non-SEB)
echo ""
echo "4. Demo Exam Start"
DEMO_EXAM=$(echo "$EXAMS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
START_RESP=$(curl -s -X POST "$API_URL/exams/$DEMO_EXAM/start" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
ATTEMPT_ID=$(echo "$START_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
check "[ -n '$ATTEMPT_ID' ]" "Demo exam starts successfully"

# 5. Get Questions
echo ""
echo "5. Exam Questions"
QUESTIONS=$(curl -s "$API_URL/exams/$DEMO_EXAM/questions" -H "Authorization: Bearer $TOKEN")
Q_COUNT=$(echo "$QUESTIONS" | grep -o '"id"' | wc -l)
check "[ $Q_COUNT -ge 1 ]" "Questions endpoint returns questions"

# 6. Submit Attempt
echo ""
echo "6. Submit Exam"
SUBMIT_RESP=$(curl -s -X POST "$API_URL/attempts/$ATTEMPT_ID/submit" \
    -H "Authorization: Bearer $TOKEN")
STATUS=$(echo "$SUBMIT_RESP" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
check "[ '$STATUS' = 'submitted' ]" "Exam submission works"

# 7. SEB Exam Blocked
echo ""
echo "7. SEB Exam Protection"
SEB_EXAM=$(echo "$EXAMS" | grep -B5 '"sebEnabled":true' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
SEB_START=$(curl -s -X POST "$API_URL/exams/$SEB_EXAM/start" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
SEB_ERROR=$(echo "$SEB_START" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
check "[ '$SEB_ERROR' = 'SEB_REQUIRED' ]" "SEB exam blocked without headers"

# 8. SEB Exam with Headers
echo ""
echo "8. SEB Exam with Headers"
SEB_KEY=$(curl -s "$API_URL/exams/$SEB_EXAM" -H "Authorization: Bearer $TOKEN" | grep -o '"sebBrowserKey":"[^"]*"' | cut -d'"' -f4)
SEB_WITH_HEADERS=$(curl -s -X POST "$API_URL/exams/$SEB_EXAM/start" \
    -H "Authorization: Bearer $TOKEN" \
    -H "User-Agent: Mozilla/5.0 SEB/3.0" \
    -H "X-SafeExamBrowser-RequestHash: $SEB_KEY" \
    -H "Content-Type: application/json")
SEB_ATTEMPT=$(echo "$SEB_WITH_HEADERS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
check "[ -n '$SEB_ATTEMPT' ]" "SEB exam starts with correct headers"

# 9. SEB Config Download
echo ""
echo "9. SEB Config Download"
SEB_CONFIG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/exams/$SEB_EXAM/seb-config" -H "Authorization: Bearer $TOKEN")
check "[ $SEB_CONFIG_STATUS = '200' ]" "SEB config downloads"

# 10. Assignments List
echo ""
echo "10. Assignments Endpoint"
ASSIGNMENTS=$(curl -s "$API_URL/assignments" -H "Authorization: Bearer $TOKEN")
ASSIGNMENT_ID=$(echo "$ASSIGNMENTS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
check "[ -n '$ASSIGNMENT_ID' ]" "Assignments endpoint returns data"

# 11. Instructor Login
echo ""
echo "11. Instructor Login"
INST_RESP=$(curl -s -X POST "$API_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"instructor@example.com","password":"Password123!"}')
INST_TOKEN=$(echo "$INST_RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
check "[ -n '$INST_TOKEN' ]" "Instructor login returns token"

# 12. Admin Login
echo ""
echo "12. Admin Login"
ADMIN_RESP=$(curl -s -X POST "$API_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@example.com","password":"Password123!"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
check "[ -n '$ADMIN_TOKEN' ]" "Admin login returns token"

# 13. Guest Login
echo ""
echo "13. Guest Login"
GUEST_RESP=$(curl -s -X POST "$API_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"guest@example.com","password":"Password123!"}')
GUEST_TOKEN=$(echo "$GUEST_RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
check "[ -n '$GUEST_TOKEN' ]" "Guest login returns token"

# 14. Assistant Login
echo ""
echo "14. Assistant Login"
ASSIST_RESP=$(curl -s -X POST "$API_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d '{"email":"assistant@example.com","password":"Password123!"}')
ASSIST_TOKEN=$(echo "$ASSIST_RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
check "[ -n '$ASSIST_TOKEN' ]" "Assistant login returns token"

# 15. Courses Endpoint (verify enrollment visibility)
echo ""
echo "15. Courses Endpoint"
COURSES=$(curl -s "$API_URL/courses" -H "Authorization: Bearer $TOKEN")
COURSE_COUNT=$(echo "$COURSES" | grep -o '"id"' | wc -l)
check "[ $COURSE_COUNT -ge 1 ]" "At least 1 course exists"

# Summary
echo ""
echo "============================================"
echo "   Summary: $PASS passed, $FAIL failed"
echo "============================================"

if [ $FAIL -gt 0 ]; then
    exit 1
fi
