# OMR Çalıştırma ve Doğrulama Kılavuzu

Hocanın “mobil optik okuyucu backend’e doğru okumayı gönderecek” şartını karşılamak için API tarafındaki Python/OpenCV worker’ının kurulması ve doğrulanması gerekir. Aşağıdaki adımlar mevcut backend ile birebir çalışır.

## 1) Python bağımlılıklarını kur

```bash
cd apps/api/src/services/omr
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Gerekli paketler: `opencv-python-headless`, `numpy`, `PyMuPDF`.

## 2) Worker’ı elle test et (gerçek optik form)

Elinizdeki taranmış optik formu kullanarak Python worker’ı doğrulayın:

```bash
OMR_DEBUG=1 python3 worker.py \
  /path/to/optik-form.jpg \
  templates/standard_156.json \
  /tmp/omr_out
```

- `/tmp/omr_out/result.json` → okunmuş cevaplar ve istatistikler  
- `/tmp/omr_out/preview.png` → köşe tespiti ve işaret overlay’i  
Sonuçlar beklendiği gibi ise backend tarafı “doğru okuma”yı sağlıyor demektir.

## 3) API ile birlikte çalıştır

API’yi çalıştırırken aynı ortamda Python ve bağımlılıkları hazır olmalı. Express tarafındaki `/omr/process` endpoint’i bu worker’ı çağırır; gerçek cihazdan veya emulatordan fotoğraf göndererek test edebilirsiniz.

## 4) Mobil demo planı (iOS simulator kısıtı)

- iOS simulator’da kamera olmadığı için canlı çekim yapılamaz; galeriye optik form dosyasını ekleyip uygulamadaki “Optik Okuyucu” ekranından yükleyerek `/omr/process`’e gönderin.  
- Android cihaz/emulator kamera desteğiyle canlı çekim yapılabilir (en net demo).  
- Demo anlatımı: “Mobil uygulama OMR fotoğrafını backend’e gönderiyor, Python worker doğru okuyor; `result.json` ve `preview.png` ile doğrulama yaptık.”

## 5) Production notları

- Python ortamı API sunucusuyla aynı makinede olmalı veya worker’ı çağırabileceğiniz şekilde paketleyin.  
- Kamera açık demo için mutlaka gerçek Android cihazı yanınızda bulundurun; iOS simulator’da sadece dosya yükleme anlatısı kullanın.  
- MinIO/Redis/PostgreSQL Docker Compose ile hazır; OMR için ek bir servis gerekmiyor, yalnızca Python bağımlılıkları şart.
