# V1 API sözleşmesi

Tarih: 2026-10-05. Durum: önerilen uygulama sözleşmesi, çalışan API değildir. [Mimari](backend-architecture.md) içindeki Ü varsayımları ve durum matrisi geçerlidir. Route'lar origin'e göreli `/api/v1` altındadır; OAuth callback de Spring'e gider. Frontend URL'leri Türkçe, API isimleri İngilizcedir. DB entity'leri dışarı serialize edilmez.

## 1. Ortak protokol

- JSON UTF-8; UUID string; anlar RFC3339 UTC (`2026-10-20T09:00:00Z`), gün `YYYY-MM-DD`, zone IANA (`Europe/Istanbul`). `null` açık kaldırma, eksik alan PUT'ta invalid; PATCH yalnız belirtilen allowlist alanlarını değiştirir. Unknown alanlar 422; role/ownerId/counter/verified istemciden yazılamaz.
- Başarılı read/update 200, create 201+Location, delete/logout 204, async iş 202+jobId. Her kaynakta version; write öncesi `If-Match: "7"`. Eksik 428, eski 412 (`STALE_VERSION`). Kaynağı yeniden oku ve kullanıcıya conflict sun; client sessiz overwrite yapmaz.
- POST create/lifecycle/import için `Idempotency-Key: UUID` zorunlu (auth endpoint'leri hariç). 24 saat aynı principal+route+key aynı sonucu döndürür; body farklıysa 409. Key kaydı ile DB etkisi aynı transaction. DELETE olmayan kayıt için 204; owner trash komutu zaten trash ise no-op. Yetkisiz resource kimliği her zaman 404, bu idempotency istisnasıyla bilgi sızdırmaz.
- Precondition istisnaları: yeni kaynak POST/create, auth, impressions/visits, clap ve bookmark hedef-durum işlemlerinde If-Match gerekmez. Annotations create If-None-Match, update If-Match kullanır. Impressions/visits eventId ve annotations import clientImportId kendi idempotency anahtarıdır; bu üç uçta ayrıca Idempotency-Key istenmez.
- PUT clap/bookmark istenen durumu atar; retry aynı hedefe çift artış üretmez. Ayrı sekmelerin farklı hedefleri son commit kazanır; frontend her aktör/yazı için mutasyonları sıraya alır, eski response yeni UI durumunu ezmez ve focus'ta tekrar okur.
- Liste biçimi: `{items:[],page:0,size:20,totalElements:0,totalPages:0,sort:"date_desc"}`. size 1–50, page 0–1000. Filtrelenmiş total; pagination eşzamanlı içerik değişirken snapshot garantisi vermez, frontend id ile tekilleştirir. Scroll aynı endpoint'in sonraki sayfasını kullanır. `q` trim 1–100, server parametreli arama. Sort değerleri allowlist; her sıraya UUID tie-breaker. Studio UTC tarihleri; isim sırası Türkçe collation.
- Hatalar `application/problem+json`: `{type:"urn:satir:problem:validation",title:"Alanları kontrol et",status:422,code:"VALIDATION_FAILED",detail:"…",requestId:"…",errors:[{field:"title",code:"REQUIRED"}]}`. Stack trace, SQL, token, private başlık yok. 400 malformed JSON, 401 session yok/expired, 403 role/verification/CSRF, 404 yok/gizli, 409 business conflict, 412 version, 413 boyut, 415 tür, 422 validation, 429 Retry-After, 503 dependency unavailable.
- Bütün auth/me/studio/media ve V1 public content yanıtları `Cache-Control: no-store`; auth/private ayrıca `private`. `Vary: Cookie` cache izni anlamına gelmez. Browser credentials=same-origin. POST/PUT/PATCH/DELETE için `X-CSRF-TOKEN`; OAuth callback state/nonce istisnası. Request-id server üretir veya doğrulanmış sınırlı biçimi kabul eder.
- Access: **P** public okuma, **A** anonim veya girişli aktör+CSRF, **M** doğrulanmış ACTIVE member veya owner, **O** OWNER, **R** recent reauth+M. Public endpoint owner'a da yalnız public veri verir.

## 2. Ortak kaynak biçimleri

### Article

`ArticleSummary`: `id,slug,url,title,eyebrow,abstract,bodyPreview,categories:[{id,slug,name}],displayDate,readingMinutes,cover:MediaPublic|null,stats:{views,claps,saves}`. bodyPreview mevcut davranış gibi ilk ~200 karakteri cümleyi tamamlayarak alır (taşıma üst sınırı 2000); abstract ayrı alandır. Kategori sırası editoryal, ilk kategori fallback'tır.

`ArticleDetail`: Summary + `revisionId,document,presentation,seo,firstPublishedAt,publicModifiedAt,series:null|{id,slug,title,position,total,previous:Link|null,next:Link|null}`. total/previous/next yalnız kamu bölümleri. `Link={id,slug,title,url}`. readingMinutes server türevi (öneri: 200 kelime/dk, min 1); frontend fixture minutes değeri import edilmez.

`ArticleEdit`: `id,version,createdAt,updatedAt,status,visibility,scheduledAt,scheduleZone,firstPublishedAt,lastPublishedAt,revisionId` + aşağıdaki yazılabilir alanlar. Private DTO yalnız O.

`ArticleWrite` (tam replacement):
- `title` 0–200; yayın için nonblank; `slug` ASCII `[a-z0-9]+(-[a-z0-9]+)*`, 1–100.
- `eyebrow` 0–160; `abstract` 0–4000; `displayDate` geçerli takvim günü; `categoryIds` benzersiz 0–10 UUID (yayında >=1).
- `document:{schemaVersion:1,blocks:[…]}` en çok 500 blok/1 MiB JSON.
- `presentation:{width:"comfortable"|"wide",heading:"left"|"center",showMeta:boolean}`.
- `seo:{title:null|string<=200,description:null|string<=400,indexable:boolean}`; canonical serbest URL olarak yazılamaz, server türetir. `indexable:true` hidden içeriği yayımlamaz.
- `cover:{mode:"auto"|"manual"|"none",assetId:UUID|null}`; manual için READY asset, none için null. Body görseli cover'dan ayrıdır.
- `seriesPlacement:null|{seriesId:UUID}`. Üyelik değişiminde request'e `seriesVersions:[{id,version}]` eklenir; eski ve yeni seriler tam olmalı. Mevcut üyelik değişmiyorsa alan boş liste. Server invalid/foreign membership'i 409 yapar.

`ArticleCreate`: aynı alanlar; `slug` ve `displayDate` omitted olabilir: title-derived benzersiz slug (collision 409+suggestedSlug), boş title için `draft-<uuid>`; displayDate site timezone'da oluştuğu gün. Server status=draft, visibility=public; private başlangıç için `visibility:"private"` yalnız create'te kabul edilir. Sonraki görünürlük değişimi action ile yapılır. createdAt daima server saatidir; yalnız owner import eski kaynak tarihini provenance ile koruyabilir.

### İçerik blokları

Bütün bloklar `{id:UUID,type,…}`; aynı revision'da ID tekil, metin düzenlemesinde ID korunur. Sıra dizi sırası; bilinmeyen type/schema 422. Ham HTML/JS/CSS/iframe yok; React text escape. Başlık, özet ve makale gövdesi ayrı; JSON şema discriminated union olarak OpenAPI'ye aktarılır.

| type | Alanlar |
| --- | --- |
| paragraph | text 0–20.000; MVP plain text |
| heading | text 1–300, level 2 veya 3 |
| quote | text 1–4000, attribution 0–200 |
| code | text 0–50.000, language allowlist/plain, caption 0–300 |
| image | assetId, alt 0–500, caption 0–1000; ölçü asset'ten |
| table | caption 0–300, columns 1–20 string<=200, rows en çok 200; hücre <=2000 ve sütun sayısı eşit |

Not anchor'ları `id`'ye dayanır; abstract için server tanımlı stable anchor `abstract` desteklenir (API anchor blockId UUID veya literal abstract). Sürümün text quote'uyla tutarlılık server'da doğrulanır.

### Series ve site

`SeriesSummary={id,slug,url,title,summary,ongoing,cover,chapterCount,stats:{views,claps,saves}}`; tarih/difficulty yok. `SeriesDetail` + `presentation,seo` ve ayrı sayfalı chapter endpoint'i. Public bölümler position'a göre ardışık display number alır; gizli pozisyon boşlukları dışarı çıkmaz.

`SeriesWrite={title:1..160,slug:1..100,summary:0..1000,ongoing:boolean,cover,presentation:{heading:left|center,chapterStyle:cards|rows},seo,chapterIds:UUID[],articleVersions:[{id,version}]}`. En çok 200 bölüm; duplicate/yazının başka seride olması 409. Sadece eklenen/çıkarılan article version'ları zorunlu; reorder aynı üyelerde makale version gerektirmez. Controller article/series kilitlerini ortak sırayla alır. Yeni seri draft; lifecycle ayrı endpoint. Arşivli/trash serinin üyeliği rezerve kalır.

`ThemeDocument={schemaVersion:1,name,siteName,accent,typography,surface,width,spacing,blocks}`. Mevcut `builder/model.ts` allowlist (header,intro,scene,articles,series,quote,about,projects,footer), property sınırları ve enum'ları korunur. Ek sınır: ad 80, scene/intro metin 4000, quote/about 8000, tema JSON 256 KiB. block ID/kind tekil; header ilk/footer son, scene XOR intro lead, draft boş olabilir, apply için en az bir içerik bloğu. Scene binding'leri `featuredArticleId`, `featuredSeriesId`; show flag false seçimi silmez. Article feed `categoryId|null`; UUID. Public site cevabında hidden/missing binding `null`, id/başlık/cover dahil çözülmez. Site settings author public name, site SEO ve indexingEnabled içerir; siteName yalnız applied ThemeDocument'ten türetilir; deployment gate ayrıca gerekir.

## 3. Public okuma ve SEO

| Method / path | Yetki | Request → response |
| --- | --- | --- |
| GET /site | P | Uygulanmış ThemeDocument'in public projection'ı + siteName/seo/indexingEnabled; draft yok |
| GET /categories | P | `{items:[{id,slug,name}]}` yalnız public kullanımda olan konular |
| GET /articles | P | `page,size,q,categoryId,sort=date_desc\|date_asc\|title_asc` → ArticleSummary page; varsayılan date_desc |
| GET /articles/by-slug/{slug} | P | ArticleDetail veya alias için `{resolution:"redirect",canonicalPath}`; hidden/yok 404. Next 308 üretir |
| GET /series | P | page,size,q,sort=title_asc (varsayılan) → SeriesSummary page |
| GET /series/by-slug/{slug} | P | SeriesDetail veya aynı alias cevabı; empty/hidden 404 |
| GET /series/{id}/chapters | P | page,size → ArticleSummary + chapterNumber page; sıra sabit position |
| GET /articles/{id}/stats | P | `{views,claps,saves}`; hidden 404 |
| GET /seo/urls | P | page,size → `{path,lastModified}` page; yalnız indexable ve gate açık public kayıtlar, aksi boş |
| GET /media/{id} | P veya O | Güncel public referans varsa byte stream; aksi yalnız O erişir; diğerleri 404. İzin verilen Range request'te de auth kontrolü |

Tamamen public DTO'larda `bookmarked`, clapByMe, history gibi kişiselleştirme yok; ayrı private uçlardan alınır. `/seo/urls` içindeki path canonical base'e eklenir, kullanıcı URL'si kabul edilmez. API'nin kendisi `X-Robots-Tag:noindex`; indekslenen şey Next HTML sayfalarıdır.

Public arama title/abstract/category üzerinde; private makale hiçbir filtre veya sayaç total'ına katkı vermez. Kataloglar arama boşken server-rendered sayfalı linkler sunar. GET yan etkisi sayaç/mail/yayın değildir.

## 4. Üyelik ve oturum

`Profile={id,name,email,verified,avatar,role,preferences:{publicationEmail,timeZone},version}`; yalnız kendi hesabı. Public author adı ayrı siteSettings'tir. Avatar enum mevcut 60 hazır anahtar; upload V2.

| Method / path | Yetki | Girdi → çıktı / kural |
| --- | --- | --- |
| GET /auth/csrf | anonim | `{token,headerName:"X-CSRF-TOKEN"}`; session oluşturabilir, no-store |
| POST /auth/register | anonim+CSRF | `{name,email,password,passwordConfirmation}` → her durumda 202 `{message:"E-postanı kontrol et"}`; mevcut email üyelik bilgisi ifşa etmez |
| POST /auth/login | anonim+CSRF | `{identifier,password}` → Profile+cookie; email veya owner username. Hata genel 401 |
| GET /auth/session | anonim | `{authenticated:false}` veya `{authenticated:true,profile,expiresAt}`; frontend rolü buradan alır |
| POST /auth/session/renew | oturum+CSRF | Mutlak sınırı uzatmadan idle yenile → session cevabı; expired 401 |
| POST /auth/logout | oturum/anon+CSRF | Cookie ve current DB session iptal, 204; sonrasında yeni CSRF bootstrap |
| POST /auth/verification/resend | anon veya pending+CSRF | `{email}` → genel 202; rate limit |
| POST /auth/verification/confirm | anon+CSRF | `{token}` → 204; tek kullanımlı, login yaratmaz; tekrar/expired 422 INVALID_TOKEN |
| POST /auth/password/forgot | anon+CSRF | `{email}` → genel 202 |
| POST /auth/password/reset | anon+CSRF | `{token,password,passwordConfirmation}` → 204+all sessions revoke; expired/used 422 |
| POST /auth/google/start | anon+CSRF | `{returnTo,purpose?:"login" veya "reauth"}` → `{authorizationUrl}`; reauth yalnız mevcut M session ile; same-origin relative allowlisted returnTo, state/session/nonce/PKCE saklanır |
| GET /auth/google/callback | state/nonce | OAuth code/error; Spring doğrular ve frontend allowlisted path'e 303; token URL'ye konmaz |
| POST /auth/reauthenticate | M+CSRF | `{password}` → `{validUntil}`; Google-only hesapta Google start purpose=reauth akışı, purpose server oturumuna bağlı |
| GET /me | M | Profile |
| PATCH /me | M | `{name?,avatar?}` + If-Match → Profile |
| PATCH /me/preferences | M | `{publicationEmail?,timeZone?}` + If-Match → Profile; ortak profile version |
| PUT /me/password | R | `{password,passwordConfirmation}` → 204 ve tüm session revoke; OAuth-only hesaba parola ekleme de doğrulanmış hesap+reauth gerektirir |
| POST /me/email-change | R | `{email}` → genel 202; action token target email'e bağlı; mevcut email confirm'a kadar kalır |
| POST /auth/email-change/confirm | anon+CSRF | `{token}` → 204; email unique kontrol + verified update + all sessions revoke; artık giriş yeni email ile |
| GET /me/connections | M | `{items:[{provider,connectedAt}]}`; provider token/subject döndürülmez |
| POST /me/connections/google/start | R | `{returnTo}` → OAuth authorizationUrl; authenticated linking context callback'te doğrulanır |
| DELETE /me/connections/google | R | 204; son giriş yöntemiyse 409 LAST_LOGIN_METHOD |
| GET /me/sessions | M | `{items:[{id,current,deviceLabel,createdAt,lastSeenAt,expiresAt}]}`; opaque yönetim ID'si |
| DELETE /me/sessions/{id} | M | Kendi session'ı 204; başka üye 404; current silinirse cookie temizlenir |
| POST /me/sessions/revoke-others | R | 204; diğer cihazlar sonraki istekte 401 |
| DELETE /me | R | `{confirmation:"DELETE"}` → 204; owner 409 OWNER_DELETE_REQUIRES_MIGRATION |

Pending login yalnız session/verify/logout ve kendi durumunu okuyabilir; diğer özel endpoint'lerde 403 EMAIL_VERIFICATION_REQUIRED. Registration confirmation kontrolü frontend ve server'da aynı. Password/token body loglanmaz, auth istekleri genel idempotency store'a yazılmaz. Email change için action_token purpose EMAIL_CHANGE, encrypted/bounded target_email alanı gerekir; token tüketiminde adres unique kontrolü transaction içindedir.

## 5. Kitaplık, notlar, ziyaretler

| Method / path | Yetki | Girdi → çıktı |
| --- | --- | --- |
| GET /me/collections | M | `{items:[{id,name,isDefault,count,version}]}` |
| POST /me/collections | M | `{name}` → 201 Collection; normalize duplicate 409 |
| PATCH /me/collections/{id} | M | `{name}` + If-Match → Collection; Genel değiştirilemez |
| DELETE /me/collections/{id} | M | If-Match; bookmarks atomik Genel'e taşınır, savedAt korunur, 204 |
| GET /me/bookmarks | M | `collectionId,q,page,size,sort=saved_asc\|saved_desc\|date_desc\|title_asc`; default saved_asc mevcut kayıt sırasını korur |
| PUT /me/bookmarks/{articleId} | M | `{collectionId?:UUID}` → `{articleId,collectionId,savedAt,version}`; omitted ilk kayıtta Genel, mevcut kayıtta collection korunur; hidden yeni save 404 |
| DELETE /me/bookmarks/{articleId} | M | 204; hidden saved kayıt da kaldırılır |
| GET /me/article-state | M | `ids=…` max50 → bookmark/collection ve own history özetleri; hidden makaleye yalnız unavailable |
| GET /me/articles/{id}/annotations | M | `{articleId,revisionId,items:[Annotation]}`; hidden ise `{articleId,available:false,items:[{id,available:false}]}` |
| PUT /me/articles/{id}/annotations/{markId} | M | `{kind,revisionId,fragments,note}`; ilk create `If-None-Match:*`, update If-Match; 201/200 Annotation |
| DELETE /me/articles/{id}/annotations/{markId} | M | 204; başka kullanıcı 404 |
| POST /me/imports/annotations | M | `{clientImportId,items:[…]}` max200 → accepted/rejected raporu; kullanıcı tercihiyle, tekrar aynı sonucu |
| POST /me/visits | M | `{eventId,articleId,revisionId,visitedAt}` → 204; yalnız erişilebilir içerik, zamanı server cap eder, lastVisited max korunur |
| GET /me/history | M | page,size → article summary veya `{articleId,available:false}`, lastVisitedAt; newest first |
| GET /me/series/{id}/history | M | `{items:[{articleId,lastVisitedAt}]}` yalnız mevcut kamu bölümleri; completed alanı yok |
| DELETE /me/history | M | 204; bütün kendi ziyaret özeti silinir |

Bookmark list öğesi `article:ArticleSummary|null,available:boolean` taşır; erişilemeyen kayıtların başlığı, eski koleksiyon dışı içerik metadata'sı aramada kullanılmaz. Koleksiyon isimleri ve kişisel notlar public/owner-admin API'de yoktur. Annotation `{id,kind,revisionId,fragments:[{blockId,start,end,quote,before,after}],note,createdAt,version}`: UTF-16 offset, max30 fragment, toplam quote<=12000, context<=48, note<=4000, makale başına en çok200. Stale revision notları saklanabilir, fakat frontend sadece doğrulanmış current match'i boyar; server revision'ın o makaleye aitliğini kontrol eder.

Undo annotation deletion: client aynı markId ile explicit yeniden PUT create yapar; public içerik erişimi ve aynı validasyon uygulanır. Import body actor/userId kabul etmez; demo hesap/rol taşımaz. History panel veya permalink gerçek açılışından gelebilir; kart impression history sayılmaz. Bu, public panel-view saymama kuralından bağımsızdır.

## 6. Clap ve görüntülenme

| Method / path | Yetki | Girdi → çıktı |
| --- | --- | --- |
| POST /engagement/session | A | Body yok; anonim opaque cookie gerekirse üretir, `{ready:true}`; üye kimliği server session'dan |
| GET /articles/{id}/my-clap | A (GET token yok) | `{clapped:boolean}`; cookie yoksa false; no-store |
| PUT /articles/{id}/clap | A | `{clapped:true\|false}` → `{clapped,claps}`; unique aktör/yazı, hidden 404 |
| POST /impressions | A | `{eventId,articleId,source:"card"\|"permalink",pageViewId,occurredAt}` → `{accepted:true,counted:boolean,views}` |

Impression UTC anı en fazla24 saat geçmiş/5 dakika ileri olabilir; server receivedAt otorite. Aynı eventId/aktör+makale+kaynak+pageViewId retry `counted:false`; aynı ID başka payload 409. Receipt retention30 gün olduğundan kabul edilen retry penceresinden uzun. Card %20 görünür olunca bir kere; aynı pageView içinde rerender ve panel açma yeni ID üretmez. Permalink navigasyonu yeni pageViewId; yeni site ziyareti tekrar sayılabilir. Studio/preview client olayı göndermez. Client DOM görünürlüğü kriptografik doğrulanamaz; kaynak alanı metrik tanımıdır, insan kanıtı değildir. Bilinen bot/bozuk olay kabul edilmez; prefetch/SSR/GET sayı değiştirmez.

Cookies silinirse anonim kimlik/oy geri alma yeteneği kaybolabilir. Anonim cookie oyun fiziksel kişiye ait olduğunu kanıtlamaz. Girişte otomatik clap merge yok (Ü11); mevcut üye oyları okunur. Birden fazla kullanıcı aynı tarayıcıda farklı hesaplara ait oy kullanabilir.

## 7. Studio editoryal işlemler

Aşağıdaki her uç **O**, CSRF ve mutation precondition kurallarına tabidir. Frontend readonly olması yeterli kontrol değildir.

| Method / path | Girdi → çıktı |
| --- | --- |
| GET /studio/articles | `status,visibility,seriesId,q,page,size,sort=date_desc\|created_asc\|scheduled_asc\|scheduled_desc\|title_asc` → ArticleEdit özet page; scheduled filtresinde default scheduled_asc |
| POST /studio/articles | ArticleCreate → 201 ArticleEdit |
| GET /studio/articles/{id} | ArticleEdit+ETag |
| PUT /studio/articles/{id} | ArticleWrite + If-Match → ArticleEdit; published kaydın Save'i live günceller, scheduled halen valid future olmalı |
| POST /studio/articles/{id}/actions | `{action:"save-draft"\|"publish"\|"schedule"\|"cancel-schedule"\|"archive"\|"trash"\|"restore"\|"make-private"\|"prepare-public",scheduledAt?,timeZone?,publishSeries?,seriesVersion?}` → ArticleEdit |
| DELETE /studio/articles/{id} | Trash action eşdeğeri, 204; hard delete yok |
| GET /studio/series | status,q,page,size,sort=title_asc → editable page |
| POST /studio/series | SeriesWrite → draft 201 |
| GET /studio/series/{id} | SeriesWrite + id,status,version,createdAt,updatedAt |
| PUT /studio/series/{id} | SeriesWrite+If-Match → editable series; membership/reorder atomik |
| POST /studio/series/{id}/actions | `{action:"publish"\|"save-draft"\|"archive"\|"trash"\|"restore"}` → editable series |
| DELETE /studio/series/{id} | Trash, yazılar değişmez, 204 |
| GET /studio/categories | Tüm Category listesi, hidden kullanım dahil |
| POST /studio/categories | `{name,slug}` → 201; duplicate409 |
| PATCH /studio/categories/{id} | `{name?,slug?}`+If-Match → Category |
| DELETE /studio/categories/{id} | If-Match, kullanılıyorsa409 CATEGORY_IN_USE; mass content mutation yok |
| GET /studio/publication-jobs | page,size,state,q → owner job özeti; body/credential yok |
| POST /studio/publication-jobs/{id}/retry | FAILED job için yeniden eligibility; generation aynı, idempotency key korunur |

UI Save ile publish action'ı birleştirmek isterse önce content PUT ardından action çağırır; aradaki hatada taslak kaydı korunur, yayın başarılı denmez. İlk yazı + yeni seri yaratmada seri önce draft kaydedilir, article Save membership'i transaction'da bağlar. Publish action optional publishSeries=true ise ilgili series version ile aynı transaction; implicit seri activation yok.

Durum geçişleri: public draft→schedule/publish; scheduled→reschedule/publish/cancel→draft; published→save-draft/archive/trash/make-private; archive/trash→restore(draft). Tüm private draft/archive/trash hallerinde publish/schedule 409 PRIVATE_NOT_PUBLISHABLE. make-private bütün non-trash hallerden draft/private; trash private restore sonrası prepare-public. Aynı durum action no-op (generation/mail üretmez); expired scheduledAt ile content save 409 SCHEDULE_ALREADY_DUE, client yeniler.

`publishSeries` yalnız makalenin üyesi olduğu draft seri için true olabilir; arşiv/trash seriyi otomatik restore etmez. Seri görünürlüğünü kaybeden son kamu bölümünün değişiminde public seri 404 olur; makaleleri topluca durum değiştirmez.

## 8. Studio tema, medya ve operasyon

| Method / path | Yetki | Girdi → çıktı |
| --- | --- | --- |
| GET /studio/site | O | SiteSettings+version |
| PATCH /studio/site | O | allowlist authorPublicName,seo,indexingEnabled; If-Match; canonical origin yalnız deployment config |
| GET /studio/theme | O | `{version,draft:ThemeDocument,applied:ThemeDocument}` |
| PUT /studio/theme/draft | O | ThemeDocument+If-Match → workspace; public değişmez |
| POST /studio/theme/apply | O | `{draftRevisionId}`+If-Match → workspace; references/publish eligibility doğrulanır |
| POST /studio/theme/restore | O | If-Match → applied'dan yeni draft revision; public değişmez |
| POST /studio/media | O | multipart file + CSRF header, 202 `{id,state}`; body limit ingress dahil |
| GET /studio/media/{id} | O | state,size,mime,dimensions,attribution,errorCode; path/secret yok |
| DELETE /studio/media/{id} | O | Kullanımda/revision referansında409; kullanılmayan karantina/dosya204 |
| POST /studio/cover-jobs | O | `{resourceType:"article"\|"series",resourceId,resourceVersion,query?}` →202 job; mode/consent kontrolü |
| GET /studio/cover-jobs/{id} | O | `{state,candidates:[{assetId,thumbnailUrl,sourceUrl,photographer,licenseUrl}],errorCode}`; private manual query şartı |
| GET /studio/members | O | page,size,q → `{id,name,email,status,createdAt}` page; özel not/bookmark/geçmiş alanı yok |
| GET /studio/article-stats | O | page,size → `{articleId,title,views,claps,saves}` page; salt okunur toplam, süre/cihaz raporu yok |
| POST /studio/exports | O+reauth | 202 exportJob; içerik/seri/tema/medya manifesti, kullanıcı parolaları/session/özel üye verileri hariç |
| GET /studio/exports/{id} | O | state veya auth gerektiren indirme URL; private export no-store |
| POST /studio/imports/validate | O | bounded manifest/upload →202 validation job; schema,hash,slug/reference hataları ve dry-run planı |
| GET /studio/imports/{id} | O | `{state,plan,errors}`; counts ve açık conflict listesi |
| POST /studio/imports/{id}/commit | O+reauth | `{validationVersion}`+idempotency →202; tekrar aynı sonuç; mevcut kaydı sessiz overwrite yok |

Export/import dosyası max100 MiB, açılmış200 MiB ve entry sayısı sınırlı; zip-slip/path traversal/symlink reddi. Storage adlarını server belirler; .env/script kabul edilmez. DB snapshot yerine domain manifesti; versiyon ve sha256 listesi. Job state outbox'ta generic job türü olarak, upload/result medyadan ayrı auth-only geçici volume'da 24 saat. Import varsayılan içerikleri draft ve production indexing false getirir; gerçek publish owner işlemi. Eski frontend modelinde slug referansları UUID'ye eşlenir, legacy date provenance kaydıyla korunur. Fixture/değişmemiş demo içerik otomatik production seed edilmez.

## 9. OpenAPI ve frontend geçişi

Bu Markdown davranış sözleşmesidir. Makinece doğrulanan karşılığı `backend/docs/openapi.yaml` (OpenAPI 3.1) bütün çalışan uçları kapsar; backend testleri her yanıtı bu dosyaya karşı denetler (backend README "Contract tests"). Dosyanın içermesi gerekenler: operationId, securitySchemes(cookie+CSRF), required/nullability/enum/limit, discriminators, her HTTP response ve örnekler. Auth callback dışı bütün iş API'si /v1. CI: spec lint, breaking-change diff, runtime MockMvc contract testleri; mümkünse DTO/client types üretimi. Entity'den otomatik türeyen spec tek tasarım kaynağı sayılmaz; sözleşmeyle uyumu kontrol edilir. V1 içinde additive değişiklik, alan anlamı/silme değişimi /v2 gerektirir.

Frontend migration adapter'ı yalnız geçiş katmanıdır:
- Article slug identity→UUID; `publishedAt`→displayDate; paragraphs/code/figure/table→sabit kimlikli document block. Gizli/demo roller ve sayaçlar taşınmaz.
- `use-content-workspace` yerel transaction yerine API command sonucu; theme workspace API ile ayrı kalır.
- AuthProvider `/auth/session`; SavedProvider/member notes /me API. Logout sonrası private state/cache silinir; theme/audio yerel tercihleri korunur.
- Server-rendered route body ve metadata Spring public response'u kullanır. Browser-local içerikle 200/metadata tamamlama üretimde yok.
- OpenAPI/generated TypeScript public DTO'ları paylaşır; frontend özel backend domain entity'sine bağımlı olmaz.

Kabul: bütün tablolardaki endpoint ve schema'lar contract test matrisiyle eşlenmeden API tamamlandı sayılmaz. Özellikle permission, unavailable records, concurrent membership, same-key retry, plan iptali/iş yarışı, Google link ve private medya testleri zorunludur.

## 10. Uygulama notları (2026-10-06)

Sözleşmenin sessiz kaldığı yerlerde seçilen en küçük güvenli davranışlar `backend/README.md` "Implementation decisions" bölümündedir. Kısaca: kitaplık sınırı 100 koleksiyon/1000 kayıt; `Genel` ilk kullanımda oluşur; annotation `markId` istemci UUID'sidir ve hesap başına tekildir, olmayan işaretin silinmesi 404'tür; `POST /me/visits` yalnız en yeni zamanı tutar (`eventId` saklanmaz, 24 saatten eski 422); `/me/article-state` gizli yazı için yalnız `{articleId, available:false}` döner; seri özet/detaylarında `stats` (kamu bölümlerinin toplamı) eklenmiştir; doğrulanmamış hesap anonim aktör olarak alkışlar.
