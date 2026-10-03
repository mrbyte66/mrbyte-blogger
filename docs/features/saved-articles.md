# Üye kitaplığı ve kaydedilen yazılar

Durum: Üye görünümü için ön yüz prototipi uygulandı. Gerçek giriş ve hesap verileri henüz yok; kayıtlar bu tarayıcıda tutulur. Üye önizlemesi varsayılan olarak açıktır; Kaydedilenler sayfasındaki önizleme açıklamasından misafir görünümüne geçilebilir.

- Üye görünümünde yazı kartları, seri bölüm kartları, alternatif tema akışları ve ortak okuma araç çubuğunda kaydet simgesi bulunur. Kaydetmek yazıyı açmaz; kart açma ve kaydetme ayrı erişilebilir kontrollerdir.
- İlk kaydetme varsayılan “Kaydedilenler” kategorisine gider. Kullanıcı aynı menüden mevcut kategoriyi seçebilir veya örneğin “Türk edebiyatı” adlı bir kategori oluşturup taşıyabilir. Yazı başına tek kayıt vardır; kategori değiştirmek toplamı artırmaz.
- Kartların altında ayrı kategori/kaldırma satırı bulunmaz; bu işlemler ortak yer imi menüsündedir. Kategori seçimi “Taşı” ile uygulanır; mevcut kayıt taşındığında listedeki sırası korunur.
- `/kaydedilenler` kişisel kitaplık ekranıdır. Kategorilerle filtreleme, oluşturma, yeniden adlandırma, yazıları taşıma ve kaydı kaldırma sunulur. Varsayılan kategori değiştirilemez. Bir kategori kaldırıldığında yazıları varsayılan kategoriye taşınır.
- Yayından kaldırılan yazının kaydı sessizce silinmez; erişilemiyor açıklaması ve kaldırma seçeneği sunulur.
- Kartlar ve okuma alanında kaydetme sayısı görünür. Prototip yalnız bu tarayıcıdaki demo üyenin kaydını 0/1 olarak gösterir; açıklama ipucu bunu belirtir. Gerçek tüm ziyaretçi toplamı henüz yoktur. Misafir görünümünde sayı salt okunurdur, kaydet düğmesi yoktur.
- Kayıtlar içerik/tema verisinden ayrıdır; Studio bunları veya toplamları düzenleyemez. Önizlemede kaydet kontrolleri salt okunurdur.
- Veri sürümlenir, doğrulanır ve sekmeler arasında eşitlenir. Bozuk veya yazılamayan verinin üzerine geçerliymiş gibi yazılmaz; kullanıcıya hata gösterilir.

## Backend sözleşmesinde netleştirilecekler

Sunucu gerçek oturumdan üye kimliğini belirlemeli; istemcinin gönderdiği kullanıcı kimliğine güvenmemeli. Kitaplık, kategori ve kayıt yönetimi sadece sahibine açık olmalı. Başka üyelerin listeleri/kategori isimleri hiçbir ziyaretçi API’sinde görünmemeli. Tarayıcıdaki üye önizlemesi güvenlik/kimlik doğrulama sağlamaz.

Üye/yazı çifti benzersiz olmalı. Kaydetme hedef durumu idempotent olmalı; yinelenen/eşzamanlı istekler toplamı iki kez artırmamalı. Toplam, yazıyı kaydeden farklı üyelerin sayısıdır. Kategori taşıma toplamı değiştirmez; kaydı kaldırma toplamı düşürür. Ortak sayılar ayrı salt okunur ziyaretçi uç noktasından gelir, kişisel kitaplık ayrıntılarıyla birleştirilmez.

Üyelik avantajları tanıtımında kişisel kitaplık ve kategoriler de açıklanacak. Browser-local prototipten hesabına taşıma ileride kullanıcı tercihine bağlı olmalı.
