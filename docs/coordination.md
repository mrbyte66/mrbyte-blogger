# Project coordination

## Work ownership

- The project orchestrator owns product scope, design direction, API contracts, and integration.
- Frontend work reads `frontend/AGENTS.md` and the relevant files in `frontend/docs/`.
- Backend work reads `backend/AGENTS.md` and the relevant files in `backend/docs/`.
- Keep frontend and backend independently buildable. Put cross-project decisions here.

## Current stage

The manual visual theme builder has its first local frontend slice. `/studio` edits a separate draft, `/preview` shows that draft, and `/` renders the applied snapshot. Scene, feed and magazine starters use the same articles, with stable `/yazilar/[slug]` routes. Review the editor before specifying backend contracts and persistence. Do not invent APIs or a database around fixture content.

Blog series now have a separate local content workspace, a shared Studio page navigator, an optional page block and stable `/seriler/[slug]` routes. Explicit series saves are separate from applying a theme; publication here affects this browser only. Chapter order stays independent of article URLs. Manual completion and guest progress have been removed; account-specific automatic visit history is deferred to real authentication/backend. `docs/features/blog-series.md` owns the accepted scope and deferred extensions.

Two future features are recorded without simulating unavailable account or 3D behavior: a public membership introduction page and a genuinely multi-view, pointer-controlled character with return-to-rest and a dizzy-eye finish. The current single-image character stays unchanged until its asset can support the motion.

## Current decisions

- The character-centered, single-scene experience is the first theme. The user explicitly wants to be able to switch to substantially different layouts, including a scrolling feed.
- Preserve the original curly-haired CRT character and glasses. Eye gaze and blinking are active; head warping and the later portrait-based hair experiment are not part of the accepted direction.
- Theme creation means manually selecting, arranging, and configuring blocks. AI theme generation is not requested for the initial version.
- Content and public URLs must survive theme changes; theme support covers structure and interactions as well as colors.
- `docs/site-builder.md` owns the shared theme/builder requirements.
- Backend implementation follows `backend-architecture.md` slices; status lives in `backend/README.md`.

## Verification — 2026-10-02

- 92 unit/component tests pass across eight files. Coverage includes draft isolation, block roles, old-record migration, custom colors, two-way canvas selection, local text annotations, storage failures and delete/undo. After the final loading-state adjustment, all nine reading-tool tests were rerun successfully.
- TypeScript and the final production build pass. Studio, preview and four permanent article routes build successfully.
- Desktop Studio retains simultaneous structure/canvas/properties panels with readable controls and an unscaled responsive canvas. List and canvas selection synchronize; non-selected blocks dim, and intro composition switches immediately. Starter selections now immediately reload the requested draft structure without notices or confirmation, including reselecting the current starter; site name/accent are retained.
- Custom color, editorial typography and dark surface were checked in the real iframe; original appearance values were restored after checks. The curated scene halo is no longer controlled by accent color.
- At a loaded 390px viewport, Studio and article pages have no horizontal overflow. Reading toolbar buttons use 15px labels and 63px mobile targets in the checked viewport. Inspector fields use 16px text.
- Browser checks verify selecting a passage, visible highlighting, adding a note, restoring both after reload, and removing the test records. Desktop open-note space keeps text outside the panel. Escape and mobile jump behavior are covered by component tests.
- No new theme was applied during this review. Homepage snapshot remains separate from the draft. All theme state and visitor notes remain browser-local; authenticated admin, public owner notes, accounts/sync, SEO publication and backend/database remain future work.

## Reader motion and series verification — 2026-10-02

- 110 unit/component tests pass across 13 files. Added coverage for series validation, local synchronization/storage errors, explicit completion, Studio chapter editing/order, scene return context, series block links, inert cover snapshots and native/fallback permalink transitions.
- Final TypeScript check and production build pass, including the dynamic series route and existing four article permalinks.
- Browser checks cover series catalog → ordered chapters → first/next chapter and both article/series permalinks. The closing panel retains opacity 1 and transitions transform/display/overlay in 240ms; internal cover entry uses 420ms. Native selection keeps transparent backgrounds; saved marker highlights retain their own fills.
- Series permalink and Studio fit a loaded 390px viewport without horizontal overflow. Light/dark series surfaces were inspected; primary link contrast was corrected and verified as dark text on mint. Original light preference was restored. No theme draft was reset or applied during verification.
- Series content/progress remain browser-local. Only sample articles are selectable. Owner authentication, backend persistence, server metadata for custom series and article publication filtering are deferred.

