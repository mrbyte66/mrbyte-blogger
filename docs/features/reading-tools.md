# Okuma araçları

Durum: Kısmen uygulandı. Kalıcı yazı sayfalarında anonim, tarayıcıya özel ilk modül var; herkese açık yazar notları ve hesap eşitlemesi henüz uygulanmadı.

## Amaç ve kapsam

Yazı okurken ekran kenarındaki modüler bir araç kümesiyle metin seçme, altını çizme, fosforlu kalemle işaretleme ve not alma sağlanacak. Dokunmatik kullanım, klavye erişimi ve araçların metni kapatmaması temel gereksinimlerdir. Keyifli ek araçlar sonradan bağımsız modüller olarak eklenebilir.

Bu modül, yazının tam sayfa veya tema içindeki panelde açılmasından bağımsız çalışmalıdır. Okuma düzeni ve araçların etkinliği ayrı tema tercihleri olmalıdır.

## Görünürlük ve kayıt

- Site sahibinin herkese göstermek istediği açıklamalar, açık bir yayınlama işlemiyle kamuya açık okuma katmanına eklenir. Sahibin özel taslakları kendiliğinden yayınlanmaz.
- Ziyaretçinin notları ve işaretlemeleri özeldir. Anonim kullanıcılar da araçları kullanabilir; kayıt bu aşamada kendi tarayıcılarında tutulur. Bu kayıt farklı cihazlara taşınmaz ve tarayıcı verileri silinince kaybolabilir.
- Giriş yapmadan açılan sayfa varsayılan olarak kamuya açık içeriği ve yayınlanmış sahibi açıklamalarını gösterir. Aynı tarayıcıdaki ziyaretçi kendi yerel notlarını ayrıca görebilir. Anonim kullanım hiçbir zaman kamuya açık yazma yetkisi vermez.
- İleride üyelik geldiğinde her kullanıcı kendi notlarını hesabında görebilir ve cihazlar arasında eşitleyebilir. Yerel notların hesaba aktarılması kullanıcının açık seçimiyle yapılmalıdır; üyelik kalıcı kayıt seçeneği olarak sunulabilir.

## İçerik değişiklikleri

İşaretlemeler içerik kimliği ve sürümüne bağlı olmalıdır. Seçilen metin, çevresindeki bağlam ve blok kimliğiyle yeniden bulunabilmeli; yazı güncellendiğinde artık güvenle eşleştirilemeyen bir not yanlış metne yapıştırılmamalıdır. Böyle notlar inceleme gerektiren kayıtlar olarak gösterilmelidir.

## Kabul ölçütleri

- Metin seçimi ve işaretleme masaüstü ve dokunmatik cihazlarda okunabilirliği korur.
- Araç kümesi açılıp kapanabilir; yazının temel okuma deneyimi araçlar kapalıyken çalışır.
- Yerel kayıt sayfa yenilendiğinde aynı tarayıcıda geri gelir ve yalnızca o ziyaretçiye görünür.
- Kamuya açık sahibi açıklamaları ile ziyaretçinin özel notları ayrı tutulur.
- Metin düzenlemeleri işaretlemeleri yanlış bir bölüme sessizce taşımaz.

## Sonraki kararlar

Araçların ilk listesi, kenar yerleşimi, mobil seçim etkileşimi, yerel depolama biçimi ve not dışa aktarma seçenekleri uygulama öncesinde belirlenecek. Hesap sistemi, sunucuda eşitleme ve üyelik çağrısı sonraki aşamadır.

## Uygulanan ilk modül — 2026-10-01

`/yazilar/[slug]` sayfasında ekran kenarı araçları; dar ekranda alt araç çubuğu bulunur. Metin seçip fosforlu işaret, alt çizgi veya not eklenebilir. Not listesi, alıntıya gitme, kaldırma ve son kaldırmayı geri alma desteklenir. Kayıt yazı kimliğine göre tarayıcıda tutulur ve yenilemede geri gelir.

Metindeki işaretler CSS Custom Highlight API ile çizilir; destek bulunmadığında kaydedilen alıntı/not listesi kullanılabilir. React'in yönettiği DOM'a etiket sararak müdahale edilmez. Alıntı bağları kaydedilen metin ve bağlamla doğrulanır; yanlış veya belirsiz bir eşleşme sessizce uygulanmaz.

Bu modül yazar notlarını herkese yayınlamaz. Yayınlanmış yazar katmanı için backend ve açık yayınlama akışı; özel hesap eşitlemesi için üyelik gerekir. Panel içindeki sahne okumasına entegrasyon ve daha zengin kalem/renk araçları sonraki aşamadır. Ön yüz sözleşmesi: `../../frontend/docs/reading.md`.
