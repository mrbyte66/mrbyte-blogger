# VPS dağıtım ve işletim planı

Tarih: 2026-10-05. Durum: uygulanacak taslak. Henüz Dockerfile, Compose, migration, backend servisi veya VPS kurulumu yapılmadı. Aşağıdaki yollar/komutlar **uygulama aşamasında oluşturulacak dosyaları** tarif eder; bugün çalışır diye sunulmaz. Domain, sağlayıcı, secret ve sunucu erişimi gerekmeden planlanmıştır. [Mimari](backend-architecture.md) ve [API](api-contract.md) ile birlikte kullanılır.

## 1. Topoloji ve sınırlar

```text
Tarayıcı / arama motoru
        | HTTPS :443
        v
Caddy reverse proxy (TLS + tek canonical host)
        | /api/**                    | diğer web route'ları
        v                           v
Spring Boot :8080 <--- dahili --- Next.js :3000 (SSR + client UI)
        |
        +--- PostgreSQL :5432 (session + içerik + işler)
        +--- private media volume (READY/karantina/temporary exports)
        +--- dış mail / Google / kapak sağlayıcısı (HTTPS/SMTP-TLS)

Ayrı hedef: şifreli offsite DB + medya + manifest yedeği
```

V1 tek Spring instance, tek Next instance, tek PostgreSQL. Caddy sadece 80/443 public; SSH yalnız yönetim IP'si/VPN ve anahtar ile. 3000/8080/5432 host'a publish edilmez. DB ayrı compose internal network, backend DB'ye; frontend yalnız backend'e erişir. Dış servis çıkışı gereken backend için ayrıca egress network. Reverse proxy Docker socket mount etmez. Health/OpenAPI/actuator public proxy route'u yok.

Production tek origin (`https://<domain>`), `/api` path'i strip edilmeden backend'e. Next SSR `BACKEND_INTERNAL_URL=http://backend:8080`; browser `NEXT_PUBLIC_API_BASE=/api/v1`. `PUBLIC_SITE_ORIGIN` trusted config, Host header'dan canonical yapılmaz. `www`/çıplak domain biri canonical seçilir, diğeri 308. Başka Host reddedilir. Backend forwarded headers yalnız güvenilen Caddy'den kabul edilir; client X-Forwarded-For sanitize edilir. OAuth redirect URI aynı canonical host `/api/v1/auth/google/callback`.

Caddy HTTPS sertifikasını yeniler; sertifika state volume'u kalıcı. HSTS önce kısa süreyle kontrol edilir, tüm ilgili host'lar HTTPS olmadan preload/includeSubDomains zorlanmaz. CSP uygulamanın mevcut inline tema bootstrap/Google redirect/media kaynaklarıyla nonce/hash üzerinden test edilir; X-Content-Type-Options:nosniff, Referrer-Policy:strict-origin-when-cross-origin, Studio iframe için frame-ancestors 'self'. Özel içerik/JSON API/cache politikasını proxy gevşetmez.

## 2. Kaynak bütçesi ve sürümler

Başlangıç planlama varsayımı: yaklaşık 100 günlük ziyaret, tek owner, müzik dosyaları mevcut dış kaynakta. 4 GiB RAM ve 1–2 vCPU başlangıç adayı; kesin kapasite vaadi değildir. Next/Java build üretim VPS'inde yapılmaz. Örnek ölçüm bütçesi: backend container1.25GiB (heap~640MiB, kalan native/metaspace), frontend768MiB, PostgreSQL768MiB, proxy128MiB; OS/dosya cache/işler için kalan alan. Hikari max5–10 connection, düşük worker concurrency. Docker hard-limit + JVM bellek ayarı birlikte test edilmeli; heap=container RAM yapılmamalı.

Java25 JRE, Spring Boot4.1.x, PostgreSQL18, mevcut frontend'in desteklediği Node LTS ve Caddy2 önerilir; uygulama başında resmi uyumluluk/yamalar doğrulanır ve digest ile sabitlenir. `latest` tag yok. Frontend lockfile korunur; ihtiyaç olmadan framework yükseltilmez. PostgreSQL major upgrade yalnız ayrı plan/restore testiyle, eski data volume yeni major'a doğrudan takılmaz.