## Catalog refinement verification — 2026-10-02

- 116 tests pass across 14 files; TypeScript and the final production build pass with 12 article permalinks. Coverage includes five-item sentinel/manual loading, keyboard tabs, selective cover motion, three-series fixtures and safe migration that preserves author edits.
- Yazılar/Seriler are explicit fixed-header tabs with arrow/Home/End navigation and short local ripple feedback. Tab changes and catalog-to-series detail changes show no cover animation. Browser computed styles confirmed no animation or old layer for these actions. Article open/back and panel entry/exit retain their spatial movement.
- Three restrained series cards, compact headings and border/surface hover feedback were checked at desktop and 390px mobile widths. Hover underlines are removed; prose-link semantics and saved underline annotations remain intact.
- Browser scrolling appended chapters 6–10 after the first five. Opening chapter 6 and returning retained all ten loaded cards, its keyboard focus and the list's scroll position. Manual chapter completion and anonymous progress tracking are absent.
- Member-only automatic visit history is documented for the future authenticated backend; no account functionality is simulated. Theme drafts were not reset or applied during review.

## Reader selection cleanup and future feature notes — 2026-10-02

- A collapsed/released text selection clears the reading toolbar's stale quote and disables annotation actions. A selection remains available while the reader activates a toolbar or note-panel control; saved highlights remain until explicitly removed.
- The focused reading-tools suite passes (10 tests), TypeScript passes, and the article page was checked in-browser: annotation controls enable for selected text and disable after the selection is released.
- Public membership/site introduction requirements are recorded in `docs/features/site-introduction.md`. Pointer-driven 360° character interaction, return-to-rest, and a playful dizzy-eye finish are recorded in `docs/features/character-interaction.md`; the current single-image character remains unchanged until suitable multi-view or 3D artwork exists.

## Unified Studio page editing verification — 2026-10-02

- Studio now opens home, existing article and series pages in a shared canvas workflow. Removed the old disconnected series form; article and series inspectors use visitor renderers and support two-way field selection, content changes and bounded page presentation.
- Article drafts are isolated until explicit local Save; catalogs, series chapters, scene featured title and article permalinks then consume the shared saved article collection. Series creation, automatic Turkish slugs, chapter membership/order, cover and publication validation remain available beside the canvas. Internal document links keep navigation within Studio; dirty documents require Save/Revert.
- 125 tests pass across 15 files. The final production build (including TypeScript) passes. Added coverage for live draft messages, trusted selection/navigation, save isolation, storage failure/revert, new-series discard, series authoring through the unified editor, invalid records and reading-mark re-resolution after content edits.
- Browser checks verified article title live preview, paragraph click opening its inspector, revert, article-to-series navigation, series selection and a 390px Studio with no horizontal overflow. Mobile canvas selection scrolls to the matching inspector. Browser verification edits were reverted without saving; no theme was applied.
- This remains a local prototype: only existing article routes are editable. New arbitrary article/custom-page creation, server publication/authentication, real media uploads and dynamic server metadata remain deferred. Article text revisions preserve saved reading quotes, marking unresolved anchors instead of painting unrelated text.

## Change protocol

Record decisions that affect both projects here. Keep visual details in `frontend/docs/design.md`, frontend implementation guidance in `frontend/docs/frontend.md`, and backend decisions in `backend/docs/`. Give parallel contributors non-overlapping file ownership and ask them to update the appropriate guide when a decision changes.

## Shared chapter cards and reader reactions — 2026-10-03

Series chapters now use the same cover cards as the writing catalog, preserving chapter ordering, complete-sentence body previews and five-item loading. Full article permalinks provide a reversible anonymous local clap and share controls (copy, platform links, native share when available). Read-only card totals synchronize through an independent validated local record; series totals aggregate their published articles. Studio preview actions are disabled. Global visitor counts require the future Spring Boot service; the UI labels the current browser-only scope.

Verification: 142 tests across 18 files, TypeScript and production build passed. Browser checks verified desktop two-column chapter cards, 390px single-column/no overflow, full-article clap reflected in article and series totals, and the share menu. No social posts were submitted. Local test vote is reverted after verification. Final CSS refinement preserves full chapter previews without ellipsis.

## Article views — 2026-10-03

