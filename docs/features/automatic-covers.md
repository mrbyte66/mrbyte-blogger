# Yazı ve seriler için otomatik kapak

Durum: Ön yüzde görselli katalog kartları ve yerel taslak kapaklar uygulandı. Çevrimiçi görsel araması henüz uygulanmadı. Mevcut frontend tarayıcıda çalışır; Spring Boot backend henüz başlatılmadı.

Yazılar penceresi iki sütunlu orta boy kapaklı kartlar kullanır; dar tuvalde tek sütuna geçer. Seriler geniş kartlarla ayrışır. Yerel SVG kapaklar tasarım örneğidir; çevrimiçi arama sonucu olarak sunulmaz. Mevcut özel seri kapakları önceliklidir ve seri detayında/Studio tuvalinde aynı kapak görüntülenir. Yazı için kalıcı kapak seçme ve çevrimiçi atama akışı sonraki aşamadır.

## İstenen deneyim

Site sahibi yazı veya seri hazırladığında sistem, içerikle uyumlu ve kullanım lisansı belli bir fotoğrafı internetten bulup varsayılan kapak olarak atar. Yazı kartları küçük, yalnızca metinden oluşan satırlar yerine rahat okunabilen, görsel ağırlıklı kartlara dönüşür. Seri kartları da aynı kapak sistemini kullanır. Daha büyük kartlar daha fazla metin veya kalabalık kontroller gerektirmez.

## Seçim ve Studio akışı

- Yazının başlığı, özeti, kategorisi ve gerektiğinde gövdesinden konu çıkarılır. Seri için başlık, açıklama ve bölüm başlıkları birlikte değerlendirilir. Türkçe içerik sağlayıcının desteklediği arama diline uygun sorguya dönüştürülür.
- İlk uygun kayıt sırasında arama arka planda başlar; yazıyı kaydetmeyi engellemez. Boş taslaklar ve her tuş vuruşu arama tetiklemez.
- Uygun bulunan fotoğraf varsayılan kapaktır. Studio'da kapak önizlemesi, kaynak bilgisi, alternatif seçme, yeniden bulma, kendi görselini kullanma ve kapaksız bırakma seçenekleri bulunur.
- Seçilen kapak içerikle birlikte saklanır; ziyaretçi sayfayı her açtığında yeniden arama yapılmaz ve fotoğraf değişmez. Başlık değişikliği mevcut kapağı sessizce değiştirmez. Kullanıcının seçtiği kapak veya kapaksız tercihi otomatik işlemle ezilmez.
- Arama sonucu geç gelirse güncel içerik sürümü ve kapak tercihi kontrol edilir; eski istek yeni seçimin üzerine yazamaz.
- Eşleşme yetersizse veya sağlayıcıya ulaşılamazsa alakasız fotoğraf seçilmez. Temayla uyumlu sade bir yer tutucu kullanılır; Studio durumu ve yeniden deneme seçeneğini gösterir.

## Kaynak ve mimari

İlk sağlayıcı adayı Pexels'tir; fotoğraf araması ve API anahtarı sunucu tarafındaki Spring Boot servisinde tutulur. Next.js route handler veya tarayıcıya gömülü gizli anahtar kullanılmaz. Sağlayıcı entegrasyonu değiştirilebilir bir arayüzün arkasında olmalıdır. API ve veritabanı sözleşmeleri backend aşamasında kesinleştirilecek.

“Telifsiz” ifadesi yerine sağlayıcının kullanım lisansına uygun fotoğraf esas alınır. Görselle birlikte sağlayıcı kimliği, fotoğraf kimliği, kaynak sayfası, fotoğrafçı/atıf bilgisi ve lisans bağlantısı saklanır. Genel web/görsel arama sonuçları lisans kanıtı sayılmaz. İndirme, saklama, önbellekleme ve atıf davranışı sağlayıcının güncel koşullarına göre belirlenir.

Pexels API kullanımı için Pexels bağlantısı görünür olmalı; mümkün olduğunda fotoğrafçıya kaynak fotoğraf bağlantısıyla kredi verilmelidir. API anahtarı gerekir. Sağlayıcı kotası için sonuç önbelleği, sınırlandırılmış yeniden deneme ve istek birleştirme düşünülmelidir. Bu araştırma bir API hesabı oluşturmadı veya canlı entegrasyon kurmadı.

Kaynaklar (2026-10-03):
- [Pexels API dokümantasyonu](https://www.pexels.com/api/documentation/)
- [Pexels lisansı](https://www.pexels.com/legal-pages/license/)

## Görsel tasarım ve kabul ölçütleri

- Yazı/seri kapakları ortak davranışa sahip olur; yazının gövdesindeki görselden bağımsız düzenlenir.
- Kartlar mevcut minimalist tipografi, yuvarlatılmış yüzey ve kenarlık geri bildirimini korur. Başlık, kısa özet ve okuma süresi rahatça okunur; görsel metnin önüne geçmez.
- Kapak oranı baştan ayrılarak yüklenirken yerleşim sıçraması önlenir. Mobilde taşma, bozuk görsel simgesi veya okunmayan metin oluşmaz. Açık/koyu tema ve klavye odağı korunur.
- Ziyaretçi ve Studio tuvali aynı kapak verisini ve render bileşenini kullanır. Atıf bağlantıları kartın tıklanabilir alanıyla iç içe etkileşimli öğe oluşturmaz.
- İçerik eşleşmesi, manuel seçim önceliği, kapaksız tercih, eski yanıtların reddi, lisans/atıf kaydı, kota/hata davranışı ve yeniden ziyarette kararlı kapak test edilir.

## Aşamalar

1. Frontend: daha büyük görselli yazı kartları ve yazı/seri ortak kapak sunumu tamamlandı. Studio'da seri görsel adresi düzenlenebilir; kapsamlı kapak seçimi ve yazı kapağı düzenleme akışı planlandı.
2. Backend: sağlayıcı hesabı/anahtarı, güvenli görsel arama, konu eşleştirme, kalıcı medya kaydı ve asenkron otomatik atama.
3. Gerçek içeriklerle seçim kalitesi ve tüm temalarda görsel uyum değerlendirmesi.