Kapak/fotoğraf, PostgreSQL ve backup disk büyümesi izlenir. Disk en az %20 boş hedef; medya sınırları, tmp cleanup, Docker image/log rotation. Swap kapasite yerine geçmez. Gerçek içerikle 10 eşzamanlı okuyucu testi başlangıç ölçümü; p95 response/heap/DB connection/disk izlenir, scheduler ve login hashing dahil. Gerekirse ölçüm sonucu VPS büyütülür.

## 3. Uygulamada üretilecek dağıtım dosyaları

| Yol / service | Sözleşme |
| --- | --- |
| frontend/Dockerfile | Multi-stage CI build, production Next standalone output, non-root; standalone config uygulamada eklenecek |
| backend/Dockerfile | Maven Wrapper CI build, testlenmiş JAR, non-root Java25 runtime |
| deploy/compose.dev.yml | PostgreSQL + mailpit; localhost bağlantıları, prod'dan ayrı volume/secret; Next/Spring IDE veya compose ile |
| deploy/compose.prod.yml | proxy, frontend, backend, postgres; restart unless-stopped, healthcheck, CPU/RAM/log limit; named volumes |
| migrate service/profile | Aynı backend release image; Flyway migrate+validate yapıp success/failure ile çıkar; web/scheduler/mail başlamaz. App start migration yapmaz, sadece validate |
| backup service/profile | Pinli PostgreSQL client + şifreli offsite backup aracı; salt okunur medya erişimi, yazma yetkisi hedefe sınırlı |
| deploy/Caddyfile | Host/path routing, TLS, upload limit, timeout, no-store, static cache ayrımı |
| deploy/.env.example | Yalnız placeholder/config isimleri; gerçek secret yok |
| deploy/runbooks/ | deploy, restore, rollback, owner bootstrap, secrets rotation ve host rebuild talimatları |

Prod DB runtime rolü yalnız uygulama schema'sında gereken DML; Flyway ayrı DDL rolü, bootstrap/backup ayrı en az yetki. Runtime DB superuser olmaz. Compose bütün env'yi her servise geçirmez. Secret dosyaları `/etc/satir/secrets/` altında 0600/izinli servis grubu, Git dışında; mümkünse Spring configtree/Docker secrets mount. DB parolaları shell history/process argv'ye yazılmaz. `NEXT_PUBLIC_*` yalnız kamu ayarı; OAuth/mail/DB secret asla burada değil.

Environment envanteri (değerleri belgede yok):
- Kamu: PUBLIC_SITE_ORIGIN, NEXT_PUBLIC_API_BASE.
- Dahili: BACKEND_INTERNAL_URL, DB_HOST/PORT/NAME, DB_USER, APP_TIME_ZONE=Europe/Istanbul, INDEXING_ENABLED=false varsayılan.
- Secret mount: DB runtime/migration/backup password, Google client secret, mail key/password, cover API key, backup encryption/repository credential; anonymous actor/rate HMAC secret.
- Sağlayıcı: GOOGLE_CLIENT_ID/REDIRECT_URI, MAIL_FROM/HOST/PORT veya HTTP endpoint, COVER_PROVIDER, backup hedefi.
- Çalışma: APP_RELEASE, scheduler interval/concurrency, retention/limits. Owner bootstrap parolası tek seferlik stdin/secret file'dan; sürekli env veya example'da yok.

## 4. Yerel geliştirme ve doğrulama

