export const topics = ["Tümü", "Yazılım", "Edebiyat", "Kültür"] as const;
export type Topic = (typeof topics)[number];
export type Article = {
  slug: string;
  title: string;
  category: Exclude<Topic, "Tümü">;
  eyebrow: string;
  excerpt: string;
  minutes: number;
  paragraphs: readonly string[];
  code?: string;
};

// Editorial fixtures, explicitly labeled in the interface. Not published user content.
export const articles: readonly Article[] = [
  {
    slug: "yapay-zeka-ile-dusunmek",
    title: "Yapay zekâ ile düşünmek",
    category: "Yazılım",
    eyebrow: "YAPAY ZEKÂ / GELİŞTİRİCİ GÜNLÜĞÜ",
    excerpt: "Cevap üretmek kolaylaştığında, iyi bir soru sormanın değeri artıyor.",
    minutes: 3,
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
];

export function filterArticles(topic: Topic): readonly Article[] {
  return topic === "Tümü" ? articles : articles.filter((article) => article.category === topic);
}

export function findArticle(slug: string): Article | undefined {
  return articles.find((article) => article.slug === slug);
}
