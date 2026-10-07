# SATIR proje yol haritası

Bu belge konuşmalarda kararlaştırılan işleri tek listede toplar. Durumlar:

- **Prototipte var:** Arayüz ve davranış tarayıcıda denenebilir; gerçek hesap, ortak sunucu verisi veya e-posta anlamına gelmez.
- **Sıradaki işler:** Sahip odaklı V1'i gerçek kullanım için tamamlamak üzere bekleyen işler.
- **Üyelik V1:** Ziyaretçi hesabı ve özel kişisel özellikler; içerik yazarlığı vermez.
- **V2:** Talebe bağlı çok yazarlı portal ve sosyal özellikler.
- **İleri fikirler:** Kararı, tasarımı, lisansı veya uygun medya/altyapısı ayrıca gerektiren özellikler.

Her konunun ayrıntılı kabul koşulları bağlantılı özellik belgesinde. Bu yol haritası öncelik sırasını yaklaşık gösterir; henüz tarih taahhüdü değildir.

## 1. Prototipte hazır olanlar

Bunlar yol haritasında tamamlanmış arayüz/prototip işleri olarak kayıtlıdır. Üretim için backend gerektiren kısımlar ayrıca aşağıda listelenmiştir.

- [x] Sahne, akış ve dergi temaları; Studio'da ana sayfa bloklarını ve yazı/seri sayfalarını ziyaretçiyle aynı tuvalde düzenleme, önizleme ve uygulama.
- [x] Yazı oluşturma, seriye bağlama veya bağımsız tutma; seri oluşturma, bölüm sıralama, taslak/yayında/arşiv/çöp kutusu işlemleri.
- [x] Üç örnek seri, seri başına örnek bölümler, görselli yazı/seri kartları ve beşli artımlı listeleme.
- [x] Çoklu yazı kategorileri, düzenlenebilir yazı tarihi ve tarihe göre yazı sıralama; seri bölümlerinde Studio sırası.
- [x] Yazı özeti, kalıcı okuma sayfası ve yerel Studio içeriği.
- [x] Üyelik/giriş ekranı demosu, hesap sayfası, 60 profil avatarı ve aynı tarayıcı sekmelerinde demo oturumu. Studio ayrı sunucu oturumuyla korunur.
- [x] Kişisel kitaplık/koleksiyon demosu, anonim alkış, görüntülenme ve paylaşım kontrolleri.
- [x] Kalıcı yazı sayfalarında yerel not, fosforlu işaret ve altını çizme araçları.
- [x] İsteğe bağlı Mozart oynatımı; aynı site sekmeleri arasında tek oynatıcı, konum paylaşımı ve ses kontrolü.
- [x] Yazı yayın tarihi planlama prototipi, planları listeleme/sıralama ve 1/3/7 gün sonrasına örnek plan üretme. Bu örnekler otomatik yayımlanmaz.

## 2. Sıradaki işler — V1 sahibi ve üretim temeli

### Backend, veritabanı ve yayın güvenilirliği

- [x] Spring Boot API ve veritabanı mimarisini belirle; alan modeli, migration, hata/versiyonlama ve API sözleşmelerini frontend'le birlikte netleştir.
- [x] İçerik, temalar, medya, seriler ve hesap tercihleri için kalıcı saklama ve güvenli sahip yetkisi ekle. Tarayıcı depolamasını üretim kaynağı kabul etme.
- [x] Gerçek üye girişi, e-posta doğrulama, şifre sıfırlama, güvenli oturum/çıkış ve Google OAuth bağlantısını tamamla. Yerel demo girişi kimlik doğrulama sayılmaz.
- [x] Planlanmış yazıları sunucu tarafında, tarayıcı kapalı olsa da doğru zamanda yayımla. Saat dilimi/yaz saati, yeniden planlama, iptal, gecikmiş işler, tekrar çalışmada tek yayın ve işlem kayıtlarını ele al.
- [x] Yayın başarılı olduktan sonra yazara “Yazınız yayınlandı” e-postası gönder. Hesap genelindeki tercih kapalıysa gönderme; hata/tekrar denemeyi ve idempotent gönderimi kaydet.
- [x] Alkış, görüntülenme ve kaydedilme sayılarını gerçek ortak sunucu verisine geçir; tekrar isteklerini çift sayma ve kötüye kullanımı sınırla.

Ayrıntılar: [yayın planlama](features/publication-scheduling.md), [alkış ve görüntülenme](features/claps-and-sharing.md).

### Özel yazılar ve güvenli erişim

- [x] Önce site sahibine **kilitli/özel yazı** durumu ekle. Kamu katalogları, arama, seri, kalıcı URL, sitemap, API, kapak/medya, önizleme ve cache katmanlarında içeriği ifşa etme.
- [x] Kilitli yazının taslak/yayında/planlandı/arşiv/çöp kutusu geçişlerini açıkça tasarla. Yazı yalnız sahibin açık yayınlama işlemiyle kamuya açılsın.
- [x] Erişimi sadece arayüzle gizleme; sunucu kimliğine göre yetkilendir. Üyelere özel yazı desteğini ilk sürüme dahil etme.