1. Frontend ve backend bağımsız build edilir. Yerelde DB aynı PostgreSQL major'da; testler Testcontainers ile disposable DB kullanır. Dev fixtures yalnız açık dev seed, üretimde seed default kapalı.
2. Compose dev DB/mailpit başlar. Backend migration çalışır, owner bootstrap lokal hesapla yapılır. Mailpit yalnız dev endpoint; prod profile gerçek provider yoksa ilgili özellik unavailable/health uyarısı, başarılı mail taklidi yok.
3. Next dev reverse proxy `/api`yi Spring'e yönlendirir; bu yalnız transport, Next business API değildir. HTTP local cookie adı `satir-session-dev` Secure=false olabilir; production cookie ayarları ayrı ve zorunlu.
4. Frontend `npm ci`, test/typecheck/build; backend `./mvnw verify` (unit+integration+contract+ArchUnit). Container network/port/volume testleri, temiz DB migration ve eski şemadan geçiş.
5. Google için ayrı development OAuth client, exact redirect URI; unit/integration testleri provider mock. Production secret bilgisayara kopyalanarak test yapılmaz.

Aşağıdaki komutlar ilgili dosyalar oluşturulduktan sonra repo kökünden çalıştırılır:

```sh
docker compose -f deploy/compose.dev.yml up -d postgres mailpit
cd backend
./mvnw verify
```

`./mvnw verify` integration testleri atlamamalı; Docker yoksa test sonucu “atlandı” olarak açık kalır, production release kapısı geçmez. Frontend komutları kendi dizininde mevcut npm scripts'tir.

## 5. CI ve ilk yayın

CI sırası: dependency restore→tests→OpenAPI lint/breaking diff→Next production build→image build→vulnerability/secret taraması→immutable release tag+digest+manifest. Release manifest: git SHA, backend/frontend digest, DB migration sürümü, OpenAPI hash. Güvenlik taraması uygulama testlerinin yerine geçmez. CI secret'ları log/artifact'a basılmaz.

VPS hazırlığı:
1. Desteklenen Linux LTS, güvenlik yamaları, SSH anahtarı, ayrı deploy kullanıcısı; Docker Engine/Compose kurulumu. Docker grubu root gücüne yakındır, genel kullanıcıya verilmez.
2. Firewall public 80/443; yönetim SSH allowlist. Docker port yayınlamanın host firewall'ı aşabildiği dikkate alınır: DB/frontend/backend için `ports` hiç tanımlanmaz.
3. DNS A/AAAA doğru VPS'ye; kullanılmayan IPv6 AAAA kaldırılır. Volume yeri/izin/disk sınırı hazırlanır. Offsite backup hedefi ve encryption key recovery ayrı ortamda saklanır.
4. Secret'lar out-of-band `/etc/satir` altına konur. Prod mail provider domain SPF/DKIM/DMARC ve Google redirect domain doğrulamaları tamamlanır. E-posta gönderen servis VPS'in kendi mail server'ı olmaz.
5. DB başlat, DDL/runtime rolleri hazırla, migration service çalıştır, owner bootstrap. İlk bootstrap owner zaten varsa hata verir; parola reset için belgeli ayrı komut gerekir.
6. App+proxy başlat; domain/TLS/session/public sayfa/403/404/media health smoke test. İndeksleme hâlâ kapalı, örnek içerik otomatik yayınlanmaz.
7. Gerçek content/theme owner kontrollü import+publish; backup/restore drill ve SEO checklist geçince deployment gate ile site indexingEnabled birlikte açılır.

Gelecekteki komut arayüzü (değişkenler `/etc/satir/release.env` içinde image digest referansları; sırlar ayrı mount):

```sh
docker compose --env-file /etc/satir/release.env -f deploy/compose.prod.yml pull
docker compose --env-file /etc/satir/release.env -f deploy/compose.prod.yml up -d postgres
docker compose --env-file /etc/satir/release.env -f deploy/compose.prod.yml run --rm migrate
docker compose --env-file /etc/satir/release.env -f deploy/compose.prod.yml up -d backend frontend proxy
```

Yalnız started olması ready olması değildir. PostgreSQL pg_isready, backend readiness DB+schema, Next dahili health (sır içermez) beklenir; public traffic hazır olmayan uygulamaya açılmaz. Backend liveness DB'den bağımsız, readiness DB'ye bağlı. Actuator ayrıntıları yalnız internal; public probe gerekirse proxy'nin yalnız minimal status endpoint'i.