Visible article summaries now add a view when their card enters the viewport; infinite-list cards below the fold are not counted. Only permalink reader views count on entry; opening an article in the side panel does not add another view. Article, series chapter, theme-feed and published series cards show read-only counts; a series number sums its published chapter views. Draft Studio previews are excluded. In this frontend prototype, data is validated and stored per browser, synchronized within the browser and explicitly labeled as local. Shared visitor totals and server analytics remain a Spring Boot task.

## Visual writing and series cards — 2026-10-03

Replaced the scene panel's small writing rows with two-column medium cover cards, stacking at 540px available container width. Series retain large full-width cards. Four original local SVG artworks provide prototype covers without network calls; custom series images take priority, and load failures fall back safely. Shared series covers also appear in the visitor detail and Studio preview. Existing theme feed layouts and five-item loading behavior remain unchanged. Online cover selection is still planned for Spring Boot.

Verification: 137 tests across 17 files, standalone TypeScript check and production build passed. Browser inspection verified desktop two-column writing cards, full-width series, loaded artwork, article open/back focus, and 390px single-column layout without horizontal overflow in light/dark palettes.

## Automatic covers requirement — 2026-10-03

Recorded content-matched online article/series covers and larger visual article cards in `docs/features/automatic-covers.md`. Pexels is a researched provider candidate, requiring a backend API key and provider/license attribution handling. Manual overrides, stable saved selection and graceful search failure are required. This is a documented feature plan; no online integration or card implementation was added in this step.

## 2026-10-03 — Unified page navigation and independent articles

Replaced separate home/article/series selectors with one searchable PageNavigator including New article/New series. New independent articles receive title-derived editable ASCII permalinks, collision protection and explicit local save. Saved articles appear first in shared visitor feeds and resolve through dynamic article routes; series membership is optional and supports these records later. Existing fixture collections remain compatible. Shared Studio header/canvas chrome remains consistent. Backend publication/authentication and server SEO for browser-local articles remain future work.

Verification: 129 tests passed, production build including TypeScript passed. Browser inspection verified the single page menu on desktop and 390px mobile (no horizontal overflow), new article creation and title-derived permalink. The temporary browser draft was discarded without changing visitor content.

## 2026-10-03 — Article-first series authoring and content lifecycle

Studio now uses one desktop command row. PageNavigator lists series before writing, uses readable group typography and exposes active/archive/trash filters. New writing chooses independent, existing series or inline new-series creation beside the canvas. Inline series parameters include title, ASCII slug, summary, cover, level and ongoing state; save selects the series, closes the form and returns to writing. Writing and membership commit together through the validated version-2 content record; legacy keys remain readable and non-authoritative compatibility snapshots after migration. Articles and series support draft/publication/archive/reversible trash, with restore as draft. Visitor lists, article permalinks and series chapter navigation exclude hidden content. Archiving/deleting a series retains its writing.

Verification: 135 tests across 16 files passed; production build and TypeScript passed. New tests cover empty drafts, existing/new series membership, inline cover save, atomic write failure, visitor visibility, archive/trash recovery and preserved series members. Browser QA verified the single desktop command row, readable series-first menu, contextual inline form and 390px layout without horizontal overflow. Temporary browser drafts were cancelled/discarded. Content remains browser-local; server publication and authenticated administration remain future work.

## Unified reader engagement — 2026-10-03

Modal and permalink readers now use the same compact translucent engagement bar for view counts, clap toggle and sharing. Opening an article in the side panel does not increment views; visible card impressions and permalink visits do. Removed the standalone view paragraph and replaced colored emoji/circle counters with shared monochrome line icons across reader and catalog cards. Studio actions remain disabled; counting remains browser-local.

Verification: 142 tests passed, TypeScript and production build passed. Desktop and 390px mobile inspection verified the shared toolbar, clap/undo and share menu with no horizontal page overflow. The progressive-list observer test now distinguishes sentinel observation from independent card-impression observers.

## Private member library preview — 2026-10-03

Added independent bookmark controls to article/chapter cards, theme feeds and the shared reader bar. Initial save targets Kaydedilenler; a compact picker supports existing/new categories and removal. `/kaydedilenler` centralizes filtering, moving/removing articles, category naming/deletion and unavailable records. Category deletion retains articles under the default. A root context owns validated browser-local storage, cross-tab synchronization and explicit mock membership; guest preview hides personal records. Public save metrics currently reflect only the local demo member (0/1), with no fabricated site-wide totals. Studio counts remain read-only. Saved collections are now included in the membership introduction plan, with backend ownership/idempotency requirements in `features/saved-articles.md`.

