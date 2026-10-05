# Backend mimarisi ve alan sözlüğü

Tarih: 2026-10-05. Durum: uygulamaya hazırlık tasarımı; uygulama/migration oluşturulmadı. Kullanıcının kesin tercihleri: ayrı Next.js frontend, Java 25 LTS + Spring Boot, PostgreSQL, VPS, modüler monolit ve SEO. Aşağıdaki **T** kararları teknik öneri, **Ü** kararları açık ürün varsayımıdır; mevcut davranışla farkları özellikle belirtilmiştir. Kodlamada bu belge, [API sözleşmesi](api-contract.md) ve [VPS planı](deployment-vps.md) birlikte kullanılır.

## 1. İnceleme ve kapsam

İncelenen kaynaklar: kök/backend/frontend AGENTS ve README; product, roadmap, coordination, site-builder; membership, publication-scheduling, private-articles, saved-articles, claps-and-sharing, blog-series, reading-tools, automatic-covers, reader-progress-and-analytics, article-summary, site-introduction, personalized-recommendations belgeleri; frontend auth/builder/reading/series rehberleri; `frontend/lib/{content,articles,series,editorial,builder,auth,saved,reading,reactions}` modelleri; AuthProvider ve Studio giriş akışı; App Router yazı/seri/layout dosyaları, package.json ve next.config.ts. Gerçek `.env` değerleri okunmadı.

| Kanıt / mevcut durum | Üretim kararı / fark |
| --- | --- |
| `lib/content.ts` Article kimliği slug; paragraf dizisi ve tek code/figure/table alanı | Değişmez UUID kimlik, sürümlü bloklar; slug yalnız adres. Eski veriye tek seferlik açık içe aktarma |
| `articles/metadata.ts`: `publishedAt` takvim günü; `createdAt` sabit | `displayDate` DATE, `firstPublishedAt` ve `lastPublishedAt` UTC anları ayrı |
| `editorial/store.ts` ortak yerel yazı/seri kaydı | Makale ve seri üyeliği aynı DB transaction'ında; tema Apply ayrı işlem |
| `series/model.ts`: bir yazı bir seride; difficulty yok | UUID üyeliği korunur; eski `level` gereksinimleri geçersiz |
| `builder/model.ts`: düz blok listesi, draft/applied | Tek site ve tek tema çalışma alanı; sürümlü taslak + uygulanmış snapshot. Tema kütüphanesi/nesting yok |
| `auth/model.ts`, AuthProvider: demo hesap/rol ve localStorage | Sunucu oturumu; demo kimlikleri ve roller göçte yetki sağlamaz |
| `app/studio/access.ts`: geçici Next sunucu giriş kapısı | Spring oturumuna taşınır; iki ayrı üretim kimlik sistemi bırakılmaz |
| `use-views.ts`: görünür kart ve permalink sayılır; panel sayılmaz | Aynı ürün kuralı, sunucu event-id tekrarsızlığı; GET sayacı artırmaz |
| App Router metadata fixture'dan; root robots noindex | Gerçek sunucu içerik verisi, durum kodları ve yayın kontrollü indeksleme |
| Kitaplık slug tabanlı, tek kayıt, varsayılan Genel | Üye/yazı benzersizliği; taşıma kayıt tarihini ve sayıyı değiştirmez |
| Not bağları paragraf pozisyonu + UTF-16 offset | Sabit blok UUID, içerik revision, alıntı/bağlam; belirsiz eşleşme otomatik taşınmaz |

### V1 teslim matrisi

- **Kesin V1:** sahip Studio, yazı/seri/tarih/kategori/özet/kapak/içerik düzenleme, tema draft-preview-apply, yayın yaşam döngüsü, sunucuda planlama ve hesap genelinde yayın maili tercihi; sahip özel yazıları; üretim SEO; gerçek üyelik, Google girişi/bağlantısı, profil/60 hazır avatar, parola/e-posta/oturum/hesap işlemleri; özel koleksiyonlar/notlar ve otomatik ziyaret geçmişi; anonim clap, sunucu sayaçları; gerçek medya yükleme ve sağlayıcıya bağlı otomatik kapak; üyelik faydaları sayfası ve açık içe/dışa aktarma.
- **V1 hedefi fakat ürün kararı bekliyor:** roadmap §3'te okur rozeti var, membership V2 bölümünde ve analytics özelliğinde gelecek diye geçiyor. Rozet kuralları/eşikleri kesinleşmeden rozet hesaplanmaz; V1'in kalan iş listesinde açık tutulur. Üye özel ziyaret geçmişi bununla bloke olmaz.
- **Kapsamı netleşecek:** roadmap §4 gelişmiş raporları sürüm belirtmeden listeliyor, özellik belgesi ilerisi diyor. V1 tabanı sahip için yazı bazında mevcut toplamlar ve sınırlı üye yönetim listesi. Süre, cihaz kırılımı, tekil ziyaret ve serbest karşılaştırma raporu; amaç/saklama/ölçüm onayı bekleyen ayrı dilimdir. Bunlar tamamlanmadan “tüm analitik tamam” denmez.
- **V2/ileri, şimdi veri toplanmaz:** üye yazarlığı/Studio, portal/takip/yorum, kullanıcı fotoğraf yüklemesi, kişiselleştirme, üyelere özel yazı yazarlığı, kamuya açık yazar notları, gelişmiş ses/hava durumu, nostalji, 3B karakter, iç içe tema blokları/kütüphane.
- Mozart/sekme ses koordinasyonu ve yerel hareket/tema tercihi frontend sorumluluğu kalır. Site içerik teması ile kişisel açık/koyu tercih farklıdır.