## 6. Güncelleme ve rollback

Başlangıç için kısa bakım pencereli yayın yeterlidir; zero downtime vaadi yok. Release öncesi current manifest ve yedek zamanı kaydedilir, auth session schema uyumu kontrol edilir. Expand-contract migration: önce ekleme/nullable/backfill, sonra uygulama, destructive drop ayrı release. Eski app'in yeni schema'yla çalışabilme sınırı release manifestinde belirtilir.

- Güncelleme öncesi kısa süre mutation/scheduler durdur; tutarlı snapshot/yedek al; yeni image'ları pull et. Tek migrate job tamamlanmadan yeni app hazır sayılmaz. Flyway hata verirse rollout durur; migration history dosyası elle değiştirilmez.
- Sağlıklı app'ler start, public/private/auth/publish smoke test; sonra yazma ve scheduler açılır. Bu arada zamanı geçen scheduled işler sonraki taramada normal generation kontrolüyle işlenir.
- Hata uygulama kaynaklı ve schema geriye uyumluysa önceki digest'e dön, readiness kontrol et. DB down migration otomatik yapılmaz.
- Yeni schema eski app'le uyumlu değilse maintenance'da restore veya ileri düzeltme seçilir. Restore son snapshot sonrası veriyi kaybettirebilir; operatör bu kapsamı bilerek uygular. Restore olmuş job/outbox dış dünyada gönderilmiş mail'i geri alamaz; provider dedupe anahtarları ve restore cutoff uzlaştırılmadan worker açılmaz.
- Hesap silme/revocation yedekten geri gelebilir: ayrı append-only deletion/revocation journal offsite saklanır, restore sonrası önce replay edilir. Token/session restore sonrası bütün oturumlar/action token'lar iptal edilir, kullanıcı tekrar giriş yapar.

## 7. Yedekleme ve geri yükleme

Önerilen hedefler: başlangıç RPO≤24 saat, RTO≤4 saat; **restore deneyi yapılana kadar hedef, garanti değil**. İlk sürüm günlük DB+media full/incremental set, günlük7/haftalık4/aylık3 retention önerisi. Kullanıcıya hesap silme sonrası backup retention sınırı açıklanır. Yedek VPS'in aynı diskinde kalırsa felaket yedeği sayılmaz.

PostgreSQL `pg_dump -Fc` tutarlı DB snapshot üretir, fakat media dosyalarıyla otomatik ortak snapshot sağlamaz. Düşük trafikte backup sırasında kısa yazma/upload/scheduler/mail worker maintenance; READ devam edebilir. DB dump ve referenced media manifest'i aynı pencereye bağla, dosyaları şifreli offsite hedefe kopyala; doğrulama sonrası maintenance kaldır. Daha sonra upload immutable storage + watermark planıyla pencere kısaltılabilir.

Yedek seti: DB custom dump + role/grant yeniden oluşturma manifesti (parola hariç), READY media ve content hash manifesti, release/image/migration bilgisi, site/deploy public config. Secret/encryption key ayrı güvenli yedek; uygulama export'uyla credentials karıştırılmaz. Private medya yedeği de şifreli. Backup failure sessiz geçmez; son başarılı zaman, boyut/checksum ve hedef erişimi izlenir.

Restore drill (aylık ve her major DB değişiminde):
1. İzole boş DB/volume, egress mail/OAuth/cover kapalı; indexing false.
2. Doğru PostgreSQL major/role'ları kur, dump `pg_restore --exit-on-error` ile boş DB'ye yükle. Üretim mevcut DB'sine kör overwrite yapma.
3. Medya manifest checksum'unu doğrula; current revision references ve dosyalar eşleşsin. Release image/sürüm aynı olsun, gerekirse ileri Flyway migration.
4. Silme journal'ını uygula; restore öncesi oturum/token'ları geçersizleştir. Mail outbox'ı karantina modunda incele; restore sonrası artık private olan yazının mail'i gönderilmesin.
5. Owner/member izolasyonu, private URL/media 404, draft/schedule, history/bookmark/notlar ve site theme Apply smoke testleri; en az bir gerçek yedekten ölçülen süre raporlanır.
6. Üretim DNS/traffic açılmadan security/backup checks; worker ve mail çıkışı kontrollü açılır. Geç due işleri generation/idempotency kuralları yönetir.

