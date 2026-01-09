# Security Notes (Public)

Bu doküman, repodaki uygulama katmanı güvenlik pratiklerini **puanlamasız** ve **deployment’dan bağımsız** şekilde özetler.

> Not: TLS/HSTS/CSP gibi bazı başlıklar deploy (reverse proxy / CDN) tarafında tamamlanır; bu repo sadece uygulama seviyesini kapsar.

## Uygulama Seviyesi Kontroller

### Kimlik Doğrulama
- Password hashing: `bcrypt` (`apps/api/src/routes/auth.js`)
- JWT doğrulama middleware: `apps/api/src/middleware/auth.js`
- Email verification + reset password akışı: `apps/api/src/routes/auth.js`
- 2FA (TOTP) akışı: `apps/api/src/routes/auth.js`, `apps/api/src/routes/twoFactor.js`

### Yetkilendirme
- Role check middleware: `apps/api/src/middleware/rbac.js`

### Input Validation
- Zod tabanlı request validation: `apps/api/src/middleware/validate.js` (route’larda `validate(schema)` kullanımı)

### Rate Limiting
- Global rate limit middleware: `apps/api/src/middleware/rateLimit.js` (uygulama girişinde `apps/api/src/app.js`)

### Audit Logging
- Kritik aksiyonlar için DB audit log: `apps/api/src/middleware/auditLog.js`

## Hızlı Doğrulama

```bash
./scripts/security-test.sh
```