### Çelişkiler ve ürün varsayımları

| Kimlik | Karar / gerekçe |
| --- | --- |
| Ü1 | Roadmap özel yazıyı V1'e alıyor; eski özellik belgesinin “ilerisi” etiketi yerine güncel roadmap esas alınır |
| Ü2 | Eski blog-series ve builder rehberindeki level, fixture-only ve yayın durumu yok ifadeleri kod/son coordination ile çelişiyor; difficulty kaldırılmıştır, tarihler yalnız yazılardadır |
| Ü3 | Rozet ve gelişmiş istatistik kapsamı açık kalır; eşik ve kişisel takip yetkisi uydurulmaz |
| Ü4 | Yayındaki yazıda açık **Kaydet** güncel içeriği atomik olarak yayına günceller; **Taslak kaydet** kamu erişimini kaldırır. Yayında eski sürüm + gizli yeni çalışma kopyası UI'da yok; V1'e eklenmez. Kaydedilmemiş alanlar frontend'de izoledir |
| Ü5 | Özel yazı yayımlanamaz/planlanamaz. Önce açık “Kamu yayınına hazırla” ile public draft'a alınır, sonra ayrı yayın/plan işlemi yapılır |
| Ü6 | Yeni taslak seri kendiliğinden yayımlanmaz. Prototipteki ilk bölümle otomatik aktivasyon yerine ilk yazıyı yayımla isteğinde `publishSeries:true` açık seçimi önerilir; UI bunu göstermelidir |
| Ü7 | Aynı yazı arşivden/taslaktan yeniden yayımlanırsa yeni yayın olayı/mail oluşur; yayındaki sıradan düzenleme mail üretmez. Tercih açılması geçmiş olayları göndermez |
| Ü8 | Görünür kart eşiği mevcut %20 korunur; bir sayfa gösterimi içinde yazı/kaynak başına tek olay, yeni ziyaret yeni olay. Tam okuma/tekil insan ölçümü değildir |
| Ü9 | İçerik türleri V1'de article/series ve mevcut statik sayfa bloklarıdır. Ayrı proje/şiir/öykü CMS türleri karar bekler; örnek veriden genel CMS üretilmez |
| Ü10 | Doğrulanmamış hesap yalnız doğrulama/çıkış işlemlerini kullanır. Üye özel veri yazımı ve Google bağlama için doğrulanmış hesap gerekir |
| Ü11 | Anonim clap, girişte otomatik üye clap'ına taşınmaz. Üye clap hesabına bağlıdır; bir kişi farklı tarayıcılarla birden çok anonim oy verebilir. “Benzersiz insan” vaadi yok |

## 2. Mimari kararlar

**T1 — Modüler monolit.** Tek Maven Spring Boot uygulaması; Spring MVC, Bean Validation, Spring Security, Spring Data JPA; dış servisler için HTTP client. Java 25; Boot 4.1.x önerisi (inceleme tarihinde resmi sayfa 4.1.1 ve Java 25 uyumunu gösteriyor). İlk kodlama adımında desteklenen yama ve bütün bağımlılıkların uyumu doğrulanıp sürümler kilitlenir. Maven Wrapper, Boot BOM; ayrı framework sürümlerini rastgele override etme. Native image, reactive stack ve mikroservis ilk hedef değil.

**T2 — Modüller.** Paket kökü `com.satir`; her modülde `api` (controller/DTO), `application` (use case/transaction), `domain` (kurallar), `infrastructure` (JPA/dış servis) bulunur. Her sınıfa zorunlu interface üretme. Modüller birbirinin repository/entity'sini kullanmaz; uygulama servis arayüzleri/kimlikler üzerinden konuşur. Döngüleri ArchUnit ile engelle.

| Modül | Sahip olduğu sorumluluk |
| --- | --- |
| identity | Üye/owner, credential, Google identity, oturum, hesap tercihleri, hesap silme |
| editorial | Yazı, kategori, seri üyeliği/sırası, yayın/özel erişim, slug, revision; yayın scheduler da burada |
| site | Tek site ayarları, SEO site kimliği, tema draft/applied ve içerik referansları |
| media | Dosya güvenliği/depolama, erişim bağlantıları, kapak sağlayıcısı ve atıf |
| library | Özel koleksiyon/bookmark; identity/editorial erişim arayüzlerini kullanır |
| reading | Özel not/işaret ve ziyaret geçmişi; V1'de okuma süresi toplamaz |
| engagement | Anonim/üye clap, impression tekrarsızlığı, kamu toplamları |
| delivery | Transactional outbox, mail adapter, retry/iş durumu; yayın kararı vermez |
| platform | Clock, ortak problem yanıtı, request-id, küçük altyapı yapılandırmaları; iş kuralı deposu değil |

Editorial → media erişim politikası, diğer modüller → editorial `PublicContentQuery`, tüm özel use case'ler → identity `CurrentPrincipal`. Cross-module atomik işlemleri application katmanı yönetir; JPA entity'si API'ye dönmez. Delivery işçileri port üzerinden domain komutunu çağırır, provider I/O sırasında DB kilidi tutmaz. İleride media/delivery ayrılabilir; bugün mesaj broker'ı veya genel event-sourcing yok.

