# AI iş akışı

Issue, PR ve test yorumları kısa Türkçe yazılır. GitHub kayıtları ortak hafızadır.
Her agent önce `AGENTS.md`, bu belge ve ilgili uygulama talimatlarını okur.

## Roller

- **Koordinatör:** işleri analiz eder, tekrarları kontrol eder, kapsam/öncelik/bağımlılık ve merge sırasını belirler. Merge yapmaz.
- **Kodlayıcı:** tek issueyu ayrı branch/worktree içinde yapar, test eder, PR açar; CI yeşil olunca issueyu In Test yapıp testçiye devreder. Merge yapmaz.
- **Testçi:** kabul ölçütlerini bağımsız kontrol eder; uygulama dosyalarını değiştirmez. PASS verdiğinde PR’ı merge eder ve issueyu Done yapar.

Codex ve Claude bu rollerden herhangi birini alabilir; kalıcı rol veya sağlayıcı önceliği yoktur.
Rol ve işi alan agent issue yorumuna yazılır. Aynı işin kodlayıcısı bağımsız testçi olamaz.

## Issue açarken

Açık issue ve PR’larda tekrar, bağımlılık ve ortak dosya kontrolü yapılır.
Doğrulanmamış şüphe hata olarak kaydedilmez. Şu bilgiler boş bırakılmaz:

- Kısa başlık, problem/hedef ve test edilebilir tamamlanma ölçütleri.
- Tür etiketi: `bug`, `enhancement` veya `task`.
- Alan etiketi: `area:frontend`, `area:backend`, `area:database`, `area:docs` veya `area:infra`.
- Öncelik etiketi: `priority:P0` (acil canlı), `priority:P1` (yüksek), `priority:P2` (normal), `priority:P3` (düşük).
- Büyüklük: 1 / 2 / 3 / 5 / 8 puan. 1 çok küçük, 2 küçük, 3 orta, 5 büyük, 8 normalde bölünmesi gereken iş. Mevcut bir bütünün tek PR ile entegrasyonu 8 puan kalabilir; kabul adımları ayrı yazılır. Bunlar süre garantisi değildir; kodlama, test ve belirsizliği birlikte ifade eder.
- GitHub Project, mevcut durum ve sorumlu GitHub hesabı. `agent:claude` / `agent:codex` güncel kodlayıcıyı, `test:claude` / `test:codex` bağımsız test sorumlusunu gösterir. Issueyu açan bu etiketleri koyar; agentlar GitHub kullanıcısı gibi atanmaz. Ayrı Codex/Claude örnekleri bağımsız test yapabilir; aynı çalışma örneği kendi işine PASS veremez.
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
2. Kodlayıcı kontrol sonuçlarıyla PR açar. CI yeşil olunca issueyu In Test yapar, Aktif sorumluyu testçiye geçirir ve devir yorumu (base/head, testler) yazar.
3. Bağımsız agent veya kullanıcı ölçütleri test eder ve issueya kısa sonuç yazar:
   - **PASS:** test edilen commit, kontroller ve sonuç. Testçi PR’ı merge eder, issueyu Done yapar ve Aktif sorumluyu temizler. Koordinatör merge yapmaz.
   - **FAIL:** adımlar, hatalar ve beklenen sonuç. PR’a değişiklik talebi verilir; issue In Progress yapılır. Kodlayıcı düzeltir ve yeniden test ister.
4. Testten sonra kod değişirse önceki PASS geçersizdir. Son commit yeniden bağımsız test edilir.

Issue yorumları tek başına durumu değiştirmez; otomasyonun sonucu görünür biçimde doğrulanır.
Durum değiştirmeden önce PR durumu, son yorumlar ve pano yeniden okunur. Merge edilmiş veya Done olan iş geri çekilmez.
Bağımsız PASS olmadan merge veya Done yok. CI (GitHub Actions) PASS'in yerine geçmez; testçinin ortamında Docker veya ağ yoksa PR'daki yeşil CI, test edilen commit için otomatik testlerin kanıtı sayılır. Kabul ölçütlerinin davranış kontrolü yine testçide (veya kullanıcıda) kalır; kırmızı CI ile PASS verilmez.

## Tetikleme

Şu anda agentlar bir sohbet başlatılarak issue/PR bağlantısıyla çalıştırılır.
Project durum otomasyonu agent başlatmaz. Günlük kodlayıcı/testçi taraması henüz kurulmadı; CI sonucu için yerel, tek seferlik kısa agent tetiklemesi aşağıdaki #59 bölümünde açıklanır.
Bilgisayar kapalıyken veya hesap limiti doluyken çalışma devam ediyormuş gibi rapor verilmez.

## Devir promptları

**Kodlayıcı:**
> #ISSUE işini yap. AGENTS.md, docs/ai-workflow.md ve ilgili uygulama talimatlarını oku. Metadata, önkoşul ve çakışmaları kontrol et. Güncel main’den standart isimli ayrı branch/worktree aç. Kapsamı uygula, testleri raporla ve issueya bağlı Türkçe PR aç. Merge yapma. Sorun/bağımlılık varsa issueya yazıp durumunu güncelle.

