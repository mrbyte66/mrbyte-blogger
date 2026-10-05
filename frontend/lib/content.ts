export const topics = ["Tümü", "Yazılım", "Edebiyat", "Kültür"] as const;
export type Topic = (typeof topics)[number];
export type Article = {
  /** Server identity and optimistic-lock version (absent until the article is saved to the API). */
  id?: string;
  version?: number;
  visibility?: "public" | "private";
  /** Stable server block IDs aligned with paragraphs/figure/code/table, kept across edits. */
  blockIds?: { paragraphs: string[]; figure?: string; code?: string; table?: string };
  /** Studio only: the series this article belongs to. */
  seriesId?: string | null;
  /** Server-stored cover image (media URL), when one was chosen. */
  coverUrl?: string;
  slug: string;
  authored?: boolean;
  status?: "scheduled" | "draft" | "published" | "archived" | "trashed";
  title: string;
  category: Exclude<Topic, "Tümü">;
  categories?: readonly Exclude<Topic, "Tümü">[];
  createdAt?: string;
  publishedAt?: string;
  scheduledAt?: string;
  eyebrow: string;
  excerpt: string;
  minutes: number;
  presentation?: { width: "comfortable" | "wide"; heading: "left" | "center"; showMeta: boolean };
  paragraphs: readonly string[];
  code?: string;
  figure?: { src: string; alt: string; caption: string; width: number; height: number };
  table?: { caption: string; columns: readonly string[]; rows: readonly (readonly string[])[] };
};

/** A compact chapter-list preview taken from the article body, not its editorial abstract. */
export function articleBodyPreview(article: Article, maxLength = 200): string {
  const body = article.paragraphs.join(" ").replace(/\s+/g, " ").trim();
  if (body.length <= maxLength) return body;
  const sentences = body.match(/[^.!?…]+(?:[.!?…]+(?=\s|$)|$)/g) ?? [body];
  let preview = "";
  for (const sentence of sentences) {
    preview = `${preview}${preview ? " " : ""}${sentence.trim()}`;
    if (preview.length >= maxLength) break;
  }
  return preview;
}

