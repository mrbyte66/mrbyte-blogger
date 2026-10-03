# Alkış ve paylaşım

Durum: Ön yüzde tarayıcıya özel prototip uygulandı. Ortak ziyaretçi toplamları Spring Boot aşamasında eklenecek.

- Okuma paneli ve kalıcı yazı sayfasındaki ortak şeffaf araç çubuğunda çizgi ikonlu alkış düğmesi ilk tıklamada bir alkış ekler, ikinci tıklamada geri alır. Üyelik gerekmez. Mevcut prototip aynı tarayıcıda yazı başına 0 veya 1 alkış saklar; bunu tüm ziyaretçilerin toplamı olarak sunmaz.
- Bir yazı özeti görünür bir yazı/seri bölüm kartında ilk kez ekrana geldiğinde ve kalıcı yazı sayfası açıldığında görüntülenme kaydedilir; sağdaki okuma panelinde yazıyı açmak yeni bir görüntülenme eklemez. Sonsuz akışta henüz görünmeyen kartlar sayılmaz. Sayfa/özet tekrar görüntülenince yerel sayaç artar.
- Yazı kartları, seri bölüm kartları ve tema akışındaki yazılar görüntülenme ve alkış sayılarını salt okunur gösterir. Seri kartı sayıları yayındaki bölüm yazılarının toplamıdır; seri için ayrı görüntülenme/oy değildir.
- Görüntülenmeler ve tepkiler içerik/tema verisinden ayrı tutulur. Studio sayıları değiştiremez; önizlemede sayaç tetiklenmez ve alkış/paylaşım kontrolleri devre dışıdır.
- Paylaşım kalıcı yazı adresini kullanır. Bağlantı kopyalama, WhatsApp, LinkedIn, X ve desteklenen cihazlarda yerel paylaşım menüsü sunulur. İptal işlemi hata değildir; kopyalama hatasında adres elle seçilebilir. Geliştirme ortamında adres localhost'tur; herkese açık paylaşım için yayınlanmış site gerekir.

## Sunucu aşaması

Gerçek toplamlar ve ziyaretçi alkışı için server store gerekir; bugünkü sayılar yalnız bu tarayıcıya aittir. Sunucu her görünür içerik gösterimi için yeni bir görüntülenme kaydı almalı, Studio içerik API'si sayaçları kabul etmemeli. Üyeliksiz ziyaretçi için sunucu tarafından verilen anonim kimlik, üye için hesap kimliği kullanılabilir; tarayıcı kimliği bir gerçek insan garantisi değildir. Yazı/ziyaretçi çifti benzersiz olmalı. İstekler hedef durumu (alkışlı/alkışsız) belirtmeli; tekrar gönderim, eşzamanlılık ve geciken yanıt toplamı iki kez artırmamalı. Kota ve kötüye kullanım kontrolleri backend sözleşmesiyle netleştirilecek.

## Doğrulama

Toggle/undo, yeniden açmada koruma, kartlarla eşzamanlama, seri toplamı, farklı sekme bildirimi, bozuk kaydı koruma, depolama hatası, Studio salt okunurluğu ve paylaşım URL'si test kapsamındadır. Platformlarda gerçekten paylaşım yapılmaz; kullanıcı ilgili uygulamada tamamlar.
