# Alkış ve paylaşım

Durum (2026-10-06): Alkış ve görüntülenme sunucuda tutulur (API sözleşmesi §6). Hesapsız ziyaretçi rastgele çerezli anonim kimlikle, doğrulanmış üye hesabıyla alkışlar; girişte anonim alkış hesaba taşınmaz (Ü11). Görüntülenme, görünür kart ve kalıcı sayfa açılışı başına sayfa görüntülemesi içinde bir kez sayılır; panel, Studio ve önizleme saymaz.

- Okuma paneli ve kalıcı yazı sayfasındaki ortak şeffaf araç çubuğunda çizgi ikonlu alkış düğmesi ilk tıklamada bir alkış ekler, ikinci tıklamada geri alır. Üyelik gerekmez. Her aktör (hesap veya anonim tarayıcı kimliği) yazı başına en çok bir etkin alkışa sahiptir; sayı tüm etkin alkışların sunucu toplamıdır.
- Bir yazı özeti görünür bir yazı/seri bölüm kartında ilk kez ekrana geldiğinde ve kalıcı yazı sayfası açıldığında görüntülenme kaydedilir; sağdaki okuma panelinde yazıyı açmak yeni bir görüntülenme eklemez. Sonsuz akışta henüz görünmeyen kartlar sayılmaz. Yeni bir sayfa görüntülemesinde (başka sayfaya gidip dönme, yeni ziyaret) aynı kart yeniden sayılabilir; aynı sayfa içinde yeniden çizim veya ağ tekrarı sayılmaz.
- Yazı kartları, seri bölüm kartları ve tema akışındaki yazılar görüntülenme ve alkış sayılarını salt okunur gösterir. Seri kartı sayıları yayındaki bölüm yazılarının toplamıdır; seri için ayrı görüntülenme/oy değildir.
- Görüntülenmeler ve tepkiler içerik/tema verisinden ayrı tutulur. Studio sayıları değiştiremez; önizlemede sayaç tetiklenmez ve alkış/paylaşım kontrolleri devre dışıdır.
- Paylaşım kalıcı yazı adresini kullanır. Bağlantı kopyalama, WhatsApp, LinkedIn, X ve desteklenen cihazlarda yerel paylaşım menüsü sunulur. İptal işlemi hata değildir; kopyalama hatasında adres elle seçilebilir. Geliştirme ortamında adres localhost'tur; herkese açık paylaşım için yayınlanmış site gerekir.

## Sunucu davranışı (uygulandı)

Alkış hedef durumdur (`PUT /articles/{id}/clap {clapped}`); tekrar gönderim ve eşzamanlı istek toplamı iki kez artırmaz (kısmi tekil indeks). Anonim kimlik rastgele, HttpOnly bir çerezdir (180 gün; sunucuda yalnız özeti saklanır); bir gerçek insan garantisi değildir ve parmak izi kullanılmaz. Görüntülenme olayı `eventId` ile tekrarsızdır ve (aktör, yazı, kaynak, sayfa görüntülemesi) başına bir kez sayılır; bilinen bot kullanıcı ajanları sayılmaz, aktör ve istemci adresi başına hız sınırı vardır (ham IP saklanmaz, HMAC). Gizli/taslak yazılar 404; Studio içerik API'si sayaç kabul etmez. Ayrıntılar: backend README "Implementation decisions".

## Doğrulama

Backend: hedef durum, eşzamanlı alkış, anonim/üye ayrımı ve hesap silmede düşen toplam, sayfa görüntülemesi tekrarsızlığı, eventId yeniden kullanımı, bot/zaman penceresi/gizli yazı, hız sınırı ve seri toplamı (PostgreSQL entegrasyon testleri). Frontend: sunucu toplamları, alkış geri alma ve hata geri dönüşü, kalıcı sayfa ve %20 kart olayı, panel/önizlemede olay yok, paylaşım URL'si. Platformlarda gerçekten paylaşım yapılmaz; kullanıcı ilgili uygulamada tamamlar.
