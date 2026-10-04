# Frontend membership and Studio access

Owning product scope: `../../docs/features/membership.md`.

- `lib/auth/model.ts`: validated demo profiles/session, expiry, form validation. No password or OAuth tokens in browser storage.
- `components/auth/AuthProvider.tsx`: root session provider, cross-tab storage/focus/expiry synchronization, profile updates, demo deletion, quiet toast and login dialog.
- `AuthCard`, `AuthDialog`, `AuthPage`: shared login/register/recovery/verification UI. Native modal provides focus confinement and returns focus to its trigger. Login/register use a short stationary transition and keyboard-operable tabs.
- `AccountMenu`: guest actions or initials avatar; only the server-established Studio visitor sees the Studio link. Members use `/hesap` and `/kaydedilenler`.
- `AccountPage`: profile/security/connections/sessions, with separated sections and a confirmed destructive action at the bottom. Browser-wide sessions are not represented as fictitious devices.
- `SavedProvider`: per-demo-account library and collections; no default signed-in preview. Guest bookmark control requests login, Studio previews remain read-only. Old preview library import is explicit.
- `ReadingTools`: member-specific scoped remount and storage keys, distinct guest notes; account changes clear prior visible marks and unsaved selection. No automatic guest import.
- `lib/auth/studio-session.ts` / `app/studio/access.ts`: intentionally narrow server-side Studio access gate authorized by the user. Hashed credentials live in ignored `.env.local`; signed eight-hour HttpOnly/SameSite cookie guards Studio and preview. This is an explicit exception to the no-Next-backend guide; business APIs and real membership still belong to Spring Boot.
- `StudioSession`: exposes a matching local owner identity to the UI only after the server has authorized the editor. Client role is not authorization.

Auth surfaces use applied `themeAppearance`, existing DM Sans typography, border/radius tokens and only a primary accent button. Custom theme colors use the same contrast calculation as other pages. Native dialogs are responsive, touch controls are at least 44px, and reduced motion disables short entrance/spinner effects.

Server cookie and browser identity are separate concerns: the former protects Studio delivery; the latter previews member UI. Google buttons never call Google in this slice. Informational member benefits must distinguish local demo features from planned cloud storage and history.

`SitePageHeader` hesap, kitaplık, giriş, Studio girişi ve kalıcı yazı/seri sayfalarında ortak üst çubuktur: aynı içerik sınırı, logo, geri dönüş ve tema kontrolü. `AccountMenu` misafire tek giriş kontrolü sunar; giriş modalı eşit genişlikli sekmeler ve sabit pencere boyutu kullanır. Üyelik/sıfırlamada şifre tekrarı eşleşmeden işlem ilerlemez. `ProfileAvatar` 60 yerel SVG/baş harf seçeneği sunar; opsiyonel `avatar` alanı eski demo profilleriyle uyumludur. Profil fotoğrafı yükleme V2 kapsamındadır.
