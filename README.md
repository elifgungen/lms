# Final Project Monorepo

Online sınav & LMS uygulaması: Web (Next.js) + API (Express) + opsiyonel Desktop (Electron) ve Mobile (Expo).

**Stack**
- Frontend: Next.js (`apps/web`)
- Backend: Express (`apps/api`)
- Database: PostgreSQL
- Cache: Redis
- Object Storage: MinIO
- ORM: Prisma

## Hızlı Başlangıç

> Gereksinimler: `REQUIREMENTS.md`

### 1) İlk Kurulum

**Adım 1: `.env` oluştur**
```bash
cp .env.example .env
```

**Adım 2: Bağımlılıkları yükle**
```bash
npm install
```

**Adım 3: Docker servislerini başlat**
```bash
docker compose -f infra/docker-compose.yml up -d

docker compose -f infra/docker-compose.yml ps
```

**Adım 4: Prisma migration**
```bash
npm run prisma:generate
npm run prisma:migrate
```

**Adım 5: Geliştirme sunucularını başlat**
```bash
npm run dev
```

Bu komut:
- Web: http://localhost:3000
- API: http://localhost:4000

### 2) Tek tek çalıştırma

```bash
# Sadece frontend
npm run dev:web

# Sadece backend
npm run dev:api
```

## Detaylı Kurulum

### Environment Değişkenleri

Root dizindeki `.env` dosyası için örnek: `.env.example`.

> Not: `.env` dosyası repo içinde **commit edilmez** (`.gitignore` ile dışarıda).

## Opsiyonel Uygulamalar

- Desktop (Electron): `apps/desktop`
- Mobile (Expo): `apps/mobile`

### Docker Compose

Docker compose dosyası `infra/docker-compose.yml` içindedir ve root dizinden çalıştırılmalıdır:

```bash
# Başlat
docker compose -f infra/docker-compose.yml up -d

# Durdur
docker compose -f infra/docker-compose.yml down

# Logları görüntüle
docker compose -f infra/docker-compose.yml logs -f
```

**Not:** Compose servisleri `env_file: ../.env` ile root `.env` dosyasını okur.

### Prisma Komutları

Prisma komutları root dizinden veya `apps/api` dizininden çalıştırılabilir. Otomatik olarak root dizindeki `.env` dosyasını okur:

**Root dizinden:**
```bash
# Prisma Client'ı generate et
npm run prisma:generate

# Migration oluştur ve uygula
npm run prisma:migrate

# Prisma Studio (veritabanı GUI)
npm run prisma:studio
```

**apps/api dizininden:**
```bash
cd apps/api

# Prisma Client'ı generate et
npm run prisma:generate

# Migration oluştur ve uygula
npm run prisma:migrate

# Production migration (deploy)
npm run prisma:migrate:deploy

# Prisma Studio (veritabanı GUI)
npm run prisma:studio
```

### API Endpoints

- `GET /health` - Health check
- `GET /me` - Current user (401 if not authenticated)
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

### Frontend Modülleri

- `/login` - Giriş sayfası
- `/app/courses` - Dersler
- `/app/exams` - Sınavlar
- `/app/question-bank` - Soru Bankası
- `/app/questions/new` - Yeni Soru
- `/app/gradebook` - Not Defteri
- `/app/reports` - Raporlar

**Dil Desteği:** Frontend varsayılan olarak Türkçe açılır. Dil değiştirme özelliği mevcuttur (TR/EN).

## OMR Modülü
- Pipeline, sorunlar ve debug runbook: `docs/OMR_PIPELINE.md`
- Python/OpenCV kurulum ve doğrulama adımları: `docs/OMR_SETUP.md`

## Hızlı Smoke Test

Kurulum sonrası sistemin çalıştığını doğrulamak için:

**1. API Health Check:**
```bash
curl http://localhost:4000/health
# Beklenen: {"status":"ok"}
```

**2. Web Sayfası:**
- Tarayıcıda http://localhost:3000 açın
- Otomatik olarak `/app` sayfasına yönlendirilmelisiniz
- Token yoksa `/login` sayfasına yönlendirilmelisiniz

**3. Login Akışı:**
- `/login` sayfasında herhangi bir email/password ile giriş yapın (mock auth)
- Başarılı login sonrası `/app` sayfasına yönlendirilmelisiniz
- Varsayılan dil Türkçe (TR) olmalı

**4. Dashboard Sayfaları:**
- `/app/courses` - Dersler listesi
- `/app/exams` - Sınavlar listesi
- `/app/question-bank` - Soru bankası

## Test

```bash
cd apps/api
npm test
```

## Proje Yapısı

```
final-project/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/          # Express backend
│   ├── desktop/      # Electron (opsiyonel)
│   └── mobile/       # Expo (opsiyonel)
├── packages/         # paylaşılan TS paketleri
├── infra/
│   └── docker-compose.yml
└── docs/
```

## Sorun Giderme

### Docker compose env uyarıları
- Docker compose root dizinden çalıştırılmalıdır: `docker compose -f infra/docker-compose.yml up -d`
- Root `.env` dosyası `env_file: ../.env` ile okunur

### Prisma DATABASE_URL bulunamıyor
- Prisma komutları root dizinden çalıştırılmalıdır: `npm run prisma:generate` ve `npm run prisma:migrate`
- Scriptler otomatik olarak root dizindeki `.env` dosyasını okur
- `apps/api/src/index.js` de otomatik olarak root `.env` dosyasını yükler

### Veritabanı bağlantı hatası
- API başlatılırken veritabanı hazır değilse, otomatik retry yapılır (10 deneme, 2 saniye aralık)
- Docker compose servislerinin hazır olduğundan emin olun: `docker compose -f infra/docker-compose.yml ps`
- PostgreSQL'in health check'ini kontrol edin

### Next.js lock hatası / Port conflict
- Aynı anda **sadece bir** `npm run dev` instance'ı çalıştırın
- Önce mevcut process'i `Ctrl+C` ile kapatın
- Port 3000 veya 4000 kullanımda ise:
  ```bash
  # macOS/Linux
  lsof -ti:3000 | xargs kill -9
  lsof -ti:4000 | xargs kill -9
  ```

### Login sayfası İngilizce açılıyor
- Varsayılan dil Türkçe'dir (TR)
- Eğer localStorage'da daha önce "en" seçilmişse, tarayıcı console'dan temizleyin:
  ```javascript
  localStorage.removeItem('locale')
  ```
- Veya dil değiştirme butonunu kullanın

### Token varsa login sayfasına gidemiyorum
- Login sayfası otomatik olarak token kontrolü yapar
- Token varsa `/app` sayfasına yönlendirilirsiniz
- Bu normal bir davranıştır