**T3 — Tek origin.** Reverse proxy `/api/**` → Spring, diğer sayfalar → Next. Tarayıcı `/api/v1` kullanır. Next SSR, dahili `http://backend:8080` üzerinden sadece gerekli public sorguları yapar. Korunan Next sayfaları session cookie'yi yalnız bu sabit backend origin'ine iletir, `/auth/session` kontrol eder. Yetki kontrolü her Spring use case'inde tekrarlanır. Next iş API'si veya ikinci membership DB'si oluşturmaz.

**T4 — Güçlü sınırlar.** UUID kimlik, UTF-8, UTC `Instant`/`timestamptz`, takvim günü `LocalDate`/`date`. API camelCase, DB snake_case. JSONB sürümlü içerik/tema, bounded annotation anchor ve job payload için; sorgulanan erişim/durum/tarih/ilişkiler relational. PostgreSQL'e özgü SQL yalnız repository adapter/migration içinde. `ddl-auto=validate`; otomatik şema güncelleme kapalı. Flyway sürümleri değişmez; hatalar yeni migration ile düzeltilir.

**T5 — Yazma çatışmaları.** Mutable aggregate'larda `version bigint`; API `If-Match` zorunlu, eski sürüme 412. Scheduler ve kullanıcı komutları aynı article satırını kilitler; çoklu kilit UUID sırasıyla. Seri üyeliği değişimi makale + etkilenen serilerin version'larını kontrol eder. Retry için POST command `Idempotency-Key`; kapsam principal+route+key, request hash ve yanıt 24 saat saklanır. Aynı key farklı gövde 409. PUT/DELETE hedef durum idempotent; çift sayım unique constraint ile engellenir.

**T6 — Basit doğru sayılar.** Başlangıç hacminde clap/bookmark sayısı unique ilişki satırlarından COUNT; görüntülenme article_totals satırındaki atomik sayaçtır. Tek işlemde impression dedupe insert başarılıysa +1. İçerik yazma DTO'ları sayaç kabul etmez. Seri sayıları yalnız o anda kamuya açık bölüm toplamları. Rapor için event lake/Redis/Elasticsearch eklenmez.

## 3. Veri sözlüğü

Ortak: aksini belirtmedikçe UUID PK; `created_at`, mutable alanlarda `updated_at/version`; bütün sahiplik FKs ve iş unique/check kısıtları migration ile. Kullanıcı girdisi boyutları API'de tanımlı. İlişkili tenant yok: V1 tek site/tek owner. Aşağıdaki tablolar mantıksal tasarımdır, DDL değildir.

