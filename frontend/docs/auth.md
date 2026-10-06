# Frontend membership and Studio access

Owning product scope: `../../docs/features/membership.md`.

- `lib/auth/model.ts`: avatar keys and form helpers only. Identity, role and sessions come from the server (`GET /api/v1/auth/session`); nothing about the account is kept in browser storage.
- `components/auth/AuthProvider.tsx`: reads the Spring session, re-reads it on focus/visibility/expiry and when another tab posts "changed" on a BroadcastChannel (no identity is broadcast); login/register/Google start/profile/logout through the API; handles `?google=`/`?google_error=` redirect results.
- `AuthCard`, `AuthDialog`, `AuthPage`: shared login/register/recovery/verification UI. Native modal provides focus confinement and returns focus to its trigger. Login/register use a short stationary transition and keyboard-operable tabs.
- `AccountMenu`: guest actions or initials avatar; only the server-established Studio visitor sees the Studio link. Members use `/hesap` and `/kaydedilenler`.
- `AccountPage`: profile/security/connections/sessions, with separated sections and a confirmed destructive action at the bottom. Browser-wide sessions are not represented as fictitious devices.
- `SavedProvider`: the verified member's server library (`/me/collections`, `/me/bookmarks`); nothing is kept in browser storage and the state is cleared when the account changes. Guest bookmark control requests login, unverified accounts are asked to verify, Studio previews remain read-only.
- `AccountHistory` (Hesap → Okuma Geçmişi): own visit history from `/me/history` with a clear action; visits mean "opened", never "finished".
- `ReadingTools`: member-specific scoped remount and storage keys, distinct guest notes; account changes clear prior visible marks and unsaved selection. No automatic guest import.
- `app/studio/page.tsx` / `app/preview/page.tsx`: server-side gate. The request cookie is forwarded only to the fixed internal backend; Studio renders only for the OWNER role, and every Studio API call is authorized again by Spring. The former Next cookie gate (`STUDIO_*` variables) is removed.
- `AccountPage`: profile/avatar, publication-mail preference, password and e-mail change, Google link/unlink, session list/revoke and deletion. Sensitive actions open a re-authentication dialog when the API answers `REAUTH_REQUIRED`. Unverified accounts only see verification and sign-out.
- E-mail links (`/eposta-dogrula`, `/sifre-sifirla`) never consume a token on page load; the user confirms with a button (POST).

Auth surfaces use applied `themeAppearance`, existing DM Sans typography, border/radius tokens and only a primary accent button. Custom theme colors use the same contrast calculation as other pages. Native dialogs are responsive, touch controls are at least 44px, and reduced motion disables short entrance/spinner effects.

Server cookie and browser identity are separate concerns: the former protects Studio delivery; the latter previews member UI. Google buttons never call Google in this slice. Informational member benefits may now describe the account library, notes and visit history as real; badges and advanced statistics remain planned.

`SitePageHeader` hesap, kitaplık, giriş, Studio girişi ve kalıcı yazı/seri sayfalarında ortak üst çubuktur: aynı içerik sınırı, logo, geri dönüş ve tema kontrolü. `AccountMenu` misafire tek giriş kontrolü sunar; giriş modalı eşit genişlikli sekmeler ve sabit pencere boyutu kullanır. Üyelik/sıfırlamada şifre tekrarı eşleşmeden işlem ilerlemez. `ProfileAvatar` 60 yerel SVG/baş harf seçeneği sunar; opsiyonel `avatar` alanı eski demo profilleriyle uyumludur. Profil fotoğrafı yükleme V2 kapsamındadır.

Account → Bildirimler contains one account-wide publication-email switch. Optional validated `DemoProfile.publicationEmail` defaults to true for legacy profiles. `updateProfile` persists it with the profile/session and the existing cross-tab session synchronization; it is never an article setting. This prototype sends no email. Future server preferences and publication jobs are described in `../../docs/features/publication-scheduling.md`.

Studio owner publication preference is also stored under `mrbyte:studio-preferences:v1`, separately from authentication, so it survives logout and a fresh server-authorized login. This key grants no access. Failed session persistence restores the previous preference.

Shared page-header navigation rules target the direct toolbar (`.site-page-header>nav`), never nested account dropdown navigation. Thus account/library menus retain the same 220px desktop width, 4px gaps and stretched rows as Studio.