Verification: 149 tests across 19 files, TypeScript and production build passed. Tests cover default save, unique records, category movement/deletion, corruption/write failures, remount persistence, guest hiding and Studio restrictions. Desktop and 390px mobile browser checks verified independent save/open actions, category creation/rename, filtering, light/dark contrast, category deletion retaining the record and record removal. Fixed a clipped first-card popup; mobile had no page overflow. Temporary browser records/categories were removed after verification. Real authentication, user isolation and aggregate member totals remain backend work.

## Library refinement and optional Mozart listening — 2026-10-03

Removed detached per-card category/removal rows; bookmark menus now own those actions. Category selection stays a draft until “Taşı”, and moving a saved record preserves its insertion position. Library-return links use an explicit reverse cover direction in native/fallback navigation. Added one persistent opt-in Mozart audio element with lower-right controls, including a shared control inside the native reading dialog. Streams are Musopen Symphony public-domain recordings via Commons; movements repeat in order up to forty minutes of played media time. Pause/resume retains position; Studio pauses audio.

Verification: 155 tests across 20 files, TypeScript and production build passed. Added coverage for stable order, deferred category changes, reverse fallback movement, opt-in start/pause/resume, route continuity, playlist advancement, the forty-minute stop/restart and failure/retry. Browser playback reported readyState 4, paused=false and advancing currentTime; the first MP3 responded 206 with audio/mpeg. Playback persisted on the home route and could be paused from inside the native dialog. Desktop and 390px library inspection verified integrated controls and no page overflow; preview category choices were cancelled without changing member records.

## Ambient listening refinement — 2026-10-03

44px translucent monochrome control, decorative playback-only bars with reduced-motion support, consistent desktop reading inset and mobile notes clearance. Studio retains the pause control and playback; embedded preview hides its duplicate control. Future instrumental/nature categories, opt-in weather/season suggestions and advanced floating interaction are recorded in `features/ambient-audio.md`. Verification: 155 tests, typecheck and production build passed; browser confirmed four bars during actual playback and Studio control visibility.

## Shared audio session and scene alignment — 2026-10-03

Music now shares the scene footer controls and palette, with a short Mozart biography in the caption. BroadcastChannel mirrors playback state; a Web Lock enforces one audio owner per origin. New tabs remotely pause/resume the owner; normal closure releases the lock and shares the position for explicit resume elsewhere. Browser verification: main audio advanced; new Studio tab had no media source while its control showed playing; Studio pause stopped main at 26.12s and resume continued at 26.44s. Unit coverage includes joining, remote controls and owner-close handoff.

## Audio owner-close recovery — 2026-10-03

Active followers now queue on the owner Web Lock, so takeover also works if closing a tab omits pagehide/broadcast. Pausing cancels queued takeovers. Playback position and elapsed listening time are preserved; a NotAllowedError exposes an explicit continuation state without restarting. Browser test: closing the owner at 17.59s transferred 17.43s to the remaining tab; that browser blocked automatic audio and correctly presented the continuation control. 157 tests, TypeScript and production build passed.

## Background audio recovery — 2026-10-03

Fixed denied/error owners retaining the Web Lock and forwarding continuation clicks to the wrong document. Blocked/error owners release ownership; explicit recovery runs in the clicked tab. Fixed stale local media position/track on reacquisition and pending takeover cleanup. Five-tab regression plus stale-media test added. Browser: owner closed at 13.4s, unrelated site visited, Studio resume played at 13.77s with other audio paused; Studio then closed at 31.84s, original tab recovered at 32.09s. Browser required a gesture on both transfers; this is recovery, not a promise of uninterrupted background playback. 159 tests, TypeScript and production build passed.

## 4 October 2026 — Editorial metadata and curated scene cards
- Removed series difficulty labels and legacy field from normalized records. Added multiple article categories, editable calendar dates, descending public writing order and immutable creation timestamps. Series keep Studio chapter order, with creation-order insertion for new membership.
- Refined bookmark controls with the default `Genel` collection, `Kitaplığım` naming and an optional new-collection form; existing records/order migrate safely.
- Preserved glass scene cards, removed bracket ornament, added optional selected series card and independent Studio visibility/content choices. Future member recommendations are defined in `features/personalized-recommendations.md`.
- Verified 170 unit/interaction tests, TypeScript and production build. Browser verified dated writing/chapter cards, reduced bookmark popover, Studio metadata controls and desktop/390px scene layout. Mobile navigation labels now fit on one line. Data remains browser-local prototype content; member personalization is planned.

