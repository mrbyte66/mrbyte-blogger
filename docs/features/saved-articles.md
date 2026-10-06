# Üye kitaplığı ve kaydedilen yazılar

Durum (2026-10-06): Kitaplık doğrulanmış üye hesabında sunucuda saklanır (`/me/collections`, `/me/bookmarks`); cihazlar arasında aynıdır, başka üyeye veya site sahibine görünmez. Sınırlar: 100 koleksiyon, 1000 kayıt. Üyelik sınırları `membership.md` içindedir.

- Üye görünümünde yazı kartları, seri bölüm kartları, alternatif tema akışları ve ortak okuma araç çubuğunda kaydet simgesi bulunur. Kaydetmek yazıyı açmaz; kart açma ve kaydetme ayrı erişilebilir kontrollerdir.
- İlk kaydetme varsayılan “Genel” koleksiyonuna gider. Kullanıcı aynı menüden mevcut koleksiyonyi seçebilir veya örneğin “Türk edebiyatı” adlı bir koleksiyon oluşturup taşıyabilir. Yazı başına tek kayıt vardır; koleksiyon değiştirmek toplamı artırmaz.
- Kartların altında ayrı koleksiyon/kaldırma satırı bulunmaz; bu işlemler ortak yer imi menüsündedir. Koleksiyon seçimi “Taşı” ile uygulanır; mevcut kayıt taşındığında listedeki sırası korunur.
- `/kaydedilenler` kişisel kitaplık ekranıdır. Koleksiyonlerle filtreleme, oluşturma, yeniden adlandırma, yazıları taşıma ve kaydı kaldırma sunulur. Varsayılan koleksiyon değiştirilemez. Bir koleksiyon kaldırıldığında yazıları varsayılan koleksiyonye taşınır.
- Yayından kaldırılan yazının kaydı sessizce silinmez; erişilemiyor açıklaması ve kaldırma seçeneği sunulur.
- Kartlar ve okuma alanında kaydetme sayısı görünür. Sayı, yazıyı kaydeden üye sayısının sunucu toplamıdır; kimin kaydettiği gösterilmez. Misafir görünümünde yer imi düşük opaklıkla görünür; tıklamak sade giriş modalını açar.
- Kayıtlar içerik/tema verisinden ayrıdır; Studio bunları veya toplamları düzenleyemez. Önizlemede kaydet kontrolleri salt okunurdur.
- Veri sürümlenir, doğrulanır ve sekmeler arasında eşitlenir. Bozuk veya yazılamayan verinin üzerine geçerliymiş gibi yazılmaz; kullanıcıya hata gösterilir.

## Backend sözleşmesinde netleştirilecekler

Sunucu gerçek oturumdan üye kimliğini belirlemeli; istemcinin gönderdiği kullanıcı kimliğine güvenmemeli. Kitaplık, koleksiyon ve kayıt yönetimi sadece sahibine açık olmalı. Başka üyelerin listeleri/koleksiyon isimleri hiçbir ziyaretçi API’sinde görünmemeli. Tarayıcıdaki üye önizlemesi güvenlik/kimlik doğrulama sağlamaz.

Üye/yazı çifti benzersiz olmalı. Kaydetme hedef durumu idempotent olmalı; yinelenen/eşzamanlı istekler toplamı iki kez artırmamalı. Toplam, yazıyı kaydeden farklı üyelerin sayısıdır. Koleksiyon taşıma toplamı değiştirmez; kaydı kaldırma toplamı düşürür. Ortak sayılar ayrı salt okunur ziyaretçi uç noktasından gelir, kişisel kitaplık ayrıntılarıyla birleştirilmez.

Üyelik avantajları tanıtımında kişisel kitaplık ve koleksiyonlar de açıklanacak. Browser-local prototipten hesabına taşıma ileride kullanıcı tercihine bağlı olmalı.

## Minimal kayıt menüsü

Kişisel gruplar “Koleksiyon” olarak adlandırılır; yazının konu kategorileriyle karışmaz. Kitaplığın adı “Kitaplığım”, varsayılan koleksiyon “Genel”dir. Eski varsayılan isim okuma sırasında dönüştürülür; kayıtlar, koleksiyon kimlikleri ve sıraları korunur. Önceden “Genel” adlı özel koleksiyon varsa ismi benzersiz bir “Genel (2)” ekiyle ayrılır, kayıtları yerinde kalır.

Menü önce koleksiyon seçimi, açık “Taşı” işlemi ve kitaplık/kaldırma bağlantısını gösterir. Yeni koleksiyon formu yalnız “Yeni koleksiyon” açıldığında görünür ve adı alanına klavye odağı taşınır. Seçim taslaktır; “Taşı” öncesinde veriler değişmez.

Kitaplık araçları: başlık, özet, konu ve koleksiyon adına göre yerel arama; kaydetme sırası (varsayılan), yayın tarihi ve alfabetik sıralama. Sıralama yalnız görünümü etkiler; kayıtların saklanan sırası değişmez. Sonuç sayısı, aramayı temizleme ve ilk kayıt için kısa keşfet/sakla/düzenle rehberi vardır.