| Tablo | Önemli alanlar ve kısıtlar | Erişim / amaç |
| --- | --- | --- |
| app_user | email, email_normalized UNIQUE, owner_username nullable UNIQUE, display_name, avatar_key, role OWNER/MEMBER, status PENDING/ACTIVE/DELETED, verified_at, version | Özel profil; owner üyede sadece sınırlı alanlar görür. En çok bir OWNER; public kayıt rolü sabit MEMBER |
| password_credential | user_id PK/FK, password_hash, changed_at | Yalnız identity; hash API'ye/loga çıkmaz |
| external_identity | user_id FK, provider=google, subject; UNIQUE(provider,subject), UNIQUE(user_id,provider) | E-posta eşleştirmesiyle otomatik hesap bağlanmaz |
| user_preference | user_id PK, publication_email default true, preferred_timezone | Yalnız hesap sahibi; site görünüm tercihiyle karıştırılmaz |
| SPRING_SESSION / SPRING_SESSION_ATTRIBUTES | Spring Session JDBC'nin kendi PostgreSQL şeması, principal UUID, expiry | Boot sürümüne uygun Flyway ile yönetilir, runtime schema init kapalı |
| session_metadata | session_primary_id PK/FK, user_id, created_at, absolute_expires_at, last_seen_at, coarse_device, reauthenticated_at | Hesap kendi oturumlarını opaque handle ile yönetir; gerçek session token API listesine çıkmaz |
| action_token | user_id, purpose VERIFY/RESET/EMAIL_CHANGE, encrypted_target_email nullable, token_hash UNIQUE, expires_at, consumed_at | Tek kullanımlık; düz token saklanmaz |
| auth_rate_bucket | key_hash PK, window_start, count, expires_at | Kimlik/email/IP birleşik kota, TTL temizliği; raw IP yerine kısa süreli HMAC |
| article | owner_id, current_revision_id, status, visibility, display_date, first_published_at, last_published_at, public_modified_at, scheduled_at, schedule_zone, schedule_generation, publication_generation, version | Status: draft/scheduled/published/archived/trashed; visibility public/private. private ise published/scheduled yasak; scheduled ise scheduled_at nonnull, diğer hallerde null |
| article_revision | article_id, revision_number UNIQUE(article_id,revision_number), title, eyebrow, abstract, document jsonb, presentation jsonb, seo jsonb, cover_mode, cover_asset_id, authored_by, created_at | Immutable içerik snapshot; dış API sadece current revision ve public erişim döndürür. İç FK current revision'ın aynı makaleye ait olmasını doğrular |
| category | slug UNIQUE, name UNIQUE normalize, position | Başlangıç konuları Yazılım/Edebiyat/Kültür; yeni konu owner yönetimidir, fixture enum'u API'yi kilitlemez |
| article_category | article_id, category_id, position; PK(article_id,category_id), UNIQUE(article_id,position) | Current revision kategorileri; yayın validasyonu en az bir kategori; tarih/kategori filtreleri |
| series | owner_id, title, summary, status draft/published/archived/trashed, ongoing, cover_mode, cover_asset_id, presentation, seo, version | Sıfır kamu bölümü varsa public görünmez; difficulty/date sunumu yok |
| series_chapter | article_id PK/FK, series_id FK, position; UNIQUE(series_id,position) | Tek seri üyeliği draft/archive/trash dahil rezerve; reorder atomik |
| slug_registry | kind ARTICLE/SERIES, slug, article_id XOR series_id, is_current; UNIQUE(kind,slug), her kaynakta tek current | Eski slug aynı kaynağın alias'ı; hedef kaynağa FK, alias zinciri yok. Trash rezervasyonu sürer |
| site_settings | singleton id=1, canonical_origin, author_public_name, seo, indexing_enabled default false, version | canonical origin dağıtım ayarıyla doğrulanır; siteName applied theme içinden gelir; private kişi bilgisi public profil yerine geçmez |
| theme_revision | id, schema_version, payload jsonb, created_at | Immutable, referanslar slug değil UUID; allowlist bloklar |
| theme_workspace | singleton, draft_revision_id, applied_revision_id, version | Yalnız applied public; preview/draft owner |
| media_asset | storage_key UNIQUE, state QUARANTINED/READY/FAILED, mime, size, width,height, sha256, source_provider, source_id, source_url, photographer, license_url, attribution, created_by | Storage path hiçbir public DTO'da yok; erişim referansa göre |
| article_media_ref | article_id, revision_id, asset_id, usage COVER/BODY; unique ilişki | Private dosya kontrolü, revision bağlı medya; eski revision public erişim vermez |
| series_media_ref | series_id, asset_id, usage | Seri cover; aynı erişim kontrolü |
| theme_media_ref | theme_revision_id, asset_id | Yalnız uygulanan temanın güvenli görselleri public; private makaleye bağlı varlık burada paylaşılamaz |
| collection | user_id, name, normalized_name, is_default, version; UNIQUE(user_id,normalized_name), tek default | Her hesap için değiştirilemez Genel; özel ad en fazla 60 |
| bookmark | user_id, article_id, collection_id, saved_at, version; PK(user_id,article_id) | collection aynı kullanıcıda: composite FK; taşıma saved_at değiştirmez |
| annotation | id, user_id, article_id, revision_id, kind, anchors jsonb, note, import_key nullable, created_at, version | Tamamen kişisel; UNIQUE(user_id,import_key) ile tekrarlı import engeli; anchors block UUID + UTF-16 aralık + quote/context. Owner admin özel notları okuyamaz |
| reading_history | user_id, article_id, last_visited_at, last_revision_id; PK(user_id,article_id) | Son gerçek açılış, tamamlanma değil; dizi ilerlemesi bundan türetilir |
| anonymous_actor | id, secret_hash UNIQUE, expires_at | Clap kimliği; rastgele cookie, fingerprint yok |
| article_clap | article_id, user_id XOR anonymous_actor_id, created_at | İki partial unique indeksle yazı/aktör tek oy; hedef durum true/false |
| impression_receipt | event_id UUID PK, article_id, actor_key_hash, source CARD/PERMALINK, page_view_id, received_at; UNIQUE(actor_key_hash,article_id,source,page_view_id) | Retry ve aynı gösterimi çift saymayı engeller; kısa saklama |
| article_totals | article_id PK, views bigint >=0 | Impression ile aynı transaction'da güncellenir; görünmez içerik metrikleri public API'de yok |
| outbox_job | type, aggregate_id, generation, dedupe_key UNIQUE, payload, state, attempts, available_at, lease_until, last_error_code | Mail/kapak işi; secrets/full article body payload'a konmaz |
| idempotency_record | principal_key, route, key, request_hash, result/status, expires_at; composite UNIQUE | Komut retry; auth parolası içeren isteklerde kullanılmaz/saklanmaz |
| audit_event | actor_id nullable, action, resource_kind/id, timestamp, outcome, request_id | Güvenlik/yayın değişiklikleri; içerik, not, parola/token/e-posta gövdesi yok |

Silme: yazı/seri DELETE reversible trash; hard purge V1 endpoint'i yok. Seri silme/arşiv yazıyı silmez. Üye hesap silmede credentials, identities, sessions, preferences, collections/bookmarks, notes, history ve üye claps transaction/bounded cleanup ile kaldırılır; public toplamlar buna göre azalır. Owner self-delete 409; site devri/owner silme ayrı operasyon. Tombstone user kaydı kimlik verisi içermez. Günlük/backup silme gecikmesi açıkça belgelenir.

