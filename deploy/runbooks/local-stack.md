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

## Main veya PR ile yenileme (`scripts/local-refresh`)

İlk kurulumdan sonra yığını tek komutla yenile. Betik çalışma kopyana dokunmadan hedef commiti geçici bir worktree'de derler, `backend`/`frontend` imajlarını yeniden kurar ve sağlıklı başlamalarını bekler. Veritabanı ve medya volume'ları korunur; betikte `down -v` gibi veri silen komut yoktur.

```sh
./scripts/local-refresh            # menü: panodaki In Test işleri (#numara ve başlık) + "güncel main'e dön"
./scripts/local-refresh main       # origin/main'i çeker ve yığını ondan kurar
./scripts/local-refresh pr 43      # PR #43'ün son commitini kurar; sonunda "local-refresh main" ile dönmeyi hatırlatır
./scripts/local-refresh durum      # şu an hangi kaynak ve commitin çalıştığını yazar
```

- Menüde iş numarası seçilir; bağlı açık PR betik tarafından panodan bulunur. `gh` girişi gerekir.
- `:3010`'da aynı anda tek kaynak çalışır. Başka PR için komutu yeniden çalıştır. Her yenilemeden sonra çıktı `Gösterilen: PR #43 · commit abc1234` biçiminde neyin çalıştığını yazar. Bilgi imaj etiketlerinden (`satir.source`, `org.opencontainers.image.revision`) okunur.
- Geçici worktree başarıdan sonra silinir. Derleme veya sağlık kontrolü başarısız olursa inceleme için yerinde bırakılır; çıktı yolunu, günlük ve silme komutunu yazar. Ayrı dal açılmaz (detached worktree).
- `deploy/google.local.env` varsa geçici kopyaya alınır ve worktree ile birlikte silinir.
- Bir PR'ın migration'ı veritabanını main'den ileri taşıyabilir; main'e dönünce şema farkı hata verirse PR merge edilene kadar o PR'da kal veya yedekten dön (`backup-restore.md`).
- `main` modu çalışma kopyan temiz `main` dalındaysa onu da ileri alır; değilse yalnız `origin/main`'i derler.

Her yerden çalıştırmak için kısayol (bir kez, `~/.zshrc`):

```sh
echo "alias local-refresh='$HOME/Documents/mrbyte-blogger/scripts/local-refresh'" >> ~/.zshrc && source ~/.zshrc
```

Deneme için ayrı yığın: `SATIR_LOCAL_PROJECT`, `LOCAL_IMAGE_TAG` ve port değişkenleri (`LOCAL_WEB_PORT` vb.) asıl `satir-local` yığınından ayrı volume, imaj ve port kullanır.

## Kod değişince (çalışma kopyasından)

```sh
docker compose -f deploy/compose.local.yml up -d --build backend frontend
```

Bu yol imaj etiketini `working-tree` olarak bırakır; `local-refresh durum` bunu gösterir.

## Örnek içerik ve test üyeleri

Site boş açılmasın diye (sahip hesabı oluşturulduktan sonra):

```sh
docker compose -f deploy/compose.local.yml run --rm backend seed-demo --file=/opt/satir/seed/demo.json
```

25 yazı (yayında, taslak, planlı, kilitli; bir kısmı kapaklı), 4 seri, 2 ek kategori ve doğrulanmış üç üye ekler (`uye1@gmail.com` … `uye3@gmail.com`). İçerik ve üye parolaları `deploy/seed/demo.json` dosyasındadır; yığın onu salt okunur bağlar, dosya imaja ve jar'a girmez. Tekrar çalıştırmak güvenlidir: var olan yazı, seri ve hesaplara dokunmaz. Yalnız `dev` profilinde çalışır; üretimde reddedilir.

## Durdurma ve sıfırlama

```sh
docker compose -f deploy/compose.local.yml stop                # veriyi korur
docker compose -f deploy/compose.local.yml down -v             # veritabanı ve medya dahil HER ŞEYİ siler
```

Pexels kapak araması bu yığında yapılandırılmamıştır; arayüz bunu "yapılandırılmadı" olarak gösterir. Google ile giriş için aşağıdaki adımlar gerekir.

## Google ile giriş (yerel)

1. Google Cloud Console → *APIs & Services → Credentials* → *OAuth client ID* (Web application).
2. *Authorized redirect URI*: `http://127.0.0.1:3010/api/v1/auth/google/callback`. Backend bunu `PUBLIC_SITE_ORIGIN`'den türetir; siteyi bu adresle aç (`localhost` ile açılan oturum geri dönüşte kaybolur).
3. Kimlik bilgilerini git dışı `deploy/google.local.env` dosyasına yaz (kayda, sohbete veya komut satırına girmez):

   ```sh
   SATIR_GOOGLE_CLIENT_ID=…
   SATIR_GOOGLE_CLIENT_SECRET=…
   ```

4. `docker compose -f deploy/compose.local.yml up -d backend` (dosyayı `env_file` olarak okur). Yapılandırma doğruysa `POST /api/v1/auth/google/start` 503 `GOOGLE_NOT_CONFIGURED` yerine bir `authorizationUrl` döndürür.

## Docker'sız: yerel PostgreSQL + jar (isteğe bağlı)

Backend'i hızlı yeniden başlatmak gerektiğinde. Site `http://localhost:3000`, backend `8080` (`dev` profili); yukarıdaki Docker yığınıyla aynı anda çalışabilir. Gerekenler: JDK 25, Node 22, PostgreSQL (16 ile elle, 18 ile testlerde denendi).

```sh
# 1. Boş veritabanı (dev profilinin varsayılanları: satir / satir-dev)
psql -h 127.0.0.1 -d postgres -c "CREATE ROLE satir LOGIN PASSWORD 'satir-dev'" -c "CREATE DATABASE satir OWNER satir"

# 2. Jar, migration ve sahip (parola git dışı dosyada; komut satırına yazma)
cd backend && ./mvnw package -DskipTests
export DB_PASSWORD=satir-dev SATIR_RATE_LIMIT_KEY=dev-only-rate-limit-key-not-for-production
java -jar target/satir-backend-0.1.0-SNAPSHOT.jar migrate
java -jar target/satir-backend-0.1.0-SNAPSHOT.jar bootstrap-owner --email=sahip@satir.localhost --username=mrbyte --name="Mr Byte" --password-file=../deploy/owner-password.local.txt

# 3. Backend ve site
SPRING_PROFILES_ACTIVE=dev java -jar target/satir-backend-0.1.0-SNAPSHOT.jar
cd ../frontend && npm ci && npm run dev     # /api istekleri 127.0.0.1:8080'e gider
```

Farklı bir dalın şemasıyla kurulmuş eski bir veritabanı varsa (`flyway_schema_history` main'den fazla sürüm içerir) migration başarısız olur veya sayfalar 500 verir; yedekleyip silin ve 1. adımdan kurun. E-posta gönderen akışlar Mailpit'i `localhost:1025` (SMTP) bekler; yoksa bu akışlar hata kaydı bırakır.