## 4 October 2026 — Scene editor interaction fixes
- Embedded live drafts now render directly from validated parent messages; article/series visibility changes appear immediately. Edit-mode capture selects the related card settings instead of navigating; parent navigation is guarded by browse mode. Non-editable scene controls stay passive.
- Article and series settings use separate highlighted groups. Featured cards float subtly when motion is enabled, pausing for editing, hover/focus and reduced-motion preferences.
- Verified live show/hide and card selection in the browser, plus 173 tests, TypeScript and production build. Previous requested changes remain uncommitted alongside these fixes.

### Featured-card motion refinement
The original 3px/0.2° animation was running in the browser but visually too faint. Replaced it with independent, slow perspective pitch/yaw/roll on the two glass cards. Hover no longer pauses their drift. Character breathing remains unchanged; editing/focus and reduced-motion behavior remain protected.

Verified two changing `matrix3d` transforms in the public homepage and confirmed both become `none` when motion is disabled, then restored motion. All 173 tests, TypeScript and production build passed.

## 2026-10-04 — Membership UI and protected Studio entry

Integrated theme-aligned login/register/Google demo, recovery/reset/verification views, native login modal, avatar navigation and `/hesap` profile/security/connections/session/deletion sections. Root demo identity synchronizes across tabs and expires; passwords are never stored. Bookmarks and annotations are scoped to the demo member, guest notes remain separate, and old bookmark import requires explicit choice. Member navigation exposes no Studio or writing tools.

User requested a real username/password gate while preserving `/studio`. Added narrowly scoped server-side credential verification, salted scrypt environment hash, signed eight-hour HttpOnly cookie, login throttling and server checks on both Studio and preview. Actual local credentials are in ignored `.env.local`, not source/docs. Spring Boot membership/business backend remains unimplemented. V2 multi-author portal, follows and possible comments are documented in `docs/features/membership.md`.

Verification: 28 test files / 187 tests passed; TypeScript check and production build passed. Final targeted auth, account-scoped reading and Studio crypto suite: 14 tests passed. Client bundle inspection found no server password hash/signing secret; Git ignores `.env.local`. Browser checks covered Studio login with the configured credentials, logout returning to the gate, shared member session/logout across two tabs, member menu without Studio, modal registration and responsive account/login surfaces at 390×844 and desktop in light/dark themes. Real member auth/OAuth/email and cross-device data remain explicitly marked as pending. Studio throttling is single-process and will need replacement in the future backend.

### 2026-10-04 — Üyelik ve kitaplık arayüzü tutarlılığı

Tek misafir giriş kontrolü, ortak hesap/kitaplık/kalıcı okuma üst çubuğu, sabit boyutlu giriş-üyelik modalı ve eşleşme doğrulamalı şifre tekrarı eklendi. Hazır profil avatarı hesap menüsünde kullanılır ve demo oturumla sekmelere eşitlenir. Kitaplıkta arama, açık tercihli sıralama, sonuç sayısı ve ilk kayıt rehberi bulunur; saklanan kayıt sırası korunur. Kendi fotoğrafını yükleme V2 notlarına eklendi. Doğrulama: 28 test dosyasında 189 test, TypeScript ve production build başarılı; masaüstü açık/koyu tema ve 390px mobil yerleşim/modal kaydırma tarayıcıda incelendi.

## 2026-10-05 — Yayın planı ve genel e-posta tercihi

Studio yazı işlemlerine “Yayını planla” ve tarih/saat içeren Yayın planı alanı eklendi. UTC zaman doğrulanır; eksik içerik/geçmiş zaman reddedilir. Planlanan yazı kamu listelerinden ve seri bölümlerinden gizlenir; yeniden planlama, iptal ve anında yayınlama akışları aynı kaydetme yolunu kullanır. Hesap → Bildirimler anahtarı yazarın bütün yazıları için ortak `publicationEmail` tercihidir. Demo profilleri/oturumları sekmeler arasında mevcut altyapıyla eşitlenir; Studio sahibinin tercihi çıkış sonrasında da ayrı, yetki vermeyen bir tercihle korunur.

Prototip gerçek zamanlı yayın veya e-posta göndermez; bu sınır UI ve `docs/features/publication-scheduling.md` içinde belirtilmiştir. Spring Boot kalıcı zamanlama, yayın sonrası idempotent mail işi ve V2 yazar yetkisi gereksinimleri kaydedildi.