Mantıksal backup yaklaşımının dayanağı: [PostgreSQL SQL dump dokümantasyonu](https://www.postgresql.org/docs/current/backup-dump.html). WAL/PITR V1 başlangıç altyapısına zorunlu eklenmez; daha düşük RPO istenirse ayrı karar.

## 8. Gözlenebilirlik ve arıza davranışı

JSON structured log: timestamp, level, module, requestId, route template, status, duration, resource ID ve release. Parola/token/cookie, tam query string (reset token), body, not, e-posta adresi, Google code, kişisel geçmiş loglanmaz. Caddy access log da sensitive URL query'lerini sanitize eder. Max boyut+rotation, disk uyarısı.

İlk izlenecekler: 5xx oranı/p95, CPU/RAM/disk, DB connections, readiness, backup age, due-job lag, mail FAILED sayısı, TLS expiry, 401/429 anomali. External uptime check ve hata/backup uyarı kanalı operatör tarafından seçilir; analytics amaçlı kişisel event akışıyla karıştırılmaz. Admin dashboard'da private not/kitaplık gösterilmez.

- DB yok: public fetch 503, eski private olabilecek içeriği cache'den dönme; kullanıcı mutation başarısızlığını görür.
- Mail yok: yayın devam eder, job retry/failed; UI “mail teslim edildi” demez.
- Kapak provider yok: metin kaydı devam, kapak placeholder/manual; eski manuel seçim korunur.
- Disk dolu/upload decode hatası: READY kaydı yapılmaz, temp cleanup ve görünür hata.
- VPS kapandı: persistent volume+offsite backup; açılınca due yayınları işle. Ses sekme devri backend'e taşınmaz.

## 9. SEO yayın kapısı

- Gerçek domain canonical, tek https host; article/series slug değişikliklerinde 308; canonical href ve OG gerçek mutlak URL.
- JavaScript kapalı veya curl ile body, başlık, linkler ve metadata ilk HTML'de. Client localStorage-fixture hydration'a bağımlı içerik kalmaz.
- `/yazilar` ve `/seriler` katalog+pagination linkleri, yeni içerik rebuild gerektirmeden erişilir. Filter/search noindex.
- Published public200; olmayan/private/draft/planlı404, API arızası503. RSC/client navigation aynı güvenliği korur; notFound streaming sonrası yanlış200 üretmemeli.
- robots/sitemap prod gate ile açık; sitemap özel URL/alias/draft içermez; noindex kaldırma server'da, hydration'da değil. Staging erişimi auth+noindex.
- Schema.org verisi görünür gerçek içerikle aynı; card displayDate gerçek ilk yayın zamanı diye işaretlenmez. Image alt/boyut ve layout stability korunur.
- Hesap/Studio/preview/private dosya shared cache'e girmez. Kullanıcı logout veya public→private sonrası yeni istekte veri bulunmaz; browser'ın daha önce indirdiği içeriği uzaktan geri alma vaadi yok.
- Search Console domain doğrulama/sitemap gönderimi ve örnek URL inspection manuel launch adımıdır; indekslenme/sıralama garantisi verilmez.

## 10. Launch bağımlılıkları

Domain/VPS/secret olmadan uygulama ve local kabul testleri ilerleyebilir. Gerçek yayın öncesi seçilecekler: canonical domain; VPS kapasitesi/bölgesi; offsite yedek hedefi; mail sağlayıcısı ve gönderici domain; Google OAuth client; kapak lisansı/API hesabı; alarm kanalı; mahremiyet/saklama tercihleri. Bu planda hiçbir servis satın alınmadı, sunucuya bağlanılmadı, e-posta gönderilmedi.
