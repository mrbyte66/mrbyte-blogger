# Sürüm güncelleme, geri alma ve sır değiştirme

`COMPOSE="docker compose --env-file /etc/satir/release.env -f compose.prod.yml"` (repo `deploy/` dizininden). Kısa bakım pencereli yayın; sıfır kesinti vaadi yok.

## Güncelleme

1. Yeni sürüm CI'da `./mvnw verify` + frontend test/typecheck/build'den geçmiş, imajlar **Images** iş akışıyla taranmış, imzalanmış ve digest ile yayımlanmış olmalı. Release manifest (git SHA, iki imaj digest'i, son Flyway sürümü) o çalıştırmanın özetinde ve `release-manifest-<commit>` artefaktındadır; imzayı [first-deploy.md](first-deploy.md) §3'teki `cosign verify` ile doğrula.
2. Mevcut `release.env`'i `release.env.<tarih>` olarak sakla (geri dönüş noktası).
3. Yedek al: `$COMPOSE run --rm backup && $COMPOSE run --rm offsite`.
4. `release.env` içinde `BACKEND_IMAGE`, `FRONTEND_IMAGE`, `APP_RELEASE` değerlerini yeni digest'lerle güncelle; `$COMPOSE pull`.
5. Kısa bakım: `$COMPOSE stop proxy` (yazmalar ve dış trafik durur; zamanlanmış yayınlar kaybolmaz, sonraki taramada işlenir).
6. `$COMPOSE run --rm migrate` — hata verirse **dur**; Flyway geçmişini elle düzeltme, `flyway_schema_history` tablosunu düzenleme. Uygulanmış bir migration dosyası asla değiştirilmez; düzeltme yeni migration ile gelir.
7. `$COMPOSE up -d backend frontend` → `$COMPOSE ps` ile healthy bekle → `$COMPOSE start proxy`.
8. Smoke test: ana sayfa, bir yazı, olmayan yazı 404, giriş/çıkış, Studio açılışı, gizli yazı 404, `/api/v1/articles/<id>/stats`.

Migration'lar geriye uyumlu (expand-contract) yazılır: önce ekle/nullable/backfill, kaldırma ayrı ve sonraki bir sürümde. Bir sürümün eski uygulamayla uyumsuz şema değişikliği yapıp yapmadığı release manifestinde belirtilir.

## Geri alma

- **Uygulama hatası, şema geriye uyumlu:** `release.env.<tarih>` dosyasını geri koy, `$COMPOSE up -d backend frontend`, readiness kontrolü. Otomatik "down migration" yoktur.
- **Şema eski sürümle uyumsuz:** bakım modunda ya ileri düzeltme sürümü çıkar ya da [backup-restore.md](backup-restore.md) ile son yedeğe dön. Restore, yedekten sonraki verileri kaybettirir; bu kapsamı bilerek uygula. Dışarı gönderilmiş e-postalar geri alınamaz.

## Sır değiştirme (rotation)

- `rate_limit_key`: değiştirmek oturum yönetim tanıtıcılarını, e-posta değişikliği bağlantılarını ve hız sınırı kovalarını geçersiz kılar (kullanıcılar oturum listesinde yeniden giriş yapar). Dosyayı yeni değerle değiştir, `$COMPOSE up -d --force-recreate backend`.
- `db_app_password` / `db_migration_password` / `db_backup_password`: önce PostgreSQL'de parolayı değiştir (`$COMPOSE exec postgres psql -U postgres -d satir`, ardından `\password satir_app`), sonra secret dosyasını güncelle ve ilgili servisi yeniden oluştur. `init-roles.sh` yalnız boş veri dizininde çalışır; mevcut kurulumda parolaları değiştirmez.
- `mail_password`, `google_client_secret`, `pexels_api_key`: sağlayıcıda yenisini üret, dosyayı güncelle, `backend`'i yeniden oluştur, eskisini sağlayıcıda iptal et.
- `restic_password`: `$COMPOSE run --rm offsite key add` ile yeni anahtar ekle, test et, sonra `key remove` ile eskisini kaldır.

## Sahip parolası

Sahip parolasını unuttuysa `/sifremi-unuttum` akışı (mail yapılandırılmışsa) kullanılır. `bootstrap-owner` mevcut sahibin üzerine yazmaz; ayrı bir operatör sıfırlama komutu henüz yok (açık iş, backend README).