Doğrulama: 30 dosyada 194 test, TypeScript ve production build başarılı. Yeni testler zaman doğrulaması, görünürlük/seri filtrelemesi, zaman temizleme, genel tercih uyumluluğu ve tarih seçme/iptal etkileşimini kapsar. Bildirim anahtarı masaüstü ve 390px mobil tarayıcıda incelendi; kapat/aç geri bildirimi doğrulandı ve açık tercih geri yüklendi. Studio editörü sunucu giriş kapısı nedeniyle bu oturumda tarayıcıdan açılmadı; tarih alanı bileşen etkileşim testiyle doğrulandı.

### Yayın planlarını topluca görme ve hesap menüsü tutarlılığı

Studio sayfa seçicisine Planlanan yazılar filtresi, en yakın/en uzak yayın tarihi ve Türkçe başlık sıralaması eklendi. Satırlar yerel yayın tarih/saatini gösterir; seri kayıtları bu filtrede görünmez. Arama, boş durum ve ilgili yazı düzenleyicisine geçiş korunur. Header'ın bütün alt `nav` öğelerini etkileyen CSS kuralı doğrudan araç çubuğuyla sınırlandı; hesap/kitaplık dropdown artık Studio ile aynı 4px aralık ve satır hizasını kullanır.

Doğrulama: 31 dosyada 196 test, TypeScript ve production build başarılı. Yeni bileşen testleri filtre, sıralama, boş durum ve düzenleyiciye yönlendirmeyi kapsar. Hesap ve kitaplık menüleri masaüstünde ölçüldü (220px, 4px aralık) ve 390px mobil kitaplık görünümü incelendi; viewport geri yüklendi.

### Açık tercihli yayın planı demosu

Planlanan yazılar görünümüne “Demo planlar oluştur” eklendi. Tek işlemle 1/3/7 gün sonrasına üç bağımsız örnek yazı mevcut kaydetme/doğrulama yolundan eklenir; liste açık kalır. Sabit örnek bağlantıları tekrar üretimi ve düzenlenmiş örnekleri ezmeyi önler. Kaydedilmemiş yazı/draft varken ekleme engellenir. Örnekler normal yazılar gibi düzenlenebilir, plan iptal edilebilir veya kaldırılabilir. Gerçek zamanlı yayın ve mail hâlâ backend kapsamıdır.

Doğrulama: 32 dosyada 198 test, TypeScript ve production build başarılı. Yeni testler üç tarih, geçerli kayıt, yayın listesinin değişmemesi, tekrar/ezme koruması ve demo oluştururken plan listesinin açık kalmasını kapsar. Bu değişiklikte Studio tarayıcı akışı çalıştırılmadı; bileşen/store testleri kullanıldı.

## 2026-10-05 — Üye okuma rozetleri, istatistikler ve kilitli yazılar (ürün notu)

Üyelerin kendi profilinde okuyucu seviyesine göre rozet/ilerleme görebilmesi ve sahibin üyeler/yazılar için metrik, tarih aralığı ve kırılım seçerek karşılaştırmalı tablo hazırlayabilmesi yapılacaklara eklendi. Yazı görüntülenme, alkış, kaydetme, cihaz türü ve ölçüm kuralları tanımlanacak okuma süresi olası metriklerdir. Kişisel okuma verisinin sınırsız biçimde yöneticiye açılması varsayılmadı; toplu rapor, veri minimizasyonu ve mahremiyet kararları önkoşuldur. Ayrıca önce yalnızca sahibin erişeceği kilitli yazılar ve bu içeriğin sunucu/API/arama/medya/önizleme/cache katmanlarında korunması not edildi. Üye özel yazıları V2 için ayrı karardır. Özellikler henüz uygulanmadı; ayrıntılar `docs/features/reader-progress-and-analytics.md` ve `docs/features/private-articles.md` içinde.

## 2026-10-05 — VPS backend mimarisi ve önerilen API sözleşmesi

Kullanıcı yönü kesinleştirdi: ayrı Next.js/React/TypeScript frontend, Java 25 LTS + Spring Boot modüler monolit, PostgreSQL ve VPS; SEO/indeksleme üretim kapsamıdır. Uygulama kodu/migration oluşturulmadı. Teknik öneriler ve veri sözlüğü [backend-architecture.md](backend-architecture.md), endpoint/DTO sözleşmesi [api-contract.md](api-contract.md), işletim/yayın/restore planı [deployment-vps.md](deployment-vps.md) içinde. Bunlar fixture'lardan türetilmiş mevcut sunucu davranışı değil, sonraki uygulama için tasarımdır.