Ayrıntılar: [kilitli yazılar](features/private-articles.md).

### İçerik üretimi ve site yönetimi

- [ ] Yazı ve seri için çevrimiçi, uygun lisanslı kapak bulma akışı ekle. Kaynak/lisans/atıf bilgisi sakla; elle seçme, kendi görselini kullanma ve görselsiz bırakma seçenekleri sun.
- [x] Yazı kapak görselini düzenleme/yükleme ve gerçek medya depolamasını tamamla. Alakasız veya lisansı belirsiz görseli otomatik seçme.
- [x] Üretimde kullanılacak SEO, sitemap/robots, paylaşım metaverisi ve özel içeriklerin indekslenmeme kurallarını ekle. Site herkese açılmadan indeksleme kararını kontrol et.
- [ ] Mevcut örnek içeriklerden gerçek yazılara geçiş, yedekleme, içerik dışa aktarma ve kurtarma akışlarını belirle.
- [ ] Proje, alıntı, şiir, öykü ve farklı sayfa türlerinin Studio içerik modelini hangi sırayla destekleyeceğine karar ver.
- [ ] Üyelik avantajlarını açıklayan sade bir **site tanıtım/üyelik sayfası** hazırla. Yalnızca gerçek olanakları varmış gibi göster; henüz backend gerektirenleri “planlanıyor” diye ayır.

Ayrıntılar: [otomatik kapaklar](features/automatic-covers.md), [site tanıtımı](features/site-introduction.md), [site oluşturucu](site-builder.md).

## 3. Üyelik V1 — okuyucu hesabı

Üye olur olmak yazı yazma veya Studio yetkisi sağlamaz. V1 üyeler mevcut sahibin yayımladığı yazıları okur.

- [x] Gerçek hesap doğrulaması ve bulut profili; sekmeler/cihazlar arasında güvenli oturum ve hesap yönetimi.
- [x] Notlar, fosforlu işaretler ve okuma araçlarını üye hesabında saklama/eşitleme. Misafir notlarını içe aktarma kullanıcı tercihiyle olsun.
- [x] Kitaplığı ve “Genel” varsayılan koleksiyonunu hesapta saklama; kişisel koleksiyon oluşturma, taşıma, kaldırma. Bir üyenin kayıtlarını/koleksiyonlarını başka üyeye gösterme.
- [x] Seri/yazı ziyaret geçmişini otomatik kaydet ve üyeye kaldığı yeri göster. Ziyaret, yazının tamamlandığı anlamına gelmesin.
- [ ] Üyelik faydaları için içerik kaydetme, kendi çalışma defteri ve kaldığı yere dönme akışlarını tamamla.
- [ ] Üyenin hesabında kendi okuma ilerlemesi ve tanımlı okur rozetlerini göster.

Ayrıntılar: [üyelik](features/membership.md), [kişisel kitaplık](features/saved-articles.md), [okuma araçları](features/reading-tools.md), [blog serileri](features/blog-series.md), [okuma rozetleri](features/reader-progress-and-analytics.md).

## 4. Sahip paneli — istatistikler

- [x] Yönetici üye listesini ve kararlaştırılmış hesap bilgilerini görebilsin; kişisel kitaplıklar, özel notlar ve gereksiz ayrıntılı gezinme geçmişi toplu panelden açığa çıkmasın.
- [x] Yazı bazında görüntülenme, alkış, kaydetme ve onaylanan diğer ölçüleri göster.
- [ ] Sahip metrik, tarih aralığı, yazı, cihaz türü gibi kırılımları seçip tabloyu dinamik biçimde kurabilsin; kayıtları sıralayıp karşılaştırabilsin.
- [ ] Görüntülenme/tekil ziyaret ve okuma süresi gibi metrikleri açıkça tanımla; sayfa arka plandayken geçen zamanı okuma diye sayma.
- [ ] Veri amacı, saklama süresi, erişim, üyeye açıklama ve uygulanacak mahremiyet kurallarını olay toplamaya başlamadan kararlaştır.

Ayrıntılar: [okuma rozetleri ve istatistikler](features/reader-progress-and-analytics.md).

## 5. V2 — çok yazarlı portal ve topluluk (talebe bağlı)

- [ ] Üyelerin kendi yazılarını yazması ve kendilerine ait Studio/yazar alanı.
- [ ] Herkesin yayımlanmış yazıları gördüğü, içerik sahibi ve yazar profilleri belirgin ortak portal.
- [ ] İlgi alanlarına göre yazar takip etme, kişisel akış ve öneriler; üyeye kişiselleştirmeyi kontrol etme seçeneği ver.
- [ ] Üyelerin kendi özel/kilitli yazılarını yönetmesi. Bu özellik sahibi için özel yazı yetkisinden ayrı değerlendirilir.
- [ ] Yorumları ancak moderasyon, spam/kötüye kullanım, bildirim, raporlama ve gizlilik kurallarıyla birlikte tasarla.
- [ ] Kullanıcının kendi profil fotoğrafını yüklemesi; güvenli dosya türü/boyut/depolama sınırları.
- [ ] Üye yazarlar için yayın planlama ve yayın e-postası tercihlerini hesap bazında çalıştır.

