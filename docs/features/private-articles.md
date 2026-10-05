# Kilitli ve gizli yazılar

Durum: İlerisi için not. İlk dilim site sahibinin özel yazıları içindir; üyelere açılması sonraki karar.

Sahip Studio'da yazıyı **özel/kilitli** olarak işaretleyebilmeli. Bu yazı herkese açık listelerde, aramada, serilerde, sitemap veya kalıcı bağlantıda ziyaretçilere görünmemeli. Sadece sahibi yazıyı bulup okuyup düzenleyebilmeli. Kilitli yazıyı sonradan yayınlamak veya taslağa çevirmek açık bir durum değişikliği olmalı. Taslak ve arşiv kavramları var olan iş akışlarıyla uyumlu olmalı; özel yazı bir yayın tarihi alarak kendiliğinden açığa çıkmamalı.

İlk sürüm sadece site sahibine ait içerik için uygulanır. V2'de üyelerin kendi kilitli yazıları düşünülebilir; yazarlık/Studio yetkisi vermek veya özel içeriği ortak portala eklemek anlamına gelmez. Sahip panelinde herkese açık ve özel yazıların ayrımı açıkça gösterilmelidir.

Erişim, yalnızca arayüzde gizleme ile korunamaz. Spring Boot; sahip/yazar kimliğini oturumdan belirlemeli ve yetkisiz isteklere kilitli içeriğin kendisini, metaverisini ve medyasını vermemelidir. Next.js sunucu render'ı, API uçları, arama, öneriler, kapak/medya erişimi, önizleme, sitemap ve önbellek politikaları birlikte gözden geçirilmelidir. İstemci rolü ve tahmin edilebilir URL koruma sayılmaz.

Yayın planlama ile ilişkisi: `scheduled` açıkça ileri tarihli yayın talebidir; `private` ise sahibi dışında hiçbir ziyaretçiye açılmayan erişim durumudur. Bir özel yazı ancak sahip yayın görünürlüğünü açıkça değiştirirse kamuya çıkmalıdır. Taslak, planlandı, yayında, arşiv ve çöp kutusu durumlarıyla geçişler ayrı ayrı tasarlanıp test edilmelidir.