İndeksler: article(status,visibility,display_date DESC,id DESC), article(status,scheduled_at,id), article_category(category_id,article_id), series_chapter(series_id,position), bookmark(user_id,saved_at,article_id), annotation(user_id,article_id), history(user_id,last_visited_at,article_id), clap(article_id), outbox(state,available_at), token(expires_at), audit(created_at). Case-insensitive anahtarlar uygulamada normalize edilip unique korunur. E-posta trim+lowercase yapılır; Gmail nokta/plus alias birleştirmesi yapılmaz. series_chapter position unique constraint'i reorder sırasında deferred kontrol edilir; article/revision composite FK'leri başka yazının revision'ına bağlanmayı engeller. Türkçe alfabetik sıra için DB ICU tr collation sağlanmalı ve test edilmeli; raw SQL kullanıcıdan alınmaz. Küçük hacimde bounded ILIKE arama; gerçek query plan ölçülmeden ekstra indeks/arama motoru yok.

## 4. İçerik, yayın ve transaction kuralları

- Boş draft geçerli; published/scheduled için başlık, geçerli slug, kategori, en az bir boş olmayan paragraph, geçerli medya ve blok şeması gerekir. Server `Clock` otorite; gelecekteki displayDate kendiliğinden yayın planı yaratmaz.
- Genel katalog sırası `displayDate desc,id desc`; seri sırası position'dır. Yeni üyelik immutable article.createdAt asc sırasına göre, mevcut üyelerin göreli sırası bozulmadan eklenir. Elle reorder kesin kaynak olur; tarihin değişmesi sıra değiştirmez.
- Seri membership bir Save ile article + eski/yeni seri version'ları doğrulanarak değişir. Seri tüm üyelerini kaybederse draft'a düşer; kalan üyeler hidden ise public erişim yoktur, Studio status korunabilir. Yayımla anında en az bir public published bölüm zorunlu. Ü6 explicit aktivasyon komutu bunu aynı transaction'da yapabilir.
- Article current revision yenilenir; stable block UUID'leri korunur. Yayımlanmış metinde Save public revision'ı değiştirir; private/draft/scheduled Save public değildir. Tema draft kaydı public içeriği değiştirmez; Apply ayrı validasyon ve snapshot pointer değişimi.
- `publish`: private değilse published, scheduled_at temizlenir, ilk yayın zamanı yalnız ilk geçişte; nonpublished→published publication_generation artar. `schedule`: yalnız public draft/scheduled, gelecekte mutlak UTC+IANA zone, generation artar. Published yazıyı planlamak için önce draft'a çekme açık işlemi gerekir.
- Saat dilimi: API yalnız mutlak UTC anı + geçerli IANA zone kabul eder; ham yerel saat server'da tahmin edilmez. Frontend DST boşluğundaki yerel saati reddeder, tekrar eden saatte UTC offset seçimini açık gösterir. Zone görüntüleme içindir; plan anı UTC'dir, zone tercihi sonradan değişince an değişmez.
- `cancelSchedule`: scheduled→draft. archive/trash schedule iptal eder. restore→draft, visibility aynen korunur. `makePrivate`: yayını anında kaldırır, draft/private yapar ve planı iptal eder. `preparePublic`: private→draft/public; bu tek başına yayın değildir. Private durumu arşiv/trash dönüşünde korunur.
- Scheduler 15 saniyede bir due article tarar (ilk servis hedefi ≤60 saniye). Row lock altında hâlâ scheduled/public, generation ve revision valid ise yayımlar. İptal önce kilidi alırsa iş no-op; yayın önce tamamlanırsa geç iptal 409, kullanıcı yayını kaldırabilir. Yeniden başlatmada geçmiş due işler aynı kuralla işlenir.
- Public geçiş ve tekil mail outbox kaydı aynı transaction'dadır. Worker işi lease ile alır, commit sonrası provider çağrısı yapar; exponential retry+jitter, ör. 1/5/15/60 dakika, en fazla 8 deneme, sonra FAILED ve owner görünümü. Mail hatası yayını geri almaz.
- Mail worker her denemede publicationEmail, doğrulanmış email, mevcut görünürlük ve aynı publication_generation'ı kontrol eder. Kapalı tercih veya kaldırılmış yayın SKIPPED; sonra açılması geri göndermez. Provider'a sabit idempotency key gönderilir. **SMTP dış yan etkisinde kesin exactly-once garantisi yoktur:** teslimden sonra crash durumunda tekrar mümkündür; idempotency destekli sağlayıcı tercih edilir, Message-ID tek başına garanti değildir.

## 5. Kimlik ve özel erişim

Spring Security + Spring Session JDBC, opak HttpOnly cookie `__Host-satir-session`, Secure, Path=/, SameSite=Lax, Domain yok. Üye oturumu önerisi 7 gün idle/30 gün absolute, owner 30 dakika idle/8 saat absolute. Süreler Ü varsayımıdır; cookie ve DB expiry tutarlı; mutasyon/yenileme DB session ve ACTIVE user kontrolünden geçer. JWT/localStorage bearer token yok. Spring session fixation rotasyonu giriş/reauth'ta; parola sıfırlama/değişiminde bütün oturumlar revoke, tekrar giriş.

Anonim `GET /auth/csrf` session/CSRF token oluşturur. Tüm cookie tabanlı unsafe işlemler token header'ı ister, login/register/logout dahil. Giriş/çıkıştan sonra yeni token alınır. OAuth callback GET yalnız state+nonce+PKCE doğrulamalı redirect akışıdır. Aynı origin prod CORS kapalı; local geliştirmede reverse proxy tercih, gerekirse yalnız tam localhost origin, credentials ve allowlist. Origin/Referer kontrolü savunma katmanı; CSRF'yi kaldırmaz.

