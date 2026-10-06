# Frontend membership and Studio access

Product scope: `../../docs/features/membership.md`; server contract: `../../docs/api-contract.md`.

- `AuthProvider` loads the actual Spring `/auth/session`, synchronizes through BroadcastChannel/focus/visibility/expiry and clears stale responses after logout/account changes. A successful login must be followed by a successful authenticated-session read. No production demo identity, password or OAuth token is stored in browser storage.
- `AuthCard`, `AuthDialog`, `AuthPage` preserve the shared themed UI, labels, password confirmation, accessible native modal and short transitions. Register/verify/resend/recovery/reset call real APIs. Token links use fragments, removed from the visible URL; GET does not consume tokens.
- Google buttons initiate the real configured backend OAuth/OIDC flow. Missing configuration is reported; no fabricated demo login. Linking requires the authenticated user and reauthentication; no automatic email-based merge.
- `AccountMenu` exposes Studio only for an owner identity returned by the server. Members use `/hesap` and `/kaydedilenler`. Public members cannot create/publish articles.
- Next Studio/preview pages verify the real backend session before delivery. `StudioSession` refreshes that authority client-side; authorization always remains Spring's responsibility. The old Next credential store/signed Studio cookie implementation was removed.
- `AccountPage` uses actual versioned profile/avatar/preferences, password/email changes, private session inventory/revocation, linked accounts and confirmed account deletion. Sensitive operations use recent reauthentication; email changes require verification. Global publication-email preference applies to all publications.
- `SavedProvider` and member `ReadingTools` use private server-scoped data. Account changes clear prior visible records. Anonymous notes remain explicitly local; guest import is optional/confirmed and only acknowledged records are removed locally.

All auth/account/library/public headers retain the applied palette/typography/radius system. ProfileAvatar offers60 local SVG/initial choices; uploads remain V2. Native modal focus confinement/restoration, visible focus, responsive44px controls and reduced-motion behavior remain required. Private/auth pages have noindex/nofollow and private no-store headers/metadata.

Runtime APIs are same-origin rewrites to a fixed BACKEND_INTERNAL_URL. HttpOnly cookies are never read by JS. CSRF bootstrap is refreshed after identity changes;401 propagates session-expiry feedback. Production has no fallback granting access on network failure. Legacy validation/demo helper branches exist for isolated tests only, not as authorization.