// Editorial fixtures, explicitly labeled in the interface. Not published user content.
const editorialFixtures: readonly Article[] = [
  {
    slug: "yapay-zeka-ile-dusunmek",
    title: "Yapay zekâ ile düşünmek",
    category: "Yazılım",
    eyebrow: "YAPAY ZEKÂ / GELİŞTİRİCİ GÜNLÜĞÜ",
    excerpt: "Cevap üretmek kolaylaştığında, iyi bir soru sormanın değeri artıyor.",
    minutes: 3,
    figure: {
      src: "/assets/thinking-loop.svg", width: 1200, height: 600,
      alt: "Soru, deneme ve değerlendirme aşamalarından oluşan düşünme döngüsü.",
      caption: "Araç cevap üretir; soruyu ve değerlendirme ölçütünü geliştirici belirler.",
    },
    table: {
      caption: "Bir öneriyi değerlendirirken — örnek kontrol tablosu",
      columns: ["Aşama", "Sorulacak soru", "Beklenen çıktı", "Kontrol", "Sonraki adım"],
      rows: [
        ["Problemi tanımla", "Hangi ihtiyacı karşılıyoruz?", "Açık bir problem cümlesi", "Varsayımları görünür kıl", "Sınırları belirle"],
        ["Öneriyi dene", "Hangi durumda çalışmıyor?", "Küçük ve incelenebilir bir örnek", "Uç durumları karşılaştır", "Örneği düzelt"],
        ["Değerlendir", "Sonucu açıklayabiliyor muyuz?", "Gerekçesi anlaşılabilen bir karar", "Beklentilerle karşılaştır", "İlerle veya yeniden dene"],
      ],
    },
    paragraphs: [
      "Bir geliştirici olarak günün büyük kısmını kod yazarak geçirdiğimizi düşünürüz. Oysa zamanımızın önemli bir bölümü neyi, neden ve hangi sınırlar içinde yapacağımızı anlamaya gider.",
      "Yapay zekâ bu sürecin ritmini değiştiriyor. Bir fikri daha hızlı deneyebiliyor, alternatifleri yan yana koyabiliyoruz. Fakat hızlı bir cevap, doğru bir problem tanımı anlamına gelmiyor. Sistemin hangi durumda başarısız olacağını hâlâ bizim sormamız gerekiyor.",
      "Aşağıdaki küçük örnekte kararın kendisini açık bir sözleşmeye taşıyoruz. Böylece onu üreten araç değişse bile uygulamanın beklentisi okunabilir kalıyor.",
      "Belki de yeni beceri, her satırı kendimiz yazmak kadar, hangi satırın neden var olduğunu açıklayabilmek. Araçlar hızlandıkça düşünmeye ayırdığımız zamanı korumak daha önemli oluyor.",
    ],
    code: 'public record Suggestion(String text, double confidence) {\n    public boolean needsReview() {\n        return confidence < 0.90;\n    }\n}',
  },
  {
    slug: "iyi-kodun-sessizligi",
    title: "İyi kodun sessizliği",
    category: "Yazılım",
    eyebrow: "YAZILIM / TASARIM",
    excerpt: "Bazı kodlar kendini anlatır. Bazılarıysa seni bir toplantıya davet eder.",
    minutes: 4,
    paragraphs: [
      "İyi bir soyutlama, ayrıntıları gizlerken niyeti görünür bırakır. Bir metoda bakıp ne yaptığını anlayabiliyorsak, çoğu zaman onu nasıl yaptığını hemen okumamız gerekmez.",
      "Bakımı kolay sistemler küçük kararlardan oluşur: doğru bir isim, dar bir arayüz, açık bir hata davranışı. Her biri, altı ay sonraki okurun işini biraz daha kolaylaştırır.",
      "Kodun sessizliği burada başlar. Gösterişli bir çözüm yerine, gerektiğinde güvenle değiştirebildiğimiz bir yapı kalır.",
    ],
  },
  {
    slug: "satir-aralarinda",
    title: "Satır aralarında bir yer",
    category: "Edebiyat",
    eyebrow: "EDEBİYAT / OKUMA NOTLARI",
    excerpt: "Bir kitabı kapatınca geriye kalan, bazen tek bir cümlenin açtığı boşluktur.",
    minutes: 2,
    paragraphs: [
      "Bazı kitapları bitiririz, bazıları bizimle yürümeye devam eder. Günlük bir konuşmada, bir pencerenin önünde veya sıradan bir yolculukta yeniden belirirler.",
      "Okuma notu tutmak, her şeyi hatırlamak için değil; bir cümlenin bizi neden durdurduğunu yeniden düşünmek için bir fırsat olabilir.",
      "Bu alanda kitaplardan kalan düşünceler, kısa metinler ve henüz tamamlanmamış sorular için yer var.",
    ],
  },
  {
    slug: "merak-bir-aliskanlik",
    title: "Merak da bir alışkanlık",
    category: "Kültür",
    eyebrow: "KÜLTÜR / KISA NOT",
    excerpt: "Bildiğimiz şeylerin dışına küçük bir adım atmak üzerine.",
    minutes: 2,
    paragraphs: [
      "Bir konuyu anlamaya çalışırken beklenmedik bir başka konuyla karşılaşmak, öğrenmenin en güzel taraflarından biri. Teknolojiden tasarıma, tasarımdan tarihe uzanan yollar böyle açılıyor.",
      "Her merakın hemen bir işe dönüşmesi gerekmiyor. Bazen bir şeyi yalnızca ilginç olduğu için öğrenmek yeterli.",
    ],
  },
  {
      "slug": "problemi-once-tanimlamak",
      "title": "Önce problemi tanımlamak",
      "category": "Yazılım",
      "eyebrow": "YAPAY ZEKÂ / ÖRNEK SERİ",
      "excerpt": "İyi bir yapay zekâ deneyi, çözümden önce sınırları belirler.",
      "minutes": 2,
      "paragraphs": [
          "İstenen sonucu tek bir cümleyle anlatmak, hangi kararların hâlâ belirsiz olduğunu gösterir. Bir özellik isteğiyle kullanıcı ihtiyacını ayrı yazmak bu yüzden faydalıdır.",
          "Küçük bir kabul örneği belirle: girdi nedir, çıktı nasıl görünür, hangi durumda öneriyi reddedersin? Araçla konuşmadan önce bu soruları cevaplamak, denemeyi değerlendirmeyi kolaylaştırır."
      ]
  },
  {
      "slug": "baglami-kucuk-tutmak",
      "title": "Bağlamı küçük tutmak",
      "category": "Yazılım",
      "eyebrow": "YAPAY ZEKÂ / ÖRNEK SERİ",
      "excerpt": "Modele bütün projeyi anlatmak yerine karar için gereken parçayı vermek.",
      "minutes": 2,
      "paragraphs": [
          "Bir değişiklik için önce ilgili sözleşmeyi, sonra onu kullanan örneği paylaş. Gereksiz dosyalar önemli kısıtların görünürlüğünü azaltır.",
          "Bağlam seçimini bir arayüz tasarımı gibi düşün: görev, sınırlar ve mevcut davranış anlaşılır olmalı. Yeni bir ayrıntı eklediğinde neden gerektiğini de belirt."
      ]
  },
  {
      "slug": "kucuk-deneyler-tasarlamak",
      "title": "Küçük deneyler tasarlamak",
      "category": "Yazılım",
      "eyebrow": "YAPAY ZEKÂ / ÖRNEK SERİ",
      "excerpt": "Bir öneriyi bütün sisteme taşımadan önce sınanabilir bir örnek kurmak.",
      "minutes": 2,
      "paragraphs": [
          "Yeni bir fikri en küçük çalışan örnekte denemek, başarıyı ölçmeyi kolaylaştırır. Bu örnek üretim sisteminin tüm ayrıntılarını taklit etmek zorunda değildir.",
          "Bir denemede tek bir varsayımı değiştir. Sonuçları aynı kabul ölçütleriyle karşılaştır; böylece hızla üretilen alternatifler arasında gerekçeli bir seçim yapabilirsin."
      ]
  },
  {
      "slug": "ciktilari-sozlesmeyle-sinirlamak",
      "title": "Çıktıyı sözleşmeyle sınırlamak",
      "category": "Yazılım",
      "eyebrow": "YAPAY ZEKÂ / ÖRNEK SERİ",
      "excerpt": "Serbest metni uygulama verisine çevirirken doğrulama sınırı kurmak.",
      "minutes": 2,
      "paragraphs": [
          "Bir modelin ürettiği cevap uygulamanın güvenilir verisi hâline kendiliğinden gelmez. Beklenen alanları ve kabul edilen değerleri açıkça tarif etmek ilk adımdır.",
          "Çıktıyı doğrula, eksik veya geçersiz değerleri görünür bir hata davranışıyla karşıla. Başarısız bir öneriyi sessizce geçerli saymak sonraki katmanları belirsizlikle doldurur."
      ]
  },
  {
      "slug": "test-edilebilir-kararlar",
      "title": "Test edilebilir kararlar",
      "category": "Yazılım",
      "eyebrow": "YAPAY ZEKÂ / ÖRNEK SERİ",
      "excerpt": "Araç değişse de davranışı koruyan küçük birim testleri.",
      "minutes": 2,
      "paragraphs": [
          "Testler kodun satırlarını tekrar etmek yerine verilen bir durumda beklenen davranışı ifade etmeli. Bir başarısız örnek, kabul sınırını anlatan değerli bir belgedir.",
          "Dış servisleri karar mantığından ayırmak, testleri hızlı ve anlaşılır tutar. Üretilen kodu incelerken yalnızca test sayısına değil, hangi yanlış davranışları yakaladığına bak."
      ]
  },
  {
      "slug": "hata-durumlarini-tasarlamak",
      "title": "Hata durumlarını tasarlamak",
      "category": "Yazılım",
      "eyebrow": "YAPAY ZEKÂ / ÖRNEK SERİ",
      "excerpt": "Zaman aşımı, boş cevap ve tekrar denemede tutarlı davranış.",
      "minutes": 2,
      "paragraphs": [
          "Mutlu yolun yanında servis erişilemediğinde ne olacağını da belirle. Kullanıcı bir işlemin neden tamamlanmadığını anlayabilmeli.",
          "Tekrar deneme sayısını sınırlamak ve aynı işlemin iki kez yürütülmesini düşünmek, küçük bir prototipten güvenilir bir akışa geçerken önem kazanır. Hata bilgisi çözüm için yeterli, kullanıcı için anlaşılır olmalı."
      ]
  },
  {
      "slug": "kod-incelemesinde-yapay-zeka",
      "title": "Kod incelemesinde yapay zekâ",
      "category": "Yazılım",
      "eyebrow": "YAPAY ZEKÂ / ÖRNEK SERİ",
      "excerpt": "İkinci bir bakışı kullanırken kararın sorumluluğunu korumak.",
      "minutes": 2,
      "paragraphs": [
          "Bir inceleme isteğini belirli bir soruya odaklamak daha yararlı geri bildirim getirir: hangi koşulda veri kaybı olabilir veya hangi bağımlılık gereksiz büyümüştür?",
          "Her öneriyi mevcut sözleşme ve testlerle karşılaştır. İnceleme aracının kendinden emin olması bulgunun doğru olduğunu kanıtlamaz; uygulanabilir bir örnek aramak gerekir."
      ]
  },
  {
      "slug": "kucuk-projeyi-yayinlamak",
      "title": "Küçük projeyi yayınlamak",
      "category": "Yazılım",
      "eyebrow": "YAPAY ZEKÂ / ÖRNEK SERİ",
      "excerpt": "Gözlem, geri bildirim ve bakım için ilk sürümü hazırlamak.",
      "minutes": 2,
      "paragraphs": [
          "Yayınlamak yalnızca çalışan kodu bir sunucuya taşımak değildir. Uygulamanın durumunu görebilmek ve bir hatadan geri dönebilmek de ilk sürümün parçasıdır.",
          "Dar bir kapsamla başla, gerçek geri bildirimi topla ve değişiklikleri küçük tut. Yapay zekâ geliştirme hızını artırabilir; bakımın anlaşılır kalması ise bilinçli tasarım kararlarına bağlıdır."
      ]
  },
];

export const articles: readonly Article[] = editorialFixtures.map((article, index) => ({
  ...article,
  categories: [article.category],
  createdAt: new Date(Date.UTC(2026, 7, index + 1)).toISOString(),
  publishedAt: new Date(Date.UTC(2026, 9, 4 - index)).toISOString().slice(0, 10),
}));

export function filterArticles(topic: Topic): readonly Article[] {
  return topic === "Tümü" ? articles : articles.filter((article) => (article.categories ?? [article.category]).includes(topic));
}

export function findArticle(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}
