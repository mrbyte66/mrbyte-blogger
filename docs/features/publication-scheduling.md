# Yazı yayın planı ve yayın e-postası

Studio sahibi yazısını gelecekte bir tarih ve saate planlayabilir, zamanı değiştirebilir veya planı iptal ederek taslağa dönebilir. Anında yayınlama da korunur. V1 üyelerine Studio/yazı yazma yetkisi verilmez; V2 yazarlarına aynı akış açılabilir.

Ön yüzde `scheduledAt` UTC olarak saklanır; tarih/saat seçimi tarayıcının saat dilimindedir ve bu dilim alanda gösterilir. `publishedAt` mevcut düzenlenebilir kart tarihidir; zamanlama alanı bundan ayrıdır. Boş metin, geçersiz veya geçmiş zaman planlanamaz. Planlanan yazı yayınlanmış kataloglara/seri bölümlerine girmez. Planın iptalinde veya başka duruma geçişte zaman temizlenir.

Hesap → Bildirimler bölümündeki “Yayınlandığında e-posta al” tercihi yazı başına değil, yazarın bütün yazıları içindir. Varsayılan açıktır; eski profillerle uyumludur ve demo oturum üzerinden sekmeler arasında eşitlenir. Açılması eski yayınları yeniden bildirmez. Gelecekteki e-posta “Yazınız yayınlandı” bilgisi, yazı başlığı ve kalıcı bağlantısını içermelidir.

## Ön yüz prototipi

Plan ve tercih yalnızca bu tarayıcıda saklanır. Saat geldiğinde tarayıcı otomatik yayınlama veya e-posta gönderme taklidi yapmaz. UI bunun sunucu bağlantısıyla geleceğini açıkça belirtir. Gerçek gönderim/başarılı teslim bildirimi yoktur.

## Spring Boot aşaması

- Planlar ve kullanıcı tercihi veritabanında kalıcı saklanmalı; yayın işi sekme, cihaz veya açık tarayıcıya bağlı olmamalı.
- Yetki kontrolü sunucuda yazar/sahip üzerinden yapılmalı; istemci rolü yetki değildir.
- Yeniden planlama ve iptal işlemleri eşzamanlı yayın işiyle tutarlı olmalı. Aynı planın tekrar çalışması ikinci bir yayın geçişi üretmemeli.
- E-posta işi ancak yayın işlemi başarıyla tamamlandıktan sonra üretilmeli. Transactional outbox ve idempotent işleme ile tekrar gönderimler engellenmeli; hatalarda tekrar deneme ve gözlenebilir hata durumu bulunmalı.
- Gönderim anında yazarın güncel genel tercihi kontrol edilmeli; kapalıysa gönderilmemeli. Doğrulanmış e-posta ve gerçek teslim sağlayıcısı kullanılmalı.
- Gerçek yayın anı ayrıca kaydedilmeli; düzenlenebilir kart tarihi ile karıştırılmamalı. Zaman dilimi, yaz saati ve sunucu kesintisinden sonra gecikmiş işlerin işlenmesi backend test kapsamıdır.

Studio sayfa seçicisindeki “Planlanan yazılar” filtresi bütün yayın planlarını topluca gösterir. Varsayılan en yakın tarih önce; en uzak tarih ve başlık A–Z seçenekleri bulunur. Her satırda tarih/saat gösterilir, arama ve yazı düzenleyicisine geçiş korunur.

Planlanan yazılar filtresindeki açık tercihli “Demo planlar oluştur” işlemi 1, 3 ve 7 gün sonrasına üç örnek metin ekler. Mevcut yazılar değiştirilmez; aynı demo bağlantıları tekrar eklenmez. Yazılar normal editörle düzenlenebilir, plan iptal edilebilir veya çöp kutusuna taşınabilir. Demo planlar kendiliğinden yayına geçmez ve e-posta göndermez.
