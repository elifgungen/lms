# OMR Pipeline ve İterasyon Notları

Bu doküman, projedeki OMR modülünün uçtan uca akışını, yaşanan temel problemleri, yapılan iyileştirmeleri ve debug/runbook adımlarını özetler. Metin, sahada kullandığımız akışın birebir kaydıdır.

## 1) OMR Pipeline’ı nasıl kurguladık? (uçtan uca akış)
- **Girdi:** Kullanıcı fotoğraf/PDF yükler.
- **Ön işleme:** Gri ton, kontrast/threshold, gürültü azaltma.
- **Sayfa tespiti + perspektif düzeltme (warp):** Formun dış konturu/köşeleri bulunur, sayfa düzleştirilir.
- **Template tabanlı blok ROI:** Cevap bloklarının (col1/col2/col3) yaklaşık konumu template’ten gelir, küçük kaymalar (dx/dy) aramasıyla hizalanır.
- **Bubble adayları:** Contour/circle şekilleri üzerinden işaretlenebilir baloncuklar tespit edilir.
- **Grid/Cluster:** Bulunan daire merkezleriyle 5 şık × 52 satır ızgara çıkarılır.
- **Skorlama:** Her baloncuk için doluluk skoru hesaplanır.
- **Karar:** En iyi şık + ikinci şık farkı, z-score, margin vb. ile; OK / FAINT_OK / RESCUED / NEAR_MISS_OK / LOW_CONF / MULTI / BLANK kararları.
- **Debug overlay:** `preview.png` üstüne renkli halkalar + etiketler.
- **JSON çıktı:** `result.json` (seçimler + debug alanları).

Bu sayede hem UI’da “işaretli görsel” hem de backend’de “ham sonuçlar/istatistikler” üretir hale geldik.

## 2) En büyük problem neydi?
- **Problem A — False Positive:** Basılı sayıları/harfleri işaret sanma (baloncuk içindeki basılı A/B/C/D/E harfleri ve satır numaraları doluluk gibi görünüyor).
- **Problem B — False Negative:** Gerçek işaret var ama BLANK/LOW_CONF dönüyor (ışık, gölge, kamera eğimi, blur yüzünden).
- **Problem C — Üst satırlar (Q1–Q3) kaçıyor:** Blok ROI üstten kayınca grid ilk satırları oturtamıyor.

## 3) Yaptığımız iyileştirmeler (adım adım)
Hedef: ✅ false positive azalt, ✅ blank’leri tahmin etme, ✅ gerçek işaretleri kurtar.

1. **Çember tespiti + doğru ROI hizalama:** Bloklarda dx/dy araması; “candidates / bubbles found / median w,h” logları; bubble sayısı/kalitesi arttı, “no bubble” azaldı.
2. **Skorlama – harfi değil doluluğu ölç:** Annulus (halka) tabanlı skor = (iç doluluk) – (dış ring doluluk); basılı çizgiler/arka plan daha az etkiliyor.
3. **Strict Mode:** MULTI/LOW_CONF durumlarında asla seçim yapma → null bırak; “boş yerleri tahmin etme” sorunu bitti.
4. **Per-block threshold:** block1/block2/block3 için ayrı `mark_th`, `blank_th`, `margin`; ışık farkları dengelendi.
5. **Z-score gating:** Satır bazında `row_median`, `row_std` → `z = (best - median) / std`; z belirli seviyenin üstündeyse OK; harf kaynaklı false positive azaldı.
6. **Rescue pass (near-miss kurtarma):** Borderline satırlarda küçük dx/dy ve r_scale araması; objective = `delta + 0.25*z (+ noise_gap)`; stability/empty-block/noise veto ile frenlenmiş.
7. **TOP_ROWS_DY:** İlk 12 satır için dy offset taraması (-18..+18); en iyi hizalama ile Q1–Q12 okunuyor.
8. **Stability check:** Aynı satırı dy=0, +3, -3 ile skorla; en iyi şık hepsinde aynıysa kabul et, değilse null.
9. **Empty-block detection:** Blokta “strong mark” < 2 ise EMPTY_BLOCK → o bloktan seçim üretme (anti-hallucination).
10. **Noise veto (conditional):** Midpoint/noise skorlarını ölç; best noise’tan ayrışmıyorsa veto et; sinyal çok güçlüyse veto’yu atla.
11. **CLAHE sadece rescue’da:** Kontrastı sadece rescue scoring’de kullan; `score_rescue = max(score_gray, 0.85 * score_clahe)` gibi kontrollü blend.

## 4) Son durumda “neden 2 soru hâlâ kaçıyor” olabilir?
- İşaret çok silik (delta ve z-score eşiklerini geçemiyor).
- Grid hizası mikro kayık (skorlama ring’i tam oturmuyor).
- Noise veto / stability şartları o satırda fazla sert kalıyor (kurtarma denenip veto yemiş olabilir).

Yaklaşım: False positive 0 olacak şekilde koru; eksik kalan 2 soruyu yalnızca “near-miss tier” üzerinden, sıkı koşullarla kurtarmaya çalış.

## 5) Arkadaşına/GPT’ye aktarılacak özet
“Biz OMR’ı deneme-yanılma değil, ölçümlü debug overlay + threshold/stability/rescue mekanizmalarıyla iteratif geliştirdik. En büyük risk printed letters false positive olduğu için strict mode, empty-block, z-score gating ve conditional noise veto ile hallucination’ı kestik; recall için de yalnızca borderline satırlarda dx/dy/r_scale rescue ve top-rows dy alignment yaptık.”

## 6) Çalıştırma ve debug (kısa runbook)
- **Debug aç:** `OMR_DEBUG=1`
- **Çalıştırma örneği:**  
  ```bash
  OMR_DEBUG=1 python3 apps/api/src/services/omr/worker.py \
    <girdi_gorsel_yolu> \
    apps/api/src/services/omr/templates/standard_156.json \
    /tmp/omr_debug_run
  ```
  - Parametre sırası: `<input_file> <template_json> <output_dir>`; kendi komutunda bu sıraya dikkat et.
  - Template: `apps/api/src/services/omr/templates/standard_156.json`
  - Girdi: Foto/PDF tek sayfa
  - Çıktılar: `preview.png` (overlay – yeşil=OK, turuncu=FAINT/RESCUE, sarı=LOW_CONF vb.), `result.json` (cevaplar + debug alanları, tier/veto_reason/refined)

- **API üzerinden deneme:** Web scanner veya `/omr/process` endpoint’i otomatik aynı worker’ı çağırır. `OMR_DEBUG=1` env’i API sürecine geçirerek overlay/json’ı görselleştir.

## 7) Kısa kopyalanabilir özet (arkadaşına atmalık)
- OMR pipeline: upload → warp → template ROI → bubble detection → grid clustering → annulus scoring → per-block thresholds → strict decision → debug overlay + json.
- Büyük sorun: printed letters/numbers false positive; boşları tahmin etme.
- Çözümler: annulus scoring, strict mode (guess yok), per-block thresholds, z-score gating (outlier şartı), stability check (dy perturbation tutarlılığı), empty-block detection (strong mark yoksa tüm blok null), rescue pass (borderline satırlarda dx/dy/r_scale + objective), top-rows dy alignment (Q1–Q12 kurtarma), conditional noise veto (güçlü sinyali veto’dan muaf), CLAHE sadece rescue scoring’de.
- Sonuç: False positive ≈ 0; recall maksimuma yakın; kalan 1–2 kaçan soru “near-miss tier” ile güvenli kurtarma modunda bırakıldı.
