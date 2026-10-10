# Yazı ve seriler için otomatik kapak

Durum: Görselli katalog kartları, yerel taslak kapaklar ve Studio'da sahibin başlattığı çevrimiçi (Pexels) kapak araması uygulandı (#27). Otomatik/arka planda kapak atama henüz yok; kapak yalnız sahip seçtiğinde değişir.

Yazılar penceresi iki sütunlu orta boy kapaklı kartlar kullanır; dar tuvalde tek sütuna geçer. Seriler geniş kartlarla ayrışır. Yerel SVG kapaklar tasarım örneğidir; çevrimiçi arama sonucu olarak sunulmaz. Mevcut özel seri/yazı kapakları önceliklidir ve detay sayfasında/Studio tuvalinde aynı kapak görüntülenir.

## Studio kapak paneli (uygulandı)

Yazı ve seri editöründe “Kapak görseli” alanı ortak `CoverField` bileşenini kullanır (`frontend/components/builder/CoverSearch.tsx`):

- Düzen (#58), yazı, seri ve satır içi seri formunda aynı: üstte 16:9 kapak önizlemesi (kapak yoksa “örnek kapak gösterilir” notlu boş alan); altında yan yana “Kapağı değiştir/Kapak görseli yükle” ve “Kapağı kaldır”; hemen altında yükleme sonucu (“Görsel yüklendi.” yeşil, hata kırmızı kutu); küçük JPEG/PNG notu; en altta ayrı başlıklı “Çevrimiçi kapak bul”. Koyu temada arama kutusu, sonuç kartları ve mesajlar tema renklerini kullanır; gizli dosya girdisine klavye odağı yükleme düğmesinde görünür. Ekran görüntüleri: `frontend/docs/visual-history/cover-panel-58-*.jpg`.
- Kendi görselini yükleme (JPEG/PNG, en fazla 10 MiB) ve “Kapağı kaldır”. Kaldırılan kapak `mode:"auto"` olarak kaydedilir ve içeriğe uygun örnek kapak gösterilir.
- Çevrimiçi arama yalnız kaydedilmiş yazı/seride açılır (`POST /api/v1/studio/cover-jobs`). Sağlayıcıya yalnız sahibin kutuya yazdığı kelimeler gider. Herkese açık yazı ve serilerde kutu başlıkla önceden doldurulur; özel yazıda boş gelir ve başlık hiçbir zaman gönderilmez.
- Sonuçlar 4:3 önizleme kartlarında gösterilir. Kartın seçme düğmesi yalnız görseli ve “Seç” etiketini içerir; fotoğrafçı, kaynak ve lisans bağlantıları düğmenin dışında, kardeş öğe olarak durur. “Pexels” bağlantısı sonuç listesinin üstündedir. Yalnız `https:` adresleri bağlantı olarak çizilir.
- Seçim `POST /api/v1/studio/cover-jobs/{id}/select` ile görselin yerel kopyasını ve atfını saklar; dönen medya adresi taslağa `cover:{mode:"manual",assetId}` olarak eklenir. Yayına yansıması için sayfa kaydedilir. Seçilen kapağın kaynağı panelde gösterilir.
- Geç gelen yanıtlar: her istek başladığı nesli taşır. Yeni arama önceki arama ve seçimleri, sahibin kapağı başka yolla değiştirmesi (yükleme/kaldırma/geri alma) bekleyen seçimi, panelin kapanması ikisini de geçersiz kılar. Eski aramanın sonucu yeni sonuçların üstüne yazılmaz; sahibin değişikliğinden sonra biten seçim uygulanmaz (indirilen görsel kullanılmayan medya olarak kalır). Bekleyen arama, kapak değişse de sonuçlarını gösterir; sonuçlar yalnız önizlemedir.
- Hata durumları: `503 COVER_PROVIDER_UNAVAILABLE` (sağlayıcı yapılandırılmamış) için yükleme/kapaksız bırakma önerilir; `state:"failed"` (sağlayıcı hatası veya kota) ve `429` için yeniden dene gösterilir; boş sonuçta alakasız fotoğraf seçilmez; `502 COVER_DOWNLOAD_FAILED` ve geçersiz aday için mevcut kapak korunur. Hiçbir hata mevcut kapağı değiştirmez.
- 390px genişlikte sonuç ızgarası tek/iki sütuna daralır; uzun fotoğrafçı adları ve adresler satır kırar, yatay taşma olmaz.

Testler: `frontend/tests/cover-search.test.tsx` (atıf bağlantısının düğme dışında olması, kayıtla kalıcılık, eski arama yanıtı, yüklemeden sonra biten seçim, 503/kota/boş/indirme hataları, özel yazı sorgusu, kaydedilmemiş yazı).

Açık: `mode:"none"` (açık kapaksız tercih) frontend modelinde ayrı tutulmuyor; otomatik atama eklendiğinde “kapaksız” tercihi `auto`dan ayrılmalı ve otomatik işlem `manual`/`none` kayıtlarını değiştirmemelidir.

## İstenen deneyim

Site sahibi yazı veya seri hazırladığında sistem, içerikle uyumlu ve kullanım lisansı belli bir fotoğrafı internetten bulup varsayılan kapak olarak atar. Yazı kartları küçük, yalnızca metinden oluşan satırlar yerine rahat okunabilen, görsel ağırlıklı kartlara dönüşür. Seri kartları da aynı kapak sistemini kullanır. Daha büyük kartlar daha fazla metin veya kalabalık kontroller gerektirmez.

## Seçim ve Studio akışı

- Yazının başlığı, özeti, kategorisi ve gerektiğinde gövdesinden konu çıkarılır. Seri için başlık, açıklama ve bölüm başlıkları birlikte değerlendirilir. Türkçe içerik sağlayıcının desteklediği arama diline uygun sorguya dönüştürülür.
- İlk uygun kayıt sırasında arama arka planda başlar; yazıyı kaydetmeyi engellemez. Boş taslaklar ve her tuş vuruşu arama tetiklemez.
- Uygun bulunan fotoğraf varsayılan kapaktır. Studio'da kapak önizlemesi, kaynak bilgisi, alternatif seçme, yeniden bulma, kendi görselini kullanma ve kapaksız bırakma seçenekleri bulunur.
- Seçilen kapak içerikle birlikte saklanır; ziyaretçi sayfayı her açtığında yeniden arama yapılmaz ve fotoğraf değişmez. Başlık değişikliği mevcut kapağı sessizce değiştirmez. Kullanıcının seçtiği kapak veya kapaksız tercihi otomatik işlemle ezilmez.
- Arama sonucu geç gelirse güncel içerik sürümü ve kapak tercihi kontrol edilir; eski istek yeni seçimin üzerine yazamaz.
- Eşleşme yetersizse veya sağlayıcıya ulaşılamazsa alakasız fotoğraf seçilmez. Temayla uyumlu sade bir yer tutucu kullanılır; Studio durumu ve yeniden deneme seçeneğini gösterir.

## Kaynak ve mimari

İlk sağlayıcı adayı Pexels'tir; fotoğraf araması ve API anahtarı sunucu tarafındaki Spring Boot servisinde tutulur. Next.js route handler veya tarayıcıya gömülü gizli anahtar kullanılmaz. Sağlayıcı entegrasyonu değiştirilebilir bir arayüzün arkasında olmalıdır. Uç sözleşmesi `backend/docs/openapi.yaml` ve `docs/api-contract.md` §8'dedir.

“Telifsiz” ifadesi yerine sağlayıcının kullanım lisansına uygun fotoğraf esas alınır. Görselle birlikte sağlayıcı kimliği, fotoğraf kimliği, kaynak sayfası, fotoğrafçı/atıf bilgisi ve lisans bağlantısı saklanır. Genel web/görsel arama sonuçları lisans kanıtı sayılmaz. İndirme, saklama, önbellekleme ve atıf davranışı sağlayıcının güncel koşullarına göre belirlenir.

Pexels API kullanımı için Pexels bağlantısı görünür olmalı; mümkün olduğunda fotoğrafçıya kaynak fotoğraf bağlantısıyla kredi verilmelidir. API anahtarı gerekir. Sağlayıcı kotası için sonuç önbelleği, sınırlandırılmış yeniden deneme ve istek birleştirme düşünülmelidir. Bu araştırma bir API hesabı oluşturmadı veya canlı entegrasyon kurmadı.

Kaynaklar (2026-10-03):
- [Pexels API dokümantasyonu](https://www.pexels.com/api/documentation/)
- [Pexels lisansı](https://www.pexels.com/legal-pages/license/)

## Görsel tasarım ve kabul ölçütleri

- Yazı/seri kapakları ortak davranışa sahip olur; yazının gövdesindeki görselden bağımsız düzenlenir.
- Kartlar mevcut minimalist tipografi, yuvarlatılmış yüzey ve kenarlık geri bildirimini korur. Başlık, kısa özet ve okuma süresi rahatça okunur; görsel metnin önüne geçmez.
- Kapak oranı baştan ayrılarak yüklenirken yerleşim sıçraması önlenir. Mobilde taşma, bozuk görsel simgesi veya okunmayan metin oluşmaz. Açık/koyu tema ve klavye odağı korunur.
- Ziyaretçi ve Studio tuvali aynı kapak verisini ve render bileşenini kullanır. Atıf bağlantıları kartın tıklanabilir alanıyla iç içe etkileşimli öğe oluşturmaz.
- İçerik eşleşmesi, manuel seçim önceliği, kapaksız tercih, eski yanıtların reddi, lisans/atıf kaydı, kota/hata davranışı ve yeniden ziyarette kararlı kapak test edilir.

## Aşamalar

1. Frontend: daha büyük görselli yazı kartları ve yazı/seri ortak kapak sunumu tamamlandı. Studio'da yazı ve seri kapağı için yükleme, kaldırma ve çevrimiçi arama/seçme akışı uygulandı (#27).
2. Backend: sağlayıcı anahtarı, sahip sorgusuyla güvenli arama ve atıflı kalıcı medya kaydı uygulandı. Konu eşleştirme ve asenkron otomatik atama planlı.
3. Gerçek içeriklerle seçim kalitesi ve tüm temalarda görsel uyum değerlendirmesi.
