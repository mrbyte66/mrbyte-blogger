# AI iş akışı

Issue, PR ve test yorumları kısa Türkçe yazılır. GitHub kayıtları ortak hafızadır.
Her agent önce `AGENTS.md`, bu belge ve ilgili uygulama talimatlarını okur.

## Roller

- **Koordinatör:** işleri analiz eder, tekrarları kontrol eder, kapsam/öncelik/bağımlılık belirler ve merge sırasını yönetir.
- **Kodlayıcı:** tek issueyu ayrı branch/worktree içinde yapar, test eder ve PR açar.
- **Testçi:** kabul ölçütlerini bağımsız kontrol eder; uygulama dosyalarını değiştirmez.

Codex ve Claude bu rollerden herhangi birini alabilir. Claude genellikle kodlayıcıdır.
Rol ve işi alan agent issue yorumuna yazılır. Aynı işin kodlayıcısı bağımsız testçi olamaz.

## Issue açarken

Açık issue ve PR’larda tekrar, bağımlılık ve ortak dosya kontrolü yapılır.
Doğrulanmamış şüphe hata olarak kaydedilmez. Şu bilgiler boş bırakılmaz:

- Kısa başlık, problem/hedef ve test edilebilir tamamlanma ölçütleri.
- Tür etiketi: `bug`, `enhancement` veya `task`.
- Alan etiketi: `area:frontend`, `area:backend`, `area:database`, `area:docs` veya `area:infra`.
- Öncelik etiketi: `priority:P0` (acil canlı), `priority:P1` (yüksek), `priority:P2` (normal), `priority:P3` (düşük).
- Büyüklük: 1 / 2 / 3 / 5 / 8 puan. 1 çok küçük, 2 küçük, 3 orta, 5 büyük, 8 bölünmesi gereken iş. Bunlar süre garantisi değildir; kodlama, test ve belirsizliği birlikte ifade eder.
- GitHub Project, mevcut durum ve sorumlu GitHub hesabı. Agent adı/rolü ayrıca yorumda tutulur; agentlar GitHub kullanıcısı gibi atanmaz.
- Bağımlılıklar, etkilenen dosya/modüller, paralel çalışma uygunluğu. Yoksa “Yok” yazılır.

Project’te puan/öncelik alanları varsa doldurulur; yoksa issue açıklaması ve etiketler aynı bilgiyi taşır.
Yeni iş mevcut planı etkiliyorsa bağlı işlerin kapsamı, puanı ve sırası da güncellenir.

## Bağımlılık ve çakışma

- Önkoşul işi varsa native `blocked by` ilişkisi kurulur; özellik erişilemiyorsa açıklamada `Önkoşul: #N` yazılır ve karşı işte bağlantı verilir.
- Bağımlı issue önceden açılabilir; önkoşul `Done` olmadan **başlatılmaz**. `blocked` etiketiyle `Todo`da bekler. Önkoşul bitince etiket kaldırılır.
- Büyük işi alt issuelara böl; parent/child bağı gerçek iş parçalanması için kullanılır. Sadece ilgili işler birbirine bağlantı verir.
- İşi almadan önce In Progress/In Test işleri ve açık PR’ları tekrar kontrol et. Aynı dosyayı veya API/DB sözleşmesini değiştiren işleri sırayla yap; bağımlılık kaydet.
- Ayrı dosyalar yeterli değildir: ortak davranış/sözleşme de çakışabilir. Bağımsızlık kanıtlanmadıysa paralel başlatma.
- Her branch ayrı worktree kullanır. Merge tek tek yapılır; sıradaki branch güncel main’e alınır ve ilgili testler tekrarlanır.
- Yeni acil iş geldiğinde etkilenen aktif işleri koordinatör yeniden sıralar. Agentlar habersiz ortak dosya değiştirmez.

## Branch standardı

Her iş güncel `origin/main` üzerinden başlar. Küçük harf, ASCII ve tire kullanılır.

| Tür | Örnek |
| --- | --- |
| Özellik | `feature/12-yayin-planlama` |
| Hata | `bugfix/13-avatar-boyutu` |
| Acil canlı hatası | `hotfix/14-giris-hatasi` |
| Bakım/doküman | `chore/15-is-akisi` |

Sayı issue numarasıdır. Kalıcı dev/hotfix branchi kullanılmaz.
PR başlığı kısa Türkçe, açıklaması `Closes #N` içerir. PR numarasını GitHub verir.

## Durum ve test

`Todo → In Progress → In Test → Done`

1. Koordinatör metadata ve önkoşulları kontrol eder. Kodlayıcı işi alıp In Progress yapar.
2. Kodlayıcı kontrol sonuçlarıyla PR açar. Bağlı PR Project otomasyonuyla In Test yapar; gerçekleşmediyse koordinatör düzeltir.
3. Bağımsız agent veya kullanıcı ölçütleri test eder ve issueya kısa sonuç yazar:
   - **PASS:** test edilen commit, kontroller ve sonuç. Koordinatör PR’ı merge eder; sonra Done doğrulanır.
   - **FAIL:** adımlar, hatalar ve beklenen sonuç. PR’a değişiklik talebi verilir; issue In Progress yapılır. Kodlayıcı düzeltir ve yeniden test ister.
4. Testten sonra kod değişirse önceki PASS geçersizdir. Son commit yeniden bağımsız test edilir.

Issue yorumları tek başına durumu değiştirmez; otomasyonun sonucu görünür biçimde doğrulanır.
Bağımsız PASS olmadan merge veya Done yok. CI bu akışın şartı değildir.

## Tetikleme

Şu anda agentlar bir sohbet başlatılarak issue/PR bağlantısıyla çalıştırılır.
Project durum otomasyonu agent başlatmaz. Günlük tarama ve otomatik agent tetikleme henüz kurulmadı.
Bilgisayar kapalıyken veya hesap limiti doluyken çalışma devam ediyormuş gibi rapor verilmez.

## Devir promptları

**Kodlayıcı:**
> #ISSUE işini yap. AGENTS.md, docs/ai-workflow.md ve ilgili uygulama talimatlarını oku. Metadata, önkoşul ve çakışmaları kontrol et. Güncel main’den standart isimli ayrı branch/worktree aç. Kapsamı uygula, testleri raporla ve issueya bağlı Türkçe PR aç. Merge yapma. Sorun/bağımlılık varsa issueya yazıp durumunu güncelle.

**Testçi:**
> #ISSUE ve #PR için bağımsız test yap. Son commiti ve tüm kabul ölçütlerini kontrol et; uygulama dosyalarını değiştirme. Issueya kısa Türkçe PASS/FAIL ve kanıt yaz. FAIL ise hataları belirtip In Progress yap; PASS ise koordinatöre merge için bildir. Merge yapma.
