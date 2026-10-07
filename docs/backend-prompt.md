Astra tarafından oluşturulan backend mimarisini uygulamanı istiyorum. Önce aşağıdaki belgeleri ve depo talimatlarını oku; çelişki varsa uygulamaya başlamadan raporla:

/AGENTS.md
/docs/product.md
/docs/roadmap.md
/docs/coordination.md
/docs/backend-architecture.md
/docs/api-contract.md
/docs/deployment-vps.md
/backend/AGENTS.md
/frontend/AGENTS.md
Uygulama yapacağın mevcut kaynak kodları ve package/build yapılandırmaları
Onaylanmış mimari ve API sözleşmesini takip et. Önemli bir karar belgelerde yoksa en küçük, güvenli ve geri alınabilir çözümü seç; varsayımını dokümante et. Ürün kapsamını kendin genişletme.

Teknik hedef:

Backend: Java 25 LTS, Spring Boot; mevcut backend/ dizininde Maven düzeni.
Veritabanı: PostgreSQL; şema değişiklikleri Flyway migration ile.
Frontend: mevcut Next.js/React/TypeScript uygulaması. Tasarımını yeniden yapma; yalnızca gereken API bağlantılarını ve SEO davranışını entegre et.
Mimari: belgelenen modüler monolit; katmanlar ve modül sınırları korunmalı.
Dağıtım: VPS; Docker Compose ile yerelde tekrarlanabilir çalışma ve belgelenen reverse proxy/HTTPS üretim kurulumu.
Kimlik doğrulama ve içerik erişimi yalnızca sunucuda doğrulansın. İstemciden gelen rol veya sahiplik bilgisine güvenme.
Uygulama kuralları:

Önce çalışma ağacını, mevcut değişiklikleri ve çalıştırılabilir araçları kontrol et; kullanıcı değişikliklerinin üzerine yazma.
Boş controller/service/repository veya çalışmayan örnek uçlar bırakma.
Gerçek V1 davranışını küçük, tamamlanmış dikey dilimler halinde uygula.
Önce migration ve domain/API iskeleti, sonra kritik kullanıcı akışları, ardından gerekli frontend bağlantıları ve dağıtım dosyaları.
Kullanıcıların Studio’ya veya içerik yazma/yayımlama işlevlerine erişimi olmasın. Sahip yetkisini yalnızca sunucu doğrulasın.
Taslak, planlanmış, gizli ve özel yazılar için API ve SEO erişimini belgelerdeki kurallara göre uygula. Yetkisiz içerik yanıt gövdesinde, arama sonuçlarında, sitemap’te veya önbellekte sızmasın.
Parolaları ve tokenları kaynak kodda, loglarda veya frontend bundle’ında tutma. Yerel sırlar için .env.example oluştur; gerçek sır ekleme.
Parola hash’leme, oturum cookie’leri, CSRF/CORS, giriş/kayıt hız sınırlama, doğrulama ve güvenli hata yanıtlarını mimari belgesine uygun uygula.
E-posta sağlayıcısı henüz yapılandırılmamışsa arayüzünü yapılandırılabilir tut; gizli anahtar veya sahte başarılı gönderim davranışı ekleme.
İçerik için SSR/metadata/canonical/sitemap/robots kurallarını frontend’de uygula; yayımlanmamış veya gizli içerik indekslenmesin.
Frontend’deki demo/localStorage akışlarını gerçek API akışıyla değiştirirken mevcut görünümü ve erişilebilirliği koru. API bağlantısı hazır olmayan ekranlarda kullanıcıya gerçekmiş gibi sahte kalıcı veri gösterme.
Gelecek V2 özelliklerini (çok yazarlı portal, takip, yorum vb.) bu uygulamaya ekleme.
Doğrulama:

Önce ilgili testleri yaz/çalıştır; iş kuralı testleri uygulamayı gerçekten doğrulasın.
Unit testleri, Spring entegrasyon testleri, PostgreSQL ile repository/migration testleri, güvenlik/rol testleri ve gerekli frontend typecheck/test/build kontrollerini çalıştır.
Testcontainers kullanacaksan yerel Docker gereksinimini açıkça bildir; mümkün değilse nedenini ve alternatif doğrulamayı belirt.
Son kontrolde temiz kurulum komutlarını, migration çalışmasını, API health-check’ini ve frontend-backend entegrasyonunu doğrula.
Güvenlik veya SEO kabul testlerinden biri başarısızsa tamamlandı deme.
Çalışma tamamlandığında:

Değişen önemli dosyaları ve davranışları açıkla.
Uygulanan V1 dilimlerini ve henüz tamamlanmayanları belirt.
Çalıştırdığın testleri ve sonuçlarını yaz.
VPS’ye dağıtım için gereken ortam değişkenlerini, komutları ve sıradaki adımları belgeleyip özetle.
Çözülemeyen ürün kararlarını veya altyapı gereksinimlerini ayrı belirt.
Git commit veya push yapma; önce sonucu incelemem için bırak.