**Testçi:**
> #ISSUE ve #PR için bağımsız test yap. Son commiti ve tüm kabul ölçütlerini kontrol et; uygulama dosyalarını değiştirme. Issueya kısa Türkçe PASS/FAIL ve kanıt yaz. FAIL ise hataları belirtip In Progress yap. PASS ise CI yeşilse PR’ı merge et ve issueyu Done yap.

## Yeni katılan ajan ve makineler arası devir

1. Güncel `origin/main` belgelerini oku: `AGENTS.md`, `README.md`, `docs/product.md`, `docs/roadmap.md`, `docs/coordination.md`, bu rehber ve ilgili frontend/backend `AGENTS.md`. Backend işinde mimari, API ve dağıtım belgelerini de oku.
2. GitHub issue/PR ve Project kayıtlarını kontrol et: kabul ölçütleri, sorumlu etiketleri, bağımlılıklar, açık PR’lar ve entegrasyon kilidi. Yerel dal veya başka ajanın test sonucu ortak gerçek sayılmaz.
3. Kodlayıcı işi ancak kendi `agent:*` etiketiyle atanmış, `Todo` ve `blocked` olmayan durumda al. Testçi kendi `test:*` etiketiyle atanmış `In Test` işini alır; incelemeyi başlatırken durumu In Progress yapmaz. Son durumu yeniden oku; issueya ajan/rol, branch ve başlangıç kaydı yaz; kodlamaya başlıyorsan `In Progress` yap. İki ajan aynı işi sahiplenirse ilerlemeyi durdurup issue üzerinde koordinasyon kur; etiket/yorum atomik kilit değildir.
4. Güncel main’den standart branch ve ayrı worktree aç. Kaynak başka makinedeyse önce remote’a push edilmesini bekle; yerel dosyaya güvenme. Çakışma, engel ve kapsam değişikliklerini GitHub’a yaz.
5. Teslimde remote branch/PR, base ve head commit, test komutları/sonuçları, kurulum gereksinimleri ve kalan sorunları bildir. Arayüz değişikliğinde yerel yığını yenileme komutu da yazılır: `./scripts/local-refresh pr N` (geri dönüş: `./scripts/local-refresh main`). Testçi remote’daki belirtilen commiti kendi worktree’sinde doğrular. Sırlar kayda girmez.
6. İş el değiştirirse eski sorumlu etiketi kaldırılıp yenisi eklenir; kısa devir yorumu yazılır. Kopan/limit dolan ajan işleri otomatik olarak tamamlandı sayılmaz; yeniden sahiplenmeden önce son kayıt ve PR kontrol edilir.

## Periyodik tarama sözleşmesi

Yerel bir tetikleyici kurulursa kodlayıcı kendi `agent:*` + `Todo` + engellenmemiş işlerini; testçi kendi `test:*` + `In Test` işlerini tarar. Her çalıştırmada güncel kayıt tekrar okunur; aktif iş ikinci kez başlatılmaz. Entegrasyon kilidi varsa başka kod işi alınmaz. Testçi PASS/FAIL kaydı ve durum güncellemesi yapar; merge yalnız testçinin PASS kaydından sonra testçi tarafından yapılır.

Claude tarafında yaklaşık 20 dakikalık yerel tarama planlandığı bildirildi; kurulumu burada doğrulanmadı. Codex tarafında periyodik kodlayıcı/testçi tetiklemesi henüz kurulmadı. CI sonucu takibi ayrı bir yerel script ile kurulur; aşağıdaki #59 bölümüne bak. Bu belge kendi başına zamanlayıcı oluşturmaz.

## Panoda sorumlu ve görev devri

Satir Project’inde `Aktif sorumlu` (Codex/Claude/Kullanıcı; yeni ekip üyesi için seçenek eklenir), `Kodlayıcı` ve `Testçi` alanları bulunur. İş Akışı kartlarında başlık, Assignee, bağlı PR, etiketler ve alt iş ilerlemesi korunur. Ajan bilgisi kartta yalnız `agent:*` / `test:*` etiketleriyle gösterilir; aynı isimleri tekrar eden Aktif sorumlu/Kodlayıcı/Testçi alanları kartta gizlenir, issue ayrıntılarında korunur. Kodlayıcı/Testçi metin alanlarında gerekirse çalışma örneği de belirtilir. GitHub Assignee gerçek hesap olarak kalır; ajan sorumluluğu bu alanlarda ve etiketlerde tutulur.

