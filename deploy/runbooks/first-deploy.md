# İlk VPS kurulumu

Kaynak: [VPS planı](../../docs/deployment-vps.md). Komutlar repo kökündeki `deploy/` dizininden çalıştırılır. `<...>` yer tutucularını kendi değerlerinle değiştir; gerçek değerleri bu dosyaya veya Git'e yazma.

## 0. Ön koşullar (karar gerektirir)

Canonical domain, VPS (öneri: 4 GiB RAM, 1–2 vCPU, Linux LTS), SMTP sağlayıcısı ve gönderici domain (SPF/DKIM/DMARC), isteğe bağlı Google OAuth istemcisi ve Pexels anahtarı, şifreli offsite yedek hedefi (restic deposu: S3 uyumlu depo, SFTP vb.), uyarı kanalı.

## 1. Sunucu

1. Güvenlik yamaları; parola ile SSH kapalı, yalnız anahtar; ayrı `deploy` kullanıcısı. Docker grubu root eşdeğeridir, yalnız operatöre verilir.
2. Docker Engine + Compose plugin kur.
3. Güvenlik duvarı: yalnız 80/tcp, 443/tcp, 443/udp herkese; 22/tcp yönetim IP'lerine. `compose.prod.yml` yalnız `proxy` için port yayınlar; DB/backend/frontend için asla `ports` ekleme.
4. DNS: `SITE_HOST` ve `SITE_ALT_HOST` için A (ve gerçekten kullanılıyorsa AAAA) kayıtları bu VPS'i göstersin.

## 2. Sırlar ve yapılandırma

```sh
sudo install -d -m 0700 -o root -g root /etc/satir/secrets
cd /etc/satir/secrets
for name in postgres_superuser_password db_migration_password db_app_password db_backup_password rate_limit_key restic_password; do
  sudo sh -c "umask 022; openssl rand -base64 36 | tr -d '\n' > $name"
done
# İsteğe bağlı sırlar: kullanılmıyorsa boş dosya kalır (özellik "yapılandırılmadı" görünür, sahte başarı yok).
for name in mail_password google_client_secret pexels_api_key; do sudo sh -c "umask 022; : > $name"; done
sudo chmod 0444 /etc/satir/secrets/*      # konteyner kullanıcıları okuyabilir; dizin 0700 root olduğu için host'ta erişilemez
sudo sh -c 'umask 077; printf "RESTIC_REPOSITORY=<repo-url>\n" > restic.env'   # + sağlayıcı erişim değişkenleri (ör. AWS_ACCESS_KEY_ID)
```

- Gerçek SMTP parolasını `mail_password`, Google sırrını `google_client_secret`, Pexels anahtarını `pexels_api_key` dosyasına sonradan editörle yaz (shell geçmişine düşürme).
- `restic_password` ve `restic.env` içeriğini sunucudan **ayrı** güvenli bir yerde de sakla; bunlar olmadan yedekler açılamaz.
- `/etc/satir/release.env` dosyasını `deploy/.env.example` içindeki "Release", "Public site / edge" ve gerekli "Backend runtime/E-mail/Google" adlarıyla oluştur (sır içermez, `0640`).

## 3. İmajlar

CI (veya yerel güvenilir makine) sırasıyla: `backend: ./mvnw verify` (PostgreSQL entegrasyon testleri atlanmadan), `frontend: npm ci && npm test && npm run typecheck && npm run build`, ardından:

```sh
docker build -t <registry>/satir-backend:<git-sha> backend
docker build -t <registry>/satir-frontend:<git-sha> frontend
docker push <registry>/satir-backend:<git-sha>
docker push <registry>/satir-frontend:<git-sha>
```

`release.env` içine `BACKEND_IMAGE`/`FRONTEND_IMAGE` olarak **digest** (`...@sha256:...`) yaz; `POSTGRES_IMAGE`, `CADDY_IMAGE`, `RESTIC_IMAGE` için de digest sabitle. `latest` kullanma. Üretim VPS'inde build yapılmaz.

## 4. Veritabanı, migration ve sahip hesabı

```sh
export COMPOSE="docker compose --env-file /etc/satir/release.env -f compose.prod.yml"
$COMPOSE pull
$COMPOSE up -d postgres                 # ilk açılışta postgres/init-roles.sh en az yetkili rolleri kurar
$COMPOSE run --rm migrate               # satir_migrator ile Flyway migrate; başarı/hatayla çıkar
sudo cat /root/owner-password | $COMPOSE run --rm -T migrate bootstrap-owner \
  --email=<sahip@domain> --username=<kullanici-adi> --name="<Görünen Ad>"
```

- Sahip parolası yalnız stdin'den (veya `--password-file`) okunur; komut satırına, env'e veya loga yazılmaz. Dosyayı işlemden sonra güvenle sil.
- İkinci bir sahip veya mevcut sahibin üzerine yazma reddedilir.

## 5. Uygulamayı açma

```sh
$COMPOSE up -d backend frontend proxy
$COMPOSE ps                              # hepsi healthy olmalı (backend readiness DB'yi de kontrol eder)
```

Smoke test (indeksleme hâlâ kapalı):

- `https://<SITE_HOST>/` 200, `https://<SITE_ALT_HOST>/` → 308 canonical host.
- `https://<SITE_HOST>/api/v1/auth/csrf` 200 ve `Cache-Control: no-store`; `https://<SITE_HOST>/actuator/health` dış dünyadan **404** (proxy yönlendirmez).
- `/studio` sahip girişi; okur hesabıyla Studio reddi; olmayan yazı 404.
- Mail yapılandırıldıysa kayıt/doğrulama e-postası gelir; yoksa yayın mail işleri `MAIL_NOT_CONFIGURED` olarak görünür.
- `robots.txt` ve sayfalarda `noindex` (deployment gate kapalı).

## 6. Yedekleme zamanlaması

```cron
# /etc/cron.d/satir-backup — gece, düşük trafik saatinde
30 3 * * * deploy sh -c 'cd /opt/satir/deploy && C="docker compose --env-file /etc/satir/release.env -f compose.prod.yml" && $C run --rm backup && $C run --rm offsite' >> /var/log/satir-backup.log 2>&1
```

İlk çalıştırmadan önce restic deposunu bir kez başlat: `$COMPOSE run --rm offsite init`. Saklama: `$COMPOSE run --rm offsite forget --keep-daily 7 --keep-weekly 4 --keep-monthly 3 --prune` (haftalık). Son başarılı yedek zamanını izle; başarısızlık sessiz geçmemeli. Restore tatbikatı: [backup-restore.md](backup-restore.md).

## 7. Yayına açma (indeksleme)

Gerçek içerik sahibin kontrolünde yayımlandıktan, restore tatbikatı ve SEO kontrol listesi ([VPS planı §9](../../docs/deployment-vps.md)) geçtikten sonra: `release.env` içinde `INDEXING_ENABLED=true`, `$COMPOSE up -d backend frontend`, ardından Studio'da site ayarı "indekslenebilir". Search Console doğrulaması ve sitemap gönderimi elle yapılır.