Önerilen temel: aynı origin reverse proxy, Spring Session JDBC, revision'lı içerik ve ayrı kart tarihi/gerçek yayın anı, transaction içinde planlı yayın+outbox, owner-only özel erişim, V1'de no-store içerik/medya ve server-rendered SEO. Üyelik Studio/yazarlık yetkisi vermez. Slug kimlik yerine geçmez; kişisel veriler oturum sahibine sınırlandırılır.

Açık kararlar: roadmap/özellik belgeleri arasında rozet ve ileri raporların V1/V2 konumu; yayındaki Save ve seri explicit activation ayrıntıları; yeniden yayın maili; anonim clap kimlik süresi/birleştirme; veri saklama süreleri; domain/mail/Google/kapak/backup sağlayıcı ayarları. Mimari belgesindeki Ü1–Ü11 varsayımları uygulanmadan önce görünür biçimde değerlendirilmelidir. Eski series/builder belgelerindeki difficulty ve yalnız fixture içerik ifadeleri güncel kodla uyuşmuyor; difficulty geri eklenmeyecek. Yeni gerçek backend tamamlanmış olarak işaretlenmedi.

## 2026-10-05 — Backend dilim 1: temel altyapı ve owner oturumu

`backend/` altında Java 25 + Spring Boot 4.1.1 Maven projesi (Maven Wrapper 3.9.16) oluşturuldu. Flyway V1–V3: Spring Session JDBC şeması, `app_user`/`password_credential`/`user_preference` (tek OWNER kısmi unique index, owner doğrulanmış olmalı, username yalnız owner), `auth_rate_bucket`, `audit_event`. Uç noktalar: `GET /api/v1/auth/csrf`, `POST /auth/login`, `GET /auth/session`, `POST /auth/session/renew`, `POST /auth/logout`, `GET /me`; makinece okunur sözleşme `backend/docs/openapi.yaml`. Owner yalnız `bootstrap-owner` operatör komutuyla oluşturulur; parola argüman/env yerine dosya veya stdin'den alınır. `migrate` ayrı komuttur; uygulama başlangıçta yalnız şemayı doğrular.

Güvenlik: Argon2id, opak HttpOnly/SameSite=Lax oturum cookie'si (`__Host-satir-session`, dev'de `satir-session-dev`), login/logout dahil CSRF, girişte session ID ve CSRF rotasyonu, owner 30dk/8sa ve üye 7g/30g süreleri, her istekte hesabın DB'den yeniden okunması, HMAC'lı DB hız sınırı (5/15dk tanımlayıcı, 30/15dk istemci), bilinmeyen JSON alanına 422, allowlist dışı her rota reddedilir, API yanıtları `no-store` + `X-Robots-Tag: noindex`.

Varsayım: mail altyapısı (dilim 4) gelene kadar operatörün bootstrap işlemi owner e-posta doğrulaması sayılır. Docker bu makinede yoktu (WSL2/Hyper-V kapalı); entegrasyon testleri `SATIR_TEST_JDBC_URL` ile yerel taşınabilir PostgreSQL 18.4 üzerinde koşturuldu, Testcontainers yolu Docker kurulunca otomatik devreye girer.

Doğrulama: 43 test (unit, ArchUnit, PostgreSQL entegrasyon) geçti, atlanan yok. Studio kuralı bilerek gevşetildiğinde iki erişim testi kırıldı (mutasyon kontrolü). Paketlenmiş JAR ile temiz DB'de `migrate`, tekrar `migrate` (no-op), `bootstrap-owner` (başarılı), ikinci owner/eksik argüman (exit 1) ve parolanın loglara yazılmadığı doğrulandı; dev sunucusunda health `UP`, CSRF→owner username girişi→`/auth/session`→`/me` curl ile denendi. Frontend henüz Spring oturumuna bağlanmadı: Studio geçici Next cookie kapısıyla korunmaya devam ediyor; bir sonraki adım bu kapıyı `/api/v1/auth/session` ile değiştirmek ve Next `/api` proxy'sini eklemek.

## 2026-10-06 — Backend dilim 2–5 ve frontend bağlantısı

