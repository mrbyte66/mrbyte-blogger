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

## Örnek içerik ve test üyeleri

Site boş açılmasın diye (sahip hesabı oluşturulduktan sonra):

```sh
docker compose -f deploy/compose.local.yml run --rm backend seed-demo
```

25 yazı (yayında, taslak, planlı, kilitli; bir kısmı kapaklı), 4 seri, 2 ek kategori ve doğrulanmış üç üye ekler: `uye1@gmail.com` … `uye3@gmail.com`, parola `uyeN_123456789`. İçerik `backend/src/main/resources/seed/demo.json` dosyasındadır. Tekrar çalıştırmak güvenlidir: var olan yazı, seri ve hesaplara dokunmaz. Yalnız `dev` profilinde çalışır; üretimde reddedilir.

## Durdurma ve sıfırlama

```sh
docker compose -f deploy/compose.local.yml stop                # veriyi korur
docker compose -f deploy/compose.local.yml down -v             # veritabanı ve medya dahil HER ŞEYİ siler
```

Google ile giriş ve Pexels kapak araması bu yığında yapılandırılmamıştır; arayüz bunları "yapılandırılmadı" olarak gösterir.
