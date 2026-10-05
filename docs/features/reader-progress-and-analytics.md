# Okuma rozetleri ve kapsamlı istatistikler

Durum: İlerisi için ürün notu. Üyelik ve gerçek olay verisi backend'i gelmeden uygulanmayacak.

## Okur ilerlemesi ve rozetler

Üyeler okuma davranışlarına göre profillerinde ilerleme ve rozet görebilir. Örnek düzeyler: “Sık okuyucu” ve daha seyrek okuma için daha başlangıç düzeyi rozetler. Rozet eşikleri, zaman penceresi, art arda gün şartı, seri tamamlanması gibi ölçütler henüz kararlaştırılmadı. Eşikler anlaşılır olmalı; hızla sayfa açmak tek başına okuma kanıtı sayılmamalı. Serilerdeki ziyaret geçmişi için `blog-series.md` içindeki kural geçerlidir: ziyaret kaydı bölümün tamamlandığı anlamına gelmez.

Üye kendi rozet ve ilerlemesini profilinde görebilir. Bu, diğer üyelerin özel kitaplığını, notlarını, geçmişini veya ayrıntılı oturumlarını açığa çıkarmaz.

## Sahip için dinamik istatistik çalışma alanı

Site sahibi tüm üyeler ve yayınlar için yönetim amaçlı istatistik görebilir. Yazı bazında en azından görüntülenme, alkış ve kaydetme sayıları düşünülebilir. Kullanıcının bir yazıda geçirdiği süre, cihaz türü (mobil/masaüstü), dönem ve diğer anlamlı ölçüler veri tanımı ve mahremiyet incelemesinden sonra kapsama alınabilir. Tekil kullanıcının kimliği veya davranışının raporda gösterilmesi varsayılan değildir; toplu ölçüler önceliklidir.

Rapor arayüzünde sahip:

- ölçmek istediği metrikleri seçer,
- tarih aralığı, yazı, cihaz türü gibi desteklenen kırılımları seçer,
- karşılaştırılacak yazı/kitle/dönemleri belirler,
- sonucu tablo halinde görür, sıralar ve dışa aktarma ayrıca tasarlanır.

Metrikler karşılaştırılabilir ve açıklanabilir tanımlara sahip olmalı (ör. görüntülenme ile tekil ziyaret aynı şey değildir). Okuma süresi tahmininin sekme arka plandayken, açık unutulmuşken veya içerik gerçekten okunmadan artmaması için ölçüm kuralları tasarlanmalı. Toplama amacı, saklama süresi, erişim yetkileri, yasal dayanak ve üyeye sunulacak gizlilik açıklaması backend öncesi kararlaştırılmalı. Üyenin kendi profilinde gördüğü rozetler ile yöneticinin operasyon raporu farklı erişim katmanlarıdır.

## Gelecek uygulama sırası

1. Kullanıcı mahremiyeti, olay şeması ve metrik tanımları üzerinde anlaş.
2. Spring Boot tarafında görüntülenme, alkış, kitaplığa ekleme ve doğrulanmış okuma süresi olaylarını güvenilir biçimde topla.
3. Üye profilinde yalnızca kendi ilerlemesini göster.
4. Yöneticiye seçimli metrik/kırılım ve karşılaştırma tablosu sun.
5. Rozet eşiklerini ve kullanıcılara görünür açıklamalarını doğrulanmış veriye göre tanımla.

Bu belge analitik izin veya sınırsız kişisel takip yetkisi değildir. Uygulama, veri minimizasyonu ve açık ürün/gizlilik kararlarından sonra yapılmalıdır.