Argon2id (uygun Spring encoder), parametreleri VPS'te ölçüp yaklaşık 200–500ms doğrulama hedefiyle ayarla; parola 12–128 karakter önerisi, sessiz truncate yok. Register/name/email normalize validation; API'ye role, verified, connected alanları yazılamaz. VERIFY 24 saat, RESET 30 dakika, hash saklanan 256-bit random token, tüketim transaction'ı tek kullanımlı. Link GET token tüketmez (mail tarayıcısı); UI açık POST ile tamamlar, URL token'ı log/referrer'dan gizler. Reset doğrulayıp parolayı değiştirir; mail var/yok cevabı aynı 202.

Google Spring Security OAuth2 Login: yalnız openid/email/profile, issuer/audience/nonce/state doğrulanır, email_verified aranır. `(provider,subject)` otorite. Aynı email başka hesapta varsa otomatik birleştirme yok; o hesapla giriş+reauth ardından bağla. Bağlı hesabı kaldırmak için geçerli parola veya başka giriş yöntemi zorunlu. Owner Google ile giriş V1'de kapalı önerilir; ayrı e-posta/parola+owner yetkisi, username alias yalnız owner giriş alanında desteklenir.

Owner kurulumu: V1'de public owner registration yok. Tek seferlik CLI/admin bootstrap; stdin/secret file'dan parola, mevcut owner varsa overwrite/ikinci owner reddi; doğrulanmış posta sahiplik akışı, roller koddan/DB operasyonundan kontrollü. Repo/env örneklerinde gerçek kimlik yok. Geçici Next Studio cookie/hash girişini üretim geçişinde kaldır, yeni sistem cookie'si olmadan erişim verme; eski demo owner kimliğini import etme.

Her private sorgu `user_id = currentPrincipal.id` içerir; path/body userId yetki kaynağı değil. Tahmin edilen annotation/collection/session ID için 404. Member→studio 403, unauth→401. Public endpoint hidden kaynağa owner için dahi 404; owner ayrı Studio API'sini kullanır. Server tarafından yetkili görünen UI asla tek koruma değildir.

Sekmeler: cookie ortak; BroadcastChannel yalnız “session changed” bildirir, kimlik/credential taşımaz; focus, login/logout, 401 sonrası `/auth/session` yeniden okunur. Diğer cihaz kendi oturumuyla DB verisine ulaşır; cihazlar arası token paylaşılmaz. Kullanıcı değişince private query cache/selection temizlenir. Reauth (parola veya Google challenge) 5 dakika geçerli; email/giriş yöntemi/hesap silme ve oturumları toplu iptal için gerekir.

Başlangıç kotaları (ölçülüp ayarlanacak): login identity 5/15dk + IP 30/15dk, registration/reset/verify 3/saat/email+IP, views 120/dk aktör ve 600/dk IP, clap 30/dk aktör. 429+Retry-After; proxy ve DB bucket; başarı bütün saldırı geçmişini sıfırlamaz. Edge bilgisi yalnız güvenilen proxy'den alınır.

## 6. Medya, kişisel içerik ve mahremiyet

- Yükleme owner-only: başlangıç JPEG/PNG/WebP, en çok 10 MiB, 20 megapiksel; byte-signature/decode doğrula, yeniden encode edip EXIF temizle. SVG/HTML upload reddedilir; mevcut güvenilir statik SVG'ler deploy varlığıdır. Rastgele depolama adı; webroot dışında volume. Karantina dosyası READY olmadan yayınlanamaz.
- Tüm içerik medyası yetkili backend `/media/{id}` üzerinden. Her erişim güncel public referans veya owner kontrolü; raw storage yolu, açık bucket, tahminle erişim yok. Next image optimizer bu dosyalar için kullanılmaz (revocation sonrası kalıcı cache riskidir); no-store, CDN bypass, CSP allowlist. Public olmuş içeriğin önceden indirilmiş kopyasını geri alma garantisi yok.
- Private makaleye bağlı varlık public article/series/theme ile paylaşılamaz; owner public varlığı private metinde kullanmak isterse ayrı asset kopyası oluşturulur. `makePrivate` public başka referans varken 409; önce ayır. Eski revision'ların medya referansı kamu izni oluşturmaz.
- Kapak modu AUTO/MANUAL/NONE. İlk uygun public taslak Save'de AUTO ve boşsa job; iş article/series version ve cover-mode'ı yeniden kontrol eder, geç yanıt güncel tercihi ezmez. Sonuç eşleşmiyorsa boş kapak + açıklanabilir durum. Private içeriğin başlığı/gövdesi dış aramaya otomatik gönderilmez; explicit owner seçimiyle yalnız yazılan arama sorgusu gönderilebilir.
- Sağlayıcı adayı Pexels; API/lisans/indirme/atıf koşulları entegrasyon tarihinde resmi kaynaklardan doğrulanmalı. Adayın adı karar değil; production key/kota ve kalıcı dosya saklama izni launch bağımlılığı. Site ziyaretinde tekrar arama yok. Genel URL downloader yok: yalnız sağlayıcı host allowlist, private/link-local/metadata IP engeli, redirect kontrolü, boyut/zaman sınırı. Provider failure yazı kaydını engellemez.
- Annotation UTF-16 offset, sabit block ID ve revision ile saklanır. Yeni metinde quote/context tek eşleşmiyorsa unresolved; silme yapılmaz. Özel metin alıntıları yalnız not sahibine görünür. Yazı erişimden kalkınca bookmark/notes kaydı tutulur fakat yanıt sadece opaque ID+unavailable+remove imkânı, eski title/quote/cover gönderilmez; yeniden yayınlanırsa çözümleme tekrar yapılır.
- Yerel misafir notları için açık import: max 200/adım, public article eşlemesi, schema validation, `(user,clientImportId)` idempotency; kullanıcı onayı ve başarılı commit olmadan local kayıt silinmez. Demo credentials/role/counters hiçbir zaman taşınmaz.
- Önerilen saklama: impression receipt 30 gün, rate bucket 24 saat, token expiry sonrası 24 saat, idempotency 24 saat, mail job/audit 90 gün, kişisel son ziyaret geçmişi 180 gün, not/bookmark kullanıcı kaldırana/hesap silinene kadar. Ham IP/UA/okuma süresi/cihaz analitiği tutulmaz; oturum listesi için yalnız kaba cihaz etiketi. Bu süreler ürün/mahremiyet varsayımıdır; duyuru ve üretim onayı gerekir.
- Anonim clap kimliği 180 gün; süre dolduğunda stale aktif clap ilişkileri temizlenir ve sayı düşebilir (Ü11 ile birlikte açık ürün kararı). Üye oyları hesabı silinene/geri alınana kadar kalır. Sayılar tarihsel yaşam boyu kişi toplamı değil aktif ilişki toplamıdır.