- Todo: kodlayıcı ve varsa testçi planı yazılır; Aktif sorumlu boş kalır. In Progress: işi gerçekten alan kodlayıcı aktif sorumludur. In Test: testi devralan testçi aktif sorumludur. In Test tek başına testin başladığı anlamına gelmez; devir yorumunda başladı/bekliyor belirtilir. Done’da aktif sorumlu temizlenir, kodlayıcı/testçi geçmişi korunur.
- Kullanıcının “#N testini sen yap” demesi devir için yeterlidir. Yeni testçi Testçi/Aktif sorumlu alanlarını ve `test:*` etiketini günceller; önceki testçiye işin devredildiğini GitHub yorumuyla kaydeder. Başka sağlayıcı veya ayrı bağımsız çalışma örneği seçilebilir; uygulayan örnek kendi işine bağımsız PASS veremez.
- FAIL: kanıt ve hatalar yazılır, In Progress’e dönülür; Aktif sorumlu düzeltmeyi alan kodlayıcıya geçirilir. Testçi alanı korunur veya açık devirle değiştirilir. PASS ve merge kuralları değişmez.
- Alan, etiket ve yorumlar ajan tarafından birlikte güncellenir; mevcut Project otomasyonu bunları kendiliğinden eşitlemez. Uyumsuzluk varsa son açık kullanıcı devri ve GitHub kaydı esas alınarak düzeltilir. Başka ajanın yerel durumuna güvenilmez.

## CI beklerken token tasarrufu (#59)

PR açtıktan sonra AI sohbetinde `gh pr checks --watch` çıktısını tekrar tekrar okumak veya CI'ı sık sorgulamak kullanılmaz. `scripts/ci-monitor.py` GitHub'ı AI kullanmadan takip eder. Bekleyen/kuyruktaki veya eksik kontroller agent başlatmaz. Son commitin CI sonuçları tamamlanınca taze, kısa bir Codex CLI oturumu (`gpt-6.1-sol`, düşük reasoning) yalnız sonucu özetler; uzun kodlama sohbeti yeniden yüklenmez.

PR açılması panoyu otomatik In Test yapıyorsa kodlayıcı CI beklerken durumu In Progress ve aktif sorumlusunu kendisine geri ayarlar; PR açılması teste hazır olmak değildir.

Kodlayıcı kodlama bittikten sonra PR’a `ci:awaiting` etiketi ekler (`gh pr edit N --add-label ci:awaiting`); düzeltmeye geri dönüyorsa etiketi kaldırır. Bu açık hazır sinyali olmadan takipçi işe dokunmaz. Devir tamamlanınca etiket kaldırılır.

Script yalnız PR’ında `ci:awaiting`, issue’da `agent:codex`, tek bağlı açık issue, In Progress ve tek testçi etiketi olan PR'ları devralır. Yeşil CI → In Test ve etiketlerdeki testçi aktif sorumlu; kırmızı CI → In Progress ve Codex aktif sorumlu. Bu devir bağımsız PASS/FAIL testi, kod düzeltme veya merge değildir. Testçinin işi mevcut devir sözleşmesine göre ayrıca başlar. In Test/Done veya kapanmış PR/issue geri çekilmez. Claude kodlayıcı işleri bu Codex kurulumunca alınmaz; Claude da beklerken aynı tokensız takip ilkesini izlemelidir.

Aynı PR/commit/CI denemesi için disk üzerinde mükerrer çağrı engellenir. Yeni commit/rerun yeni kimliktir; sonuç agent değerlendirmesi sırasında değişirse eski sonuçla durum değiştirilmez. Agent hatasında/limitinde otomatik AI yeniden-deneme döngüsü yoktur; kayıt `error` ile bırakılır. Operatör logu kontrol edip ilgili başarısız kaydı yerel `events.json` dosyasından kaldırarak bilinçli tekrar deneyebilir. GitHub/ağ hataları sonraki taramada yeniden denenir; başarılı özet yeniden üretilmez.

macOS kurulumu (mevcut GitHub ve ChatGPT CLI oturumu; ayrı API anahtarı gerekmez):

```sh
python3 scripts/install-ci-monitor.py
# Kontrol (AI veya GitHub yazımı yapmaz):
python3 "$HOME/.local/share/satir-ci/ci-monitor.py" --config "$HOME/.local/share/satir-ci/config.json" --dry-run
# Durdurma:
python3 scripts/install-ci-monitor.py --uninstall
```

Kurulum `~/Library/LaunchAgents/com.satir.ci-monitor.plist` ile 120 saniyelik, AI çalıştırmayan yerel tarama kaydeder. Tarihi sonuçlar ilk kurulumda baseline olarak atlanır. Script/config/loglar `~/.local/share/satir-ci/` altında; kaynak worktree arşivlense de kurulu kopya çalışır. Bilgisayar kapalı/uykuda veya kullanıcı oturumu kapalıysa çalışmaz; tekrar açıldığında mevcut açık PR'ları kontrol eder. Loglar `monitor.log`, `errors.log`, olay başına `state/<kimlik>/agent.log`; sırlar loglanmaz. CLI oturumu/model erişimi olmadığında hata kaydı vardır, başarılı devir sayılmaz.

Bu yerel script, Codex'in periyodik AI heartbeat otomasyonu değildir: bekleme AI token tüketmez; tamamlanan yeni sonuç başına tek kısa agent çağrısı kredi kullanır. Kurulum veya script güncellemesinden sonra aynı installer tekrar çalıştırılır. Project alan kimlikleri/CI adları değişirse yapılandırma ve owning script güncellenir.