Backend: editorial (yazı/sürüm/kategori/seri/slug geçmişi, durum makinesi, özel yazı), site/tema (taslak-uygula-geri yükle, UUID referanslar), medya (yeniden kodlanan JPEG/PNG, yalnız kamu içeriğinde sunulan `/media/{id}`, Pexels araması), yayın (15 sn zamanlayıcı, transactional outbox, SMTP, tercih kontrolü) ve üyelik (kayıt/doğrulama/sıfırlama/yeniden doğrulama/profil/e-posta değişikliği/Google/oturumlar/silme) uygulandı. Ayrıntı ve sapmalar `backend/README.md` içinde.

Frontend: `components/data/SiteData.tsx` ziyaretçi için sunucuda çekilen yayınlanmış içeriği, Studio için API işlemlerini sağlar; mevcut hook'lar aynı arayüzü korur. Yazı/seri sayfaları içerik ve metadata'yı sunucuda üretir (canonical, OG, JSON-LD, eski slug 308, gizli içerik 404), `sitemap.xml`/`robots.txt` backend kapısına bağlıdır. Next Studio cookie kapısı ve demo üyelik kaldırıldı; Studio ve hesap ekranları Spring oturumunu kullanır. Kitaplık, notlar, alkış ve görüntülenme hâlâ tarayıcı-yerel (dilim 6–7).

Doğrulama: backend testleri Docker'daki PostgreSQL 18.4 üzerinde; frontend 30 dosyada 190 test, typecheck ve production build. Uçtan uca: Compose (PostgreSQL+Mailpit), temiz DB'ye 9 migration, owner bootstrap, Studio girişi, arayüzden yazı oluşturup yayımlama, JS'siz SSR HTML/metadata kontrolü, yayın mailinin ve kayıt doğrulama postasının Mailpit'e düşmesi, doğrulama bağlantısının açık onayla tüketilmesi, hesap oturum listesi.

## 6 October 2026 — Backend slices 6–8: personal space, reactions, launch files
- Backend: `library` (collections, bookmarks, per-article state), `reading` (annotations anchored to block UUIDs with server-side quote checks, explicit guest-note import, visit/series history) and `engagement` (anonymous/member claps, deduplicated card/permalink views, public totals, owner per-article totals and member list) modules; migrations V10–V11. Account deletion removes library, notes, history and member claps in the same transaction. Implementation decisions are listed in `backend/README.md`; OpenAPI covers slices 1 and 6–7.
- Frontend: library, member notes, claps, views and stats use the API (no browser storage for account data). Permalinks record member visits; series detail links the last opened chapter; account page has visit history; Studio has `/studio/istatistikler`. Reading anchors moved to block UUIDs with a `paragraph-N` legacy alias for older guest notes.
- Deployment: Dockerfiles, `deploy/compose.prod.yml` (least-privilege DB roles, secrets as files, internal networks), Caddyfile, backup (pg_dump + restic) and guarded restore jobs, runbooks under `deploy/runbooks/`.
- Verification: 153 backend tests (unit, ArchUnit, PostgreSQL 18 integration; none skipped), 192 frontend tests, typecheck and production build. Local end-to-end with the dev backend: anonymous clap and permalink view stored, member bookmark/history/series "last opened" and the owner statistics page; Caddyfile validated with Caddy 2.11.7; migrate as `satir_migrator` and run as DML-only `satir_app`; secrets read from configtree files. Docker images were not built (no Docker on the workstation) and no VPS was provisioned.
- Open: Studio export/import, OpenAPI for slices 2–5, CI pipeline, membership benefits page, badges/advanced analytics (product decision), owner password reset command, off-site deletion journal.
- Update (same day, Docker now available via WSL): backend `./mvnw verify` passes with Testcontainers (153 tests, none skipped). Backend/frontend images build; `deploy/compose.local.yml` runs the whole app at http://127.0.0.1:3010 (Mailpit http://127.0.0.1:8025) and passed a smoke test (SSR pages, 404, CSRF via `/api`, owner login, Studio and statistics, logout, mail delivery). `compose.prod.yml` passes `docker compose config`. Port 3010 avoids another local project on 3000/3001/5432/8080.
- Studio fixes (same day): an untouched new article no longer blocks page navigation (it is dropped when leaving); real unsaved edits ask for confirmation instead of silently refusing. "Yayına al" explains why it is disabled (body needs a non-empty paragraph). After Studio saves, `PublicContentRefresh` re-renders the server-loaded public content (this tab and other tabs via BroadcastChannel; visitor tabs also refresh on focus, at most every 15 s), so newly published writing appears without a manual reload.