## 7. SEO ve Next entegrasyonu

- Public görünürlük tek politika: article status=published AND visibility=public; seri status=published AND en az bir public bölüm. Özel durumlar public endpoint'te 404; API arızası 503, içerik yokmuş gibi 404 yapılmaz.
- Next App Router yazı/seri/home/catalog sayfaları server fetch ile gerçek içeriği ilk HTML'de sunar; title/description/canonical/OG aynı snapshot'tan. Fixture generateStaticParams ve client localStorage fallback üretimde çıkarılır. Metadata ve gövde aynı request içinde memoize edilir; kalıcı paylaşılmış içerik cache'i V1'de kapalı (`no-store`, dinamik route). Fetch 404/auth kontrolü stream flush öncesinde olmalı; HTML ve RSC yanıtında test edilir.
- `/yazilar` ve `/seriler` crawlable katalog sayfaları önerilir; mevcut sahne paneli korunur, ancak tüm yazılara gerçek `<a href>` bağlantısı ve sayfalı fallback eklenir. Client-only buton/infinite-scroll tek keşif yolu olmaz. Filter/search URL'leri noindex; sayfalama sayfaları self-canonical ve gerçek next/prev linkli.
- Kalıcı canonical: güvenilir `PUBLIC_SITE_ORIGIN` + normalize slug; Host header'dan URL üretme. Tek www/non-www seçimi, HTTP→HTTPS redirect. Eski slug registry hedefi hâlâ public ise Next 308 doğrudan current slug; hidden ise 404, eski başlık/konum sızdırma yok. Eski slug'lar yeniden başkasına verilmez.
- Sitemap yalnız indexable public URL'ler, doğru lastmod; plan zamanı veya displayDate lastmod olmaz. Yazıda public_modified_at; seride kamu içeriği/üyeliği değişim zamanı. Sitemap backend manifestinden server render; hidden ID bile yok. Site ölçeği büyürse bölümlenebilir.
- Schema.org BlogPosting (başlık, gerçek firstPublishedAt, publicModifiedAt, gerçek yazar/site ve erişilebilir kapak), seri CollectionPage/ItemList, breadcrumb. Kart tarihi displayDate ayrı gösterilir; JSON-LD tarihlerini değiştirilmiş kart tarihinden uydurma. Script metni güvenli escape edilir; yayınlanmamış üye email'i yazar verisi olamaz.
- `/studio`, `/preview`, `/hesap`, `/kaydedilenler`, giriş/reset/verify özel veya yardımcı ekranları noindex; özel ekranlar önce auth. robots.txt gizlilik mekanizması değil. Noindex'in görülmesi istenen URL'leri robots Disallow ile engelleme. Kamu içeriği noindex'ini JS ile kaldırma.
- Prototype/staging varsayılan noindex ve erişim sınırı; prod yalnız site ayarı + deployment `INDEXING_ENABLED=true` birlikte açıkken index. Siteyi erişilir yapmak indekslenme garantisi değildir; launch'ta URL inspection/Search Console kontrolü gerekir.
- Server HTML/API GET/Next prefetch hiç view artırmaz. Görünür client card/permalink event'i sayılır, panel açılışı sayılmaz. Bilinen bot UA'ları intake'te reddet, rate limit/dedupe uygula; JS çalıştıran botu veya yeni kimlik üreten saldırganı kusursuz ayırma vaadi yok. Public `views` toplam gösterimdir, unique reader değil.

## 8. Test matrisi ve uygulama dilimleri

