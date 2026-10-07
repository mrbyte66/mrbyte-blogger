# Yedekleme ve geri yükleme

Hedef (tatbikatla doğrulanana kadar garanti değil): RPO ≤ 24 saat, RTO ≤ 4 saat. Kaynak: [VPS planı §7](../../docs/deployment-vps.md).

## Yedek seti

`$COMPOSE run --rm backup` (`deploy/backup/backup-db.sh`) `backups` volume'unda `/backups/current` dizinini üretir:

| Dosya | İçerik |
| --- | --- |
| `satir.dump` | `pg_dump -Fc` tutarlı veritabanı anlık görüntüsü (sahiplik/yetki olmadan; roller `init-roles.sh` ile yeniden kurulur) |
| `media.sha256` | özel medya volume'undaki her dosyanın SHA-256 listesi |
| `manifest.txt` | zaman, `APP_RELEASE`, PostgreSQL sürümü, son Flyway sürümü, dump özeti |

`$COMPOSE run --rm offsite` bu dizini ve medya volume'unu restic ile **şifreli** olarak offsite depoya kopyalar. Sunucuyla aynı diskteki yedek felaket yedeği sayılmaz. Sırlar (secret dosyaları, restic parolası) uygulama yedeğine konmaz; ayrı ve güvenli bir yerde saklanır.

Bilinen sınır: DB dump ve medya kopyası aynı anda alınmaz. Gece düşük trafikte alınır; yedek sırasında yüklenen yeni bir görsel bir sonraki sete kalabilir (READY dosyalar değişmez, yalnız eklenir).

## Geri yükleme tatbikatı (ayda bir ve her büyük DB değişikliğinde)

İzole bir ortamda (ayrı VPS veya yerel makine) yapılır; üretim veritabanına kör üzerine yazma yapılmaz.

1. Aynı `release.env` (aynı imaj digest'leri) ve **yeni** secret dosyalarıyla boş bir kurulum hazırla. `INDEXING_ENABLED=false`; mail, Google ve kapak sırlarını boş bırak (dışarıya e-posta çıkmasın).
2. `$COMPOSE up -d postgres` (roller oluşur).
3. Offsite yedeği `restore` volume'una geri al: `$COMPOSE run --rm offsite restore latest --target /restore`.
4. `$COMPOSE run --rm restore` — `deploy/backup/restore-db.sh` dump özetini doğrular, dump'ı `satir_migrator` ile **boş** veritabanına yükler, medyayı **boş** volume'a kopyalar ve SHA-256 listesini kontrol eder. Uygulama şeması zaten varsa veya medya volume'u doluysa hiçbir şey yapmadan çıkar.
5. `$COMPOSE run --rm migrate` (gerekirse ileri migration).
6. Uygulamayı açmadan önce güvenlik: yedekteki oturumları ve tek kullanımlık bağlantıları geçersiz kıl (herkes yeniden giriş yapar):

   ```sh
   $COMPOSE exec postgres psql -U postgres -d satir -c "TRUNCATE spring_session CASCADE; DELETE FROM action_token;"
   ```

   Yedekten sonra silinen hesapların silinmesini yeniden uygula (eski üretim veritabanı erişilebiliyorsa `audit_event` içindeki `ACCOUNT_DELETE` kayıtlarından; ayrı offsite silme günlüğü henüz yok — açık iş). Bekleyen yayın e-postalarını (`outbox_job`, durum `PENDING`/`RUNNING`) gözden geçir; artık yayında olmayan yazıların işleri worker zaten atlar.
7. `$COMPOSE up -d backend frontend proxy`.
8. Kontroller: sahip girişi; okur kitaplığı/notlar/geçmiş yalnız sahibine görünür; özel/taslak yazılar ve medyaları 404; tema uygulanmış görünür; sayaçlar tutarlı. Ölçülen toplam süreyi kaydet (RTO kanıtı).

## Hesap silme ve yedekler

Silinen bir hesabın verisi en fazla yedek saklama süresi boyunca (öneri: 7 günlük + 4 haftalık + 3 aylık) şifreli yedeklerde kalır. Bu süre gizlilik metninde açıklanmalıdır; restore yapılırsa silmeler yukarıdaki 6. adımda yeniden uygulanır.
