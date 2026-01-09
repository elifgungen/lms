# Safe Exam Browser (macOS) Flow

This doc covers the real SEB flow on macOS, from downloading the config to finishing the exam, plus debugging tips for invalid configs.

## What changed
- `.seb` now points to `WEB_BASE_URL` (default `http://localhost:3000`) at `/login?redirect=/student/exams/<examId>` so users log in first, then land on the exam detail page.
- Start page is the existing exam detail (no new flow). Users must log in inside SEB; if no session exists they are redirected to `/login` and then back.
- Server validates SEB headers with multiple official header names (`X-SafeExamBrowser-RequestHash`, `Request-Hash`, `ConfigKeyHash`, `BrowserExamKey`) and allows hash-less starts only when `NODE_ENV=development` and no `sebBrowserKey` is set.
- Quit is enabled in the SEB config so users can exit SEB without rebooting (no quit password required).

## End-to-end test on macOS SEB
1) Run API on `http://localhost:4000` and web on `http://localhost:3000` (or set `WEB_BASE_URL`/`API_BASE_URL`).
2) In a normal browser, log in as the student and open the exam detail page. Download the config via the SEB button.
3) The download should be named `Exam_<examId>.seb` with Content-Type `application/seb`.
4) Double-click the `.seb` file. SEB should open to the LMS login (if not logged in) and then the exam detail page.
5) If there is no active session, you will be redirected to `/login` inside SEB and then returned to the exam detail page after login. The page shows exam info, rules, and the “Sınava Başla” button.
6) Verify the page shows exam info, rules, and the “Sınava Başla” button. In a normal browser, the button stays disabled and the API returns 403 `SEB_REQUIRED`/`SEB_INVALID_KEY`.
7) Click “Sınava Başla”. On success you are redirected to `/student/exams/<examId>/take?attemptId=...` and can answer/submit normally.

## Header validation rules
- User-Agent must contain `SEB` (case-insensitive).
- Hash headers accepted (case-insensitive keys): `X-SafeExamBrowser-RequestHash`, `X-SafeExamBrowser-ConfigKeyHash`, `X-SafeExamBrowser-BrowserExamKey`, `X-SafeExamBrowser-ConfigKeyHashSha256`, `X-SafeExamBrowser-ConfigKeyHashBase64`.
- The value is matched against the stored `sebBrowserKey` with tolerant variants (hex/base64/SHA256).
- Dev fallback: append `?devSeb=1` to the start URL while running with `NODE_ENV=development` to bypass the hash requirement (still requires SEB UA). This is added automatically when generating configs in dev.

## Troubleshooting “Invalid SEB configuration”
- Validate the plist structure locally:
  - `curl -s -H "Authorization: Bearer $TOKEN" http://localhost:4000/exams/$EXAM_ID/seb-config -o /tmp/config.seb`
  - `plutil -lint /tmp/config.seb` (macOS) or `python - <<'PY'\nimport plistlib,sys\nplistlib.load(open('/tmp/config.seb','rb'))\nprint('OK')\nPY`
- Check the start URL inside the plist (should be `.../login?redirect=/student/exams/<id>`).
- Ensure the SEB app actually sends the SafeExamBrowser headers (use a proxy or server logs). If headers are missing, regenerate the config and reopen it.
- If the start page shows “SEB algılanmadı”, you are not inside SEB—open the `.seb` file instead of navigating manually.

## Quick curl sanity for plist well-formedness
```
API=http://localhost:4000
EXAM_ID=...    # SEB-enabled exam id
TOKEN=...      # student access token
curl -s -H "Authorization: Bearer $TOKEN" "$API/exams/$EXAM_ID/seb-config" -o /tmp/config.seb
plutil -lint /tmp/config.seb    # macOS lint
python - <<'PY'
import plistlib
plistlib.load(open('/tmp/config.seb','rb'))
print('plist OK')
PY
grep -A1 startURL /tmp/config.seb
```

If `plutil` or `plistlib` fails, re-download the config to ensure XML escaping is intact. Invalid XML (often due to unescaped `&` in URLs) will produce “Invalid SEB configuration” inside the SEB app.
