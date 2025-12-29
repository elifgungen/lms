# Final Project Monorepo

Online sınav & LMS admin paneli + backend API (JWT auth, RBAC, audit log, rate limit)

**Stack:**
- Frontend: Next.js (`apps/web`)
- Backend: Express (`apps/api`)
- Database: PostgreSQL
- Cache: Redis
- Object Storage: MinIO
- ORM: Prisma

## Hızlı Başlangıç

### 1. İlk Kurulum

**Adım 1: Environment dosyasını oluştur**
```bash
# .env.example dosyası varsa kopyalayın, yoksa manuel oluşturun
# Root dizinde .env dosyası oluşturun ve aşağıdaki değişkenleri ekleyin:
```

**Adım 2: Bağımlılıkları yükle**
```bash
npm install
```

**Adım 3: Docker servislerini başlat**
```bash
# Root dizinden çalıştırın (otomatik olarak .env dosyasını okur)
docker compose -f infra/docker-compose.yml up -d

# Servislerin hazır olmasını bekleyin (yaklaşık 10-15 saniye)
docker compose -f infra/docker-compose.yml ps
```

**Adım 4: Veritabanı migration'larını çalıştır**
```bash
# Root dizinden
npm run prisma:generate
npm run prisma:migrate

# Migration başarılı olursa, varsayılan roller otomatik oluşturulur
```

**Adım 5: Geliştirme sunucularını başlat**
```bash
# Root dizinden - hem web hem API'yi birlikte başlatır
npm run dev
```

### 2. Geliştirme Modunda Çalıştırma

```bash
# Root dizinden - hem web hem API'yi birlikte başlatır
npm run dev
```

Bu komut:
- `apps/web` - Next.js dev server (http://localhost:3000)
- `apps/api` - Express API server (http://localhost:4000)

**Önemli Notlar:**
- Aynı anda **sadece bir** `npm run dev` instance'ı çalıştırın
- Eğer zaten çalışıyorsa, önce `Ctrl+C` ile kapatın
- Aksi halde `.next/dev/lock` hatası veya port conflict alırsınız
- Port 3000 veya 4000 kullanımda ise, önce mevcut process'i sonlandırın

### 3. Tek Tek Çalıştırma

```bash
# Sadece frontend
npm run dev:web

# Sadece backend
npm run dev:api
```

## Detaylı Kurulum

### Environment Değişkenleri

`.env` dosyası root dizinde olmalı ve şu değişkenleri içermelidir:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=dbname

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_BUCKET=uploads

# JWT
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# API
PORT=4000
```

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

**Not:** Docker compose otomatik olarak root dizindeki `.env` dosyasını okur. Eğer `.env` dosyası yoksa, varsayılan değerler kullanılır (minioadmin/minioadmin, uploads bucket).

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
│   └── api/          # Express backend
├── infra/
│   └── docker-compose.yml
├── docs/
│   └── openapi.yml
└── .env              # Environment variables (root)
```

## Sorun Giderme

## Sorun Giderme

### Docker compose env uyarıları
- Docker compose root dizinden çalıştırılmalıdır: `docker compose -f infra/docker-compose.yml up -d`
- `.env` dosyası otomatik olarak okunur (`env_file: ../.env`)
- Eğer `.env` yoksa, varsayılan değerler kullanılır (minioadmin/minioadmin, uploads bucket)

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