Ayrıntılar: [çok yazarlı üyelik](features/membership.md), [kişiselleştirilmiş öneriler](features/personalized-recommendations.md), [kilitli yazılar](features/private-articles.md).

## 6. Daha sonra / deneysel fikirler

### Okuma ve yazı deneyimi

- [ ] Yazıları PDF olarak dışa aktarma özelliği ekle. Bu işlemi yalnızca sisteme kayıtlı, giriş yapmış üyeler yapabilsin; dışa aktarma mevcut yazı erişim kurallarına tabi olsun.
- [ ] Sahibin herkese açık yazar notları/açıklamaları için ayrı ve açık yayımlama katmanı.
- [ ] Okuma araçlarını panel/sahne okumasına da uyarlama; ek kalem/renk ve not dışa aktarma kararları.
- [ ] Seri ve içerik önerilerini üyenin gerçek okuma ilgisine göre kişiselleştirme.

### Ses ve nostalji

- [ ] Mozart dışı sözsüz seçenekler: solo piyano/gitar, su, yağmur, kuş ve gök gürültüsü.
- [ ] Mevsim/hava durumuna göre isteğe bağlı ses önerisi; konum izni, sağlayıcı, el ile değiştirme ve çevrimdışı davranışı tanımla. Otomatik ses başlatma yok.
- [ ] AssistiveTouch benzeri, animasyonlu fakat erişilebilir ve her zaman sessize alınabilen genişletilebilir ses kontrolü.
- [ ] Sahibin zamanla müzik, fotoğraf, video, hikâye veya küçük etkileşimli içerik ekleyebildiği nostalji sayfası/bloku. Her medyanın kaynağı ve kullanım izni saklanmalı; oynatma kullanıcı başlatmalı.

Ayrıntılar: [ortam sesi](features/ambient-audio.md), [nostalji köşesi](features/nostalgia-corner.md).

### Karakter etkileşimi

- [ ] Karakteri sürükleyerek 360 derece döndürme, etkileşim bitince dinlenme görünümüne yumuşak dönüş ve dönüş sonrası kısa şaşı göz animasyonu.
- [ ] Bunun için tek görseli CSS ile çevirmek yerine katmanlı/çok açılı/3B uygun karakter varlığı üretme veya seçme. Dokunma/klavye, erişilebilirlik, reduce-motion ve sayfa kaydırma etkileşimini koru.

Ayrıntılar: [karakter etkileşimi](features/character-interaction.md).

### Tema ve editörün ileri adımları

- [ ] Kaydedilmiş tema kütüphanesi ve yeniden kullanılabilir, daha zengin blok çeşitleri.
- [ ] İç içe kapsayıcılar, destekli sütun/ızgara düzenleri, blok başına görünüm ve etkileşim seçenekleri. Serbest piksel yerleştirme ilk hedef değil.
- [ ] Yeni tema düzenlerinin aynı içerik ve URL'lerle çalıştığını doğrula.

Ayrıntılar: [site oluşturucu](site-builder.md).

## 7. Açık ürün kararları

- Rozetlerin eşiği, dönem hesabı ve hangi eylemlerin ilerlemeye sayılacağı.
- Yönetici üye tablosunda gösterilecek kimlik alanları ile yalnız toplu kalması gereken davranış verileri.
- Okuma süresi ve tekil görüntülenmenin ölçüm tanımı, saklama süresi ve gizlilik açıklaması.
- Görsel sağlayıcısı/API kotası ve kapakların depolama/atıf politikası.
- Üyelerin yazarlık/portal özelliğini ne zaman ve hangi talep koşuluyla açma.
- Yorumların V2'ye alınıp alınmayacağı ve moderasyon yükünü kimin yöneteceği.
- Nostalji köşesinin ilk medya türleri ve ses kontrolünün sonraki etkileşim düzeyi.

## Özellik belgeleri

- [Site oluşturucu](site-builder.md)
- [Üyelik ve Studio erişimi](features/membership.md)
- [Üyelik/site tanıtımı](features/site-introduction.md)
- [Yayın planı ve e-posta](features/publication-scheduling.md)
- [Kilitli yazılar](features/private-articles.md)
- [Okuma rozetleri ve istatistikler](features/reader-progress-and-analytics.md)
- [Yazı/seri kapakları](features/automatic-covers.md)
- [Yazı özeti](features/article-summary.md)
- [Seriler](features/blog-series.md)
- [Kitaplık](features/saved-articles.md)
- [Okuma araçları](features/reading-tools.md)
- [Alkış/paylaşım/görüntülenme](features/claps-and-sharing.md)
- [Kişiselleştirilmiş öneriler](features/personalized-recommendations.md)
- [Ortam sesi](features/ambient-audio.md)
- [Nostalji köşesi](features/nostalgia-corner.md)
- [Karakter etkileşimi](features/character-interaction.md)
