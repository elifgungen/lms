# SEB Check (mac/win)

Minimal steps to verify Safe Exam Browser flow matches the contract.

## Flow
1) In a normal browser, log in as student. Open the SEB-required exam detail page `/student/exams/<id>`.
2) Download config: click “Download SEB Config (Mac/Windows)”. File should be `exam_<id>_<platform>.seb` with Content-Type `application/seb`.
3) Double-click the `.seb` file. SEB launches to the LMS login page if not already logged in.
4) Log in inside SEB; you should be returned to the exam detail page.
5) Click “Start Exam”. The API should accept SEB headers and create an attempt; questions load at `/student/exams/<id>/take?attemptId=...`.
6) Quit SEB using the menu/quit button (no password required). Exit must be possible without reboot.

## Diagnostics
- Inspect config inputs without downloading:
  `GET /exams/:id/seb-config-info` → shows `startUrlPreview`, `platformDefault`, `configVersion`.
- Expected start URL: `WEB_BASE_URL/login?redirect=/student/exams/<id>` (default base `http://localhost:3000`).
- Headers SEB accepts: `User-Agent` containing `SEB` and one of the hash headers (`X-SafeExamBrowser-RequestHash`, `X-SafeExamBrowser-Request-Hash`, `X-SafeExamBrowser-ConfigKeyHash`, `X-SafeExamBrowser-BrowserExamKey`, `SafeExamBrowser-RequestHash`).

## Quick lint for plist
```
EXAM_ID=...
TOKEN=... # student token
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:4000/exams/$EXAM_ID/seb-config" -o /tmp/config.seb
plutil -lint /tmp/config.seb
python - <<'PY'
import plistlib
plistlib.load(open("/tmp/config.seb","rb"))
print("plist OK")
PY
```

If SEB says “invalid/wrong config”, re-download and ensure XML is valid and start URL matches the exam detail page.
