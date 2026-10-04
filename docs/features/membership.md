# Üyelik, giriş ve kişisel alan

Durum: V1 ön yüz akışları uygulandı; gerçek üye kimlik doğrulaması ve bulut verisi Spring Boot aşamasında gelecek.

## V1 sınırı

Üyeler mevcut sahibin yazılarını okuyabilir, yerel not/işaret ekleyebilir, yazıları özel koleksiyonlarda saklayabilir ve reaksiyon gösterebilir. Üye kaydı içerik yazarlığı veya Studio yetkisi vermez. Hesap ekranı `/hesap`; eski `/studio/hesap` bağlantısı oraya yönlenir.

Giriş/üyelik, Google ile devam et, şifremi unuttum, e-posta doğrulama ve şifre sıfırlama ekranları açıkça ön yüz demosudur. Demo şifreler saklanmaz veya doğrulanmaz; Google OAuth, e-posta gönderimi ve gerçek şifre değiştirme henüz yoktur. Demo profile güvenlik yetkisi olarak güvenilmez.

Demo oturum aynı origin'de localStorage üzerinden yeni sekmelere taşınır. Giriş, çıkış, profil değişikliği ve süre bitimi tüm sekmelerde eşitlenir; süre kontrolü yeniden odaklanınca da yapılır. Farklı tarayıcı/cihaz eşitlemesi vaat edilmez.

Kitaplık ve üye notları demo hesap kimliğine göre ayrı depolama alanları kullanır. Misafir notları korunur; otomatik olarak üyeye aktarılmaz. Eski üye kitaplığı önizlemesi yalnız kullanıcının açık içe aktarma tercihiyle boş kitaplığa alınır. LocalStorage ayrımı gerçek sunucu güvenliği değildir; backend sahibi oturumdan belirlemeli ve özel veriyi yalnız o üyeye döndürmeli.

## Studio erişimi

Kullanıcının ayrıca istediği özel `/studio` girişi sunucu tarafında doğrulanır. Next.js Server Action yalnız geçici Studio giriş kapısıdır; içerik veya üyelik backend'i değildir. Server Component hem `/studio` hem `/preview` için imzalı, süreli HttpOnly cookie'yi kontrol eder. Tarayıcıdaki owner/member rolü bu kontrolü geçemez. Çıkış cookie'yi kaldırır.

Kimlik bilgileri `frontend/.env.local` içindedir ve Git dışında tutulur. Şifre yalnız tuzlu scrypt özeti olarak saklanır; imzalama anahtarı da server-only ortam değişkenidir. Gerçek değerleri MD, test, commit veya NEXT_PUBLIC değişkenine yazma. Yapılandırma yoksa erişim kapalı kalır. Dağıtımda ortam değişkenleri ayrıca tanımlanmalıdır. Deneme sınırlaması şimdilik tek sunucu sürecindedir; kalıcı/distributed sınırlama ve yönetici oturumları Spring Boot'a taşınacak.

## V2: çok yazarlı portal (talebe bağlı)

- Üyelerin yazı yazması ve kendi Studio alanı.
- Herkesin birbirinin yayımlanan yazılarını görebildiği ortak portal.
- İlgi alanlarına göre yazar takip etme, kişisel yazı/seri önerileri ve akış.
- Başkalarının yazılarını özel kitaplıkta saklama.
- Yorum özelliğinin ayrıca değerlendirilmesi: moderasyon, kötüye kullanım, bildirim ve gizlilik kapsamı.
- Yazar izinleri, içerik sahipliği ve ortak portal veri modeli backend tasarımında ayrı karar olacaktır. V1'e bunları varsayarak karmaşık altyapı ekleme.

## Profil avatarları

V1, mevcut tema renkleriyle 60 hazır avatar seçeneği sunar; seçim profil ve hesap menüsünde görünür, aynı tarayıcıdaki sekmelere eşitlenir. Üyelik ve şifre sıfırlama ekranlarında şifre tekrarı eşleşmelidir. V2’de kullanıcı kendi profil fotoğrafını yükleyebilir; dosya boyutu/türü, depolama ve güvenli yükleme backend aşamasında tasarlanacak.