| Dilim | İş / bitiş ölçütü |
| --- | --- |
| 0. Sözleşme | Ü1–Ü11 ve açık kapsam kayıtlarını çöz; OpenAPI 3.1 YAML, DTO şemaları, blok validasyonunu bu belgelerden çıkar ve contract lint ekle |
| 1. Temel + owner | Maven/Boot/DB/Flyway, hata/clock/log/security; owner bootstrap + JDBC session; member Studio reddi ve eski cookie reddi testli |
| 2. Editoryal + SEO | CRUD/revision/category/series/lifecycle/slug/media erişim; gerçek server-rendered yazı ve seri, 404/308/noindex; localStorage fallback yok, özel içerik cache testi |
| 3. Tema + medya | Draft/preview/apply isolation, ortak renderer, owner upload ve lisanslı kapak adapter; farklı tema aynı URL/icerik, gecikmiş kapak testi |
| 4. Yayın | Scheduler transaction/outbox/SMTP adapter/tercih; restart/cancel yarışında tek geçiş, hata yeniden deneme, saat dilimi testi |
| 5. Üyelik | Register/verify/reset/Google/linked account/profile/reauth/sessions/delete; gerçek 2 sekme + 2 ayrı tarayıcı oturumu; owner/member sınırı |
| 6. Kişisel alan | Koleksiyon/bookmark/marks/history/import; iki kullanıcı izolasyonu, veri taşıma stable order, unresolved annotation ve logout cache temizliği |
| 7. Tepkiler | Idempotent clap/view/save toplamları, seri toplamları; gerçek PostgreSQL yarış testi ve bot/prefetch/preview ayrımı |
| 8. Yayın hazırlığı | Compose CI image'ları, TLS, migration/rollback/backup restore drill, SEO taraması, hata/boş durumlar, üyelik faydaları doğru metin |
| Karar kapısı | Rozet/ileri rapor ölçümü kararı olmadan implement edilmez; V1 kapsam kararı kapanmadan bütün V1 bitti denmez |

Unit: durum matrisi, public predicate, slug normalizasyonu, block schema, tarih sırası ve saat dilimi, mail eligibility, cover priority. Injected Clock ve deterministic IDs; duvar saati/sleep bağımlı test yok.

PostgreSQL Testcontainers: migration boş DB + önceki release'den, FK/unique, same clap/bookmark concurrent requests, scheduler cancel/reschedule locks, atomic membership, idempotency, outbox lease/crash. H2 ile PostgreSQL davranışı taklit edilmez.

HTTP/MockMvc: DTO unknown field, 401/403/404/409/412/422/429, CSRF, session fixation/expiry/revocation, başka üyenin her private ID'si, private media/alias/sitemap, mass assignment. OAuth mock issuer ve provider mock; gerçek Google/mail prod test hesabına otomatik istek yok.

Next test/build + gerçek iki-browser E2E: disabled JS HTML'de metin/link/metadata; yeni post rebuild olmadan erişilir; hidden→404 HTML ve RSC; yayın slug'ı değiştirme→308; draft/private no body leakage; public→private eski URL+media cold/warm cache; preview sayım yok; kart %20 event, panel event yok, permalink retry tek event. Auth mail scanner GET token tüketmez; account link takeover ve son credential unlink reddi; klavye/a11y ve mevcut tasarım korunur.

VPS kabulü: DB restart/whole-host restart sonrası kalıcı veri; due publication kurtarma; DB down→503 (public cached secret fallback yok); backup boş ortama restore; disk dolu/upload failure; secret log taraması; yalnız gerekli public portlar. Performans için 100 günlük ziyaret kapasite garantisi değildir: gerçek içerik ve örneğin 10 eşzamanlı okurla p95/CPU/RAM ölç, heap/DB pool'u ölçüme göre ayarla.

## 9. Açık kararlar ve riskler

Owner şu ürün varsayımlarını uygulamadan önce değerlendirmeli: Ü3 rozet/rapor V1 sınırı; Ü4 yayında Save davranışı; Ü6 seri aktivasyonu; Ü7 yeniden yayın maili; Ü8 görüntülenme tanımı; Ü10 doğrulanmamış hesap kısıtı; Ü11 anonim oy saklama/birleştirme; veri saklama süreleri. Ayrıca public katalog/üyelik tanıtımı route'ları, domain/VPS kapasitesi, Google uygulaması, mail sağlayıcısı, kapak sağlayıcısı/lisans ve offsite yedek hedefi henüz seçilmedi. Bunlar mimariyi kodlamayı tamamen engellemez; ilgili entegrasyon veya launch kapısını etkiler.

Riskler: tek VPS tek hata noktası; mail sağlayıcısında exactly-once sınırı; eski local içerik için sahip kontrollü import ihtiyacı; SSR'ye geçmeden SEO eksik kalması; özel içeriğin yanlış cache/media katmanından sızması; frontend eski sözlüklerinin API sanılması. Karşılıklar yukarıda acceptance test olarak tanımlandı.

## Kaynaklar

Teknik referanslar 2026-10-05'te kontrol edildi; tasarımdaki süre/kota/seçimler sağlayıcı zorunluluğu değil proje önerisidir.

- [Spring Boot sistem gereksinimleri](https://docs.spring.io/spring-boot/system-requirements.html): Java uyumluluğu ve build tabanı.
- [Spring Session JDBC](https://docs.spring.io/spring-session/reference/configuration/jdbc.html): DB session şeması ve yönetimi.
- [Spring Security CSRF](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html): cookie/session tabanlı SPA akışı.
- [Next metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata), [sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap): frontend server metadata sorumluluğu.
- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics), [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing): ilk yanıt/noindex/crawl sınırları.
