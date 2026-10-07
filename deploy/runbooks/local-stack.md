# Yerel tam yığın (arayüz testi için)

`deploy/compose.local.yml` bu çalışma kopyasından backend ve frontend imajlarını derler; PostgreSQL 18 ve Mailpit ile birlikte çalıştırır. Üretim değildir: `dev` profili (HTTP çerezleri, açılışta migration), atılabilir parolalar, bütün e-postalar Mailpit'te kalır. Portlar yalnız `127.0.0.1`'e bağlanır ve 3000/3001/5432/8080 kullanan başka yerel yığınlarla çakışmaz.

| Adres | İçerik |
| --- | --- |
| http://127.0.0.1:3010 | Site (Next.js; `/api` istekleri içeride backend'e gider) |
| http://127.0.0.1:3010/studio | Studio (yalnız sahip) |
| http://127.0.0.1:8025 | Mailpit gelen kutusu (doğrulama, sıfırlama, yayın e-postaları) |
| `127.0.0.1:55432` | PostgreSQL (`satir` / `satir-local`), isteğe bağlı `psql` erişimi |

Portlar `LOCAL_WEB_PORT`, `LOCAL_MAIL_UI_PORT`, `LOCAL_DB_PORT` ortam değişkenleriyle değiştirilebilir (web portu değişirse e-postalardaki bağlantılar da ona göre üretilir).

## Başlatma

Repo kökünden:

```sh
docker compose -f deploy/compose.local.yml up -d --build
docker compose -f deploy/compose.local.yml ps          # backend ve frontend "healthy" olmalı
```

İlk kez: sahip hesabını oluştur. Parolayı (en az 12 karakter) git dışı bir dosyaya yaz (`deploy/*.local.txt` yok sayılır) ve dosya olarak ver; komut satırına yazma. Docker'a TCP üzerinden (`DOCKER_HOST=tcp://…`, WSL forwarder) bağlanılıyorsa `run -T … < dosya` stdin'i güvenilir taşımaz, bu yüzden dosyayı geçici olarak medya volume'una kopyala:

```sh
docker cp deploy/owner-password.local.txt satir-local-backend-1:/var/lib/satir/media/.owner-pw
docker compose -f deploy/compose.local.yml run --rm backend bootstrap-owner --email=sahip@satir.localhost --username=mrbyte --name="Mr Byte" --password-file=/var/lib/satir/media/.owner-pw
docker compose -f deploy/compose.local.yml run --rm --entrypoint rm backend -f /var/lib/satir/media/.owner-pw
```

Yerel Docker soketiyle çalışıyorsan stdin de olur: `… run --rm -T backend bootstrap-owner … < deploy/owner-password.local.txt`.

Sonra `/studio`'dan kullanıcı adı veya e-posta ile gir. Okur hesabı için sitede "Üye ol" → Mailpit'teki doğrulama bağlantısı.

## Kod değişince

```sh
docker compose -f deploy/compose.local.yml up -d --build backend frontend
```

## Durdurma ve sıfırlama

```sh
docker compose -f deploy/compose.local.yml stop                # veriyi korur
docker compose -f deploy/compose.local.yml down -v             # veritabanı ve medya dahil HER ŞEYİ siler
```

Google ile giriş ve Pexels kapak araması bu yığında yapılandırılmamıştır; arayüz bunları "yapılandırılmadı" olarak gösterir.

## Docker'sız: yerel PostgreSQL + jar

Kod üzerinde çalışırken site `http://localhost:3010`, backend `8080` (`dev` profili). Gerekenler: JDK 25, Node 22, PostgreSQL (16 ile elle, 18 ile testlerde denendi).

```sh
# 1. Boş veritabanı (dev profilinin varsayılanları: satir / satir-dev)
psql -h 127.0.0.1 -d postgres -c "CREATE ROLE satir LOGIN PASSWORD 'satir-dev'" -c "CREATE DATABASE satir OWNER satir"

# 2. Jar, migration ve sahip (parola git dışı dosyada; komut satırına yazma)
cd backend && ./mvnw package -DskipTests
export DB_PASSWORD=satir-dev SATIR_RATE_LIMIT_KEY=dev-only-rate-limit-key-not-for-production
java -jar target/satir-backend-0.1.0-SNAPSHOT.jar migrate
java -jar target/satir-backend-0.1.0-SNAPSHOT.jar bootstrap-owner --email=sahip@satir.localhost --username=mrbyte --name="Mr Byte" --password-file=../deploy/owner-password.local.txt

# 3. Backend ve site
SPRING_PROFILES_ACTIVE=dev PUBLIC_SITE_ORIGIN=http://localhost:3010 java -jar target/satir-backend-0.1.0-SNAPSHOT.jar
cd ../frontend && npm ci && PORT=3010 npm run dev     # /api istekleri 127.0.0.1:8080'e gider
```

Farklı bir dalın şemasıyla kurulmuş eski bir veritabanı varsa (`flyway_schema_history` main'den fazla sürüm içerir) migration başarısız olur veya sayfalar 500 verir; yedekleyip silin ve 1. adımdan kurun. E-posta gönderen akışlar için Mailpit `localhost:1025` (SMTP) / `localhost:8025` (arayüz) bekler; yoksa bu akışlar hata kaydı bırakır.

### Google ile giriş (yerel)

1. Google Cloud Console → *APIs & Services → Credentials* → *OAuth client ID* (Web application).
2. *Authorized redirect URI*: `http://localhost:3010/api/v1/auth/google/callback` (backend bunu `PUBLIC_SITE_ORIGIN`'den türetir; site adresi değişirse bu da değişir).
3. Kimlik bilgilerini git dışı `deploy/google.local.env` dosyasına yaz (kayda, sohbete veya komut satırına girmez):

   ```sh
   SATIR_GOOGLE_CLIENT_ID=…
   SATIR_GOOGLE_CLIENT_SECRET=…
   ```

4. Backend'i bu dosyayı yükleyerek başlat: `set -a; . ../deploy/google.local.env; set +a` ve ardından 3. adımdaki komut. Yapılandırma doğruysa `POST /api/v1/auth/google/start` 503 `GOOGLE_NOT_CONFIGURED` yerine bir `authorizationUrl` döndürür.
