/** Generated from backend/docs/openapi.yaml. Do not edit; run npm run api:generate. */
export interface paths {
    "/auth/csrf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Bootstrap or re-read the CSRF token (may create an anonymous session) */
        get: operations["getCsrfToken"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Password login with e-mail or the owner username
         * @description Rotates the session ID and CSRF token. Failures are generic (no account enumeration).
         *     Limits: 5 failures / 15 min per identifier and 30 / 15 min per client address.
         */
        post: operations["login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Current session state; the frontend takes the role from here */
        get: operations["getSession"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/session/renew": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Renew the idle deadline without extending the absolute deadline */
        post: operations["renewSession"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Delete the current server session */
        post: operations["logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/register": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Create a pending member and mail a verification link
         * @description Always 202 with the same body, also for an existing address (no account enumeration). Rate limited per address and client.
         */
        post: operations["register"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/verification/resend": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Mail a new verification link to a pending account (generic 202) */
        post: operations["resendVerification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/verification/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Single-use verification token; does not sign in */
        post: operations["confirmVerification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/password/forgot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Mail a 30-minute reset link (generic 202; earlier links stop working) */
        post: operations["forgotPassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/password/reset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Set a new password with a reset token
         * @description Also verifies a pending account. Ends every session and retires other reset and pending e-mail change links.
         */
        post: operations["resetPassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/email-change/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirm a new address from the link sent to it
         * @description Ends every session and retires earlier reset links; sign-in continues with the new address.
         */
        post: operations["confirmEmailChange"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/reauthenticate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Password re-authentication for sensitive actions (valid for 5 minutes) */
        post: operations["reauthenticate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/google/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Begin Google sign-in, or re-authentication for a signed-in member */
        post: operations["startGoogle"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/google/callback": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Provider redirect target; always 303 to the allowlisted return path
         * @description The outcome is appended as `google=signed_in|linked|reauthenticated` or `google_error=<code>`. Tokens never appear in the URL.
         */
        get: operations["googleCallback"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Own profile (verified, active account) */
        get: operations["getMe"];
        put?: never;
        post?: never;
        /**
         * Delete the own account (recent re-authentication required)
         * @description Personal data, library, notes, history and claps are removed in the same transaction; the account row is kept as a tombstone. Every session ends.
         */
        delete: operations["deleteAccount"];
        options?: never;
        head?: never;
        /** Change name and/or avatar */
        patch: operations["updateProfile"];
        trace?: never;
    };
    "/me/preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Account-wide publication e-mail and time zone (shares the profile version) */
        patch: operations["updatePreferences"];
        trace?: never;
    };
    "/me/password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Set a new password (recent re-authentication required)
         * @description Also adds a password to a Google-only account. Ends every session and retires earlier reset and pending e-mail change links.
         */
        put: operations["changePassword"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/email-change": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Mail a confirmation link to a new address (recent re-authentication required)
         * @description Generic 202, also when another account uses the address. The current address stays until confirmation.
         */
        post: operations["requestEmailChange"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/connections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Linked sign-in providers (never provider tokens or subjects) */
        get: operations["listConnections"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/connections/google/start": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Begin linking a Google account (recent re-authentication required) */
        post: operations["startGoogleLink"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/connections/google": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Unlink Google (recent re-authentication required) */
        delete: operations["unlinkGoogle"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/sessions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Own signed-in devices with opaque management IDs */
        get: operations["listSessions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/sessions/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** End one own session (the current one signs out) */
        delete: operations["revokeSession"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/sessions/revoke-others": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** End every other session (recent re-authentication required) */
        post: operations["revokeOtherSessions"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/collections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Own collections; the immutable default "Genel" is created on first use and listed first */
        get: operations["listCollections"];
        put?: never;
        /** Create a collection (name unique per account, Turkish case-insensitive; max 100) */
        post: operations["createCollection"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/collections/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete; its bookmarks move to "Genel" with unchanged savedAt */
        delete: operations["deleteCollection"];
        options?: never;
        head?: never;
        /** Rename a custom collection */
        patch: operations["renameCollection"];
        trace?: never;
    };
    "/me/bookmarks": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Own bookmarks; unavailable (hidden) articles appear without any article metadata */
        get: operations["listBookmarks"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/bookmarks/{articleId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                articleId: string;
            };
            cookie?: never;
        };
        get?: never;
        /** Target state. First save needs a public article and lands in collectionId or "Genel"; an existing bookmark keeps its collection unless one is given */
        put: operations["saveBookmark"];
        post?: never;
        /** Remove a bookmark (target state) */
        delete: operations["removeBookmark"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/article-state": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Own bookmark and last visit for up to 50 articles */
        get: operations["articleState"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/articles/{articleId}/annotations": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                articleId: string;
            };
            cookie?: never;
        };
        /** Own marks on one article */
        get: operations["listAnnotations"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/articles/{articleId}/annotations/{markId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                articleId: string;
                /** @description Client-generated; unique per account */
                markId: string;
            };
            cookie?: never;
        };
        get?: never;
        /** Create with `If-None-Match:*` (also undo of a deletion), update with `If-Match` */
        put: operations["putAnnotation"];
        post?: never;
        /** Delete own mark */
        delete: operations["deleteAnnotation"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/imports/annotations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Explicit guest-note import; `clientImportId` is the idempotency key (same body replays the report, different body 409) */
        post: operations["importAnnotations"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/visits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Records a real permalink opening (not completion). Replays are harmless; the newest time wins */
        post: operations["recordVisit"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Own visit history, newest first */
        get: operations["listHistory"];
        put?: never;
        post?: never;
        /** Delete own visit history */
        delete: operations["clearHistory"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/me/series/{seriesId}/history": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Own visits of a public series' chapters */
        get: operations["seriesHistory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/engagement/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Ensures an anonymous clap identity cookie (random secret, 180 days; only its hash is stored) */
        post: operations["ensureEngagementActor"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/articles/{id}/my-clap": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** The caller's own clap state */
        get: operations["myClap"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/articles/{id}/clap": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Target state per actor (verified member account, otherwise anonymous cookie). Anonymous claps are never merged on sign-in. 30/min per actor */
        put: operations["setClap"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/impressions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Visible card (≥20%) or permalink view. Counted once per (actor, article, source, pageViewId); eventId retries never count twice */
        post: operations["recordImpression"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/articles/{id}/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Public totals of a public article */
        get: operations["articleStats"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/article-stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** OWNER only. Read-only totals per article (no duration, device or per-reader data) */
        get: operations["ownerArticleStats"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/members": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** OWNER only. Member identity fields; never libraries, notes, history or claps */
        get: operations["ownerMembers"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/site": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Applied theme and public site settings (never the draft); hidden references are null */
        get: operations["getSite"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Categories used by at least one public article */
        get: operations["listPublicCategories"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/articles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Public articles */
        get: operations["listArticles"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/articles/by-slug/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Public article, or a redirect answer for a former slug */
        get: operations["getArticleBySlug"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/series": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Public series with at least one public chapter */
        get: operations["listSeries"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/series/by-slug/{slug}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Public series, or a redirect answer for a former slug */
        get: operations["getSeriesBySlug"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/series/{id}/chapters": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Public chapters in position order with consecutive chapter numbers */
        get: operations["listChapters"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/seo/urls": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Indexable public paths for the sitemap; empty while indexing is off */
        get: operations["listSeoUrls"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/media/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Image bytes; public when a public resource references it, otherwise owner only */
        get: operations["getMedia"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/articles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** All articles in any state */
        get: operations["studioListArticles"];
        put?: never;
        /** Create a draft (slug and display date may be derived) */
        post: operations["studioCreateArticle"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/articles/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        /** One article with its current version */
        get: operations["studioGetArticle"];
        /** Replace the editable content (a published article updates live) */
        put: operations["studioUpdateArticle"];
        post?: never;
        /** Move to trash (same as the `trash` action; no hard delete) */
        delete: operations["studioTrashArticle"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/articles/{id}/actions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Lifecycle transition (publish, schedule, archive, trash, restore, visibility)
         * @description Same-state actions are no-ops. Private articles cannot be published or scheduled (`PRIVATE_NOT_PUBLISHABLE`).
         */
        post: operations["studioArticleAction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/series": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** All series in any state */
        get: operations["studioListSeries"];
        put?: never;
        /** Create a draft series */
        post: operations["studioCreateSeries"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/series/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        /** One series with its current version */
        get: operations["studioGetSeries"];
        /**
         * Replace content, membership and chapter order atomically
         * @description Articles added or removed must be listed in `articleVersions`; a pure reorder needs none.
         */
        put: operations["studioUpdateSeries"];
        post?: never;
        /** Move to trash; its articles do not change */
        delete: operations["studioTrashSeries"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/series/{id}/actions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Series lifecycle transition */
        post: operations["studioSeriesAction"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Every category, also those used only by hidden articles */
        get: operations["studioListCategories"];
        put?: never;
        /** Create a category */
        post: operations["studioCreateCategory"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/categories/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete an unused category */
        delete: operations["studioDeleteCategory"];
        options?: never;
        head?: never;
        /** Rename or re-slug a category */
        patch: operations["studioUpdateCategory"];
        trace?: never;
    };
    "/studio/publication-jobs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Publication e-mail jobs (no message bodies or credentials) */
        get: operations["studioListPublicationJobs"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/publication-jobs/{id}/retry": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Make a FAILED job eligible again (same generation and idempotency) */
        post: operations["studioRetryPublicationJob"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/site": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Site settings with the deployment indexing gate */
        get: operations["studioGetSiteSettings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Change author name, site SEO and the indexing switch */
        patch: operations["studioUpdateSiteSettings"];
        trace?: never;
    };
    "/studio/theme": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Theme workspace (draft and applied documents) */
        get: operations["studioGetTheme"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/theme/draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Save the draft; the public site does not change */
        put: operations["studioSaveThemeDraft"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/theme/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Publish the given draft revision as the public theme */
        post: operations["studioApplyTheme"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/theme/restore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Start a new draft from the applied theme; the public site does not change */
        post: operations["studioRestoreTheme"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/media": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Upload an image (re-encoded, metadata stripped; 10 MB) */
        post: operations["studioUploadMedia"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/media/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        /** Upload state and metadata (no storage paths) */
        get: operations["studioGetMedia"];
        put?: never;
        post?: never;
        /** Delete an unused upload */
        delete: operations["studioDeleteMedia"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/cover-jobs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Search licensed cover candidates for an article or series */
        post: operations["studioSearchCovers"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/cover-jobs/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Search job state and candidates */
        get: operations["studioGetCoverJob"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/studio/cover-jobs/{id}/select": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Download one candidate into media storage with its attribution */
        post: operations["studioSelectCover"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        CsrfToken: {
            token: string;
            /** @constant */
            headerName: "X-CSRF-TOKEN";
        };
        LoginRequest: {
            /** @description E-mail or owner username */
            identifier: string;
            /** Format: password */
            password: string;
        };
        Profile: {
            /** Format: uuid */
            id: string;
            name: string;
            /** Format: email */
            email: string;
            verified: boolean;
            /** @description One of the 60 built-in avatar keys */
            avatar: string | null;
            /** @enum {string} */
            role: "owner" | "member";
            preferences: {
                publicationEmail: boolean;
                /**
                 * @description IANA zone
                 * @example Europe/Istanbul
                 */
                timeZone: string;
            };
            /** Format: int64 */
            version: number;
        };
        Session: {
            authenticated: boolean;
            profile?: components["schemas"]["Profile"];
            /**
             * Format: date-time
             * @description Earlier of idle and absolute deadline
             */
            expiresAt?: string;
        };
        /** @description RFC 9457 problem details; further extension members may be added (e.g. `suggestedSlug`) */
        Problem: {
            /** @example urn:satir:problem:validation-failed */
            type: string;
            title: string;
            status: number;
            detail?: string;
            /** @description Request path */
            instance?: string;
            /**
             * @example VALIDATION_FAILED
             * @example UNAUTHENTICATED
             * @example FORBIDDEN
             * @example CSRF_INVALID
             * @example EMAIL_VERIFICATION_REQUIRED
             * @example INVALID_CREDENTIALS
             * @example RATE_LIMITED
             * @example NOT_FOUND
             * @example MALFORMED_REQUEST
             * @example STALE_VERSION
             * @example PRECONDITION_REQUIRED
             * @example IDEMPOTENCY_KEY_REQUIRED
             * @example IDEMPOTENCY_KEY_REUSED
             * @example REAUTH_REQUIRED
             */
            code: string;
            requestId: string;
            errors?: {
                field: string;
                /**
                 * @example REQUIRED
                 * @example LENGTH
                 * @example FORMAT
                 * @example UNKNOWN_FIELD
                 * @example INVALID
                 */
                code: string;
            }[];
        } & {
            [key: string]: unknown;
        };
        BookmarkPage: {
            items: components["schemas"]["BookmarkItem"][];
            page: number;
            size: number;
            /** Format: int64 */
            totalElements: number;
            totalPages: number;
            sort: string | null;
        };
        HistoryPage: {
            items: {
                /** Format: uuid */
                articleId: string;
                available: boolean;
                article?: components["schemas"]["ArticleSummary"];
                /** Format: date-time */
                lastVisitedAt?: string;
            }[];
            page: number;
            size: number;
            /** Format: int64 */
            totalElements: number;
            totalPages: number;
            sort: string | null;
        };
        OwnerArticleStatsPage: {
            items: {
                /** Format: uuid */
                articleId: string;
                title: string;
                /** Format: int64 */
                views: number;
                /** Format: int64 */
                claps: number;
                /** Format: int64 */
                saves: number;
            }[];
            page: number;
            size: number;
            /** Format: int64 */
            totalElements: number;
            totalPages: number;
            sort: string | null;
        };
        MemberPage: {
            items: {
                /** Format: uuid */
                id: string;
                name: string | null;
                /** Format: email */
                email: string;
                /** @enum {string} */
                status: "active" | "pending";
                /** Format: date-time */
                createdAt: string;
            }[];
            page: number;
            size: number;
            /** Format: int64 */
            totalElements: number;
            totalPages: number;
            sort: string | null;
        };
        ArticleStats: {
            /**
             * Format: int64
             * @description Visible-card and permalink views; not unique readers
             */
            views: number;
            /**
             * Format: int64
             * @description Active claps
             */
            claps: number;
            /**
             * Format: int64
             * @description Members who saved the article
             */
            saves: number;
        };
        /** @description Public article summary (API contract §2). Optional members are omitted when empty */
        ArticleSummary: {
            /** Format: uuid */
            id: string;
            slug: string;
            url: string;
            title: string;
            eyebrow?: string;
            abstract?: string;
            bodyPreview?: string;
            categories: components["schemas"]["Category"][];
            /** Format: date */
            displayDate: string;
            readingMinutes: number;
            cover?: components["schemas"]["MediaPublic"];
            stats: components["schemas"]["ArticleStats"];
            presentation?: components["schemas"]["ArticlePresentation"];
            /** @description Only with `expand=document` */
            document?: components["schemas"]["Document"];
            /** @description Only in series chapter lists */
            chapterNumber?: number;
        };
        Collection: {
            /** Format: uuid */
            id: string;
            name: string;
            isDefault: boolean;
            /** Format: int64 */
            count: number;
            /** Format: int64 */
            version: number;
        };
        CollectionWrite: {
            name: string;
        };
        Bookmark: {
            /** Format: uuid */
            articleId: string;
            /** Format: uuid */
            collectionId: string;
            /**
             * Format: date-time
             * @description Never changes when the bookmark moves
             */
            savedAt: string;
            /** Format: int64 */
            version: number;
        };
        /** @description Bookmark plus availability; a hidden article carries no article metadata */
        BookmarkItem: {
            /** Format: uuid */
            articleId: string;
            /** Format: uuid */
            collectionId: string;
            /** Format: date-time */
            savedAt: string;
            /** Format: int64 */
            version: number;
            available: boolean;
            article?: components["schemas"]["ArticleSummary"];
        };
        ArticleState: {
            /** Format: uuid */
            articleId: string;
            available: boolean;
            bookmark?: components["schemas"]["Bookmark"];
            /** Format: date-time */
            lastVisitedAt?: string;
        };
        /** @description UTF-16 offsets into one block (or the abstract) of the anchored revision; quote must match exactly */
        Fragment: {
            /** @description Block UUID or the literal "abstract" */
            blockId: string;
            start: number;
            end: number;
            quote: string;
            before?: string;
            after?: string;
        };
        AnnotationWrite: {
            /** @enum {string} */
            kind: "highlight" | "underline" | "note";
            /** Format: uuid */
            revisionId: string;
            /** @description Total quote length at most 12000 */
            fragments: components["schemas"]["Fragment"][];
            /** @description Required (non-blank) for kind note */
            note?: string;
        };
        Annotation: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            kind: "highlight" | "underline" | "note";
            /** Format: uuid */
            revisionId: string;
            fragments: components["schemas"]["Fragment"][];
            note: string;
            /** Format: date-time */
            createdAt: string;
            /** Format: int64 */
            version: number;
        };
        RegisterRequest: {
            name: string;
            /** Format: email */
            email: string;
            /** Format: password */
            password: string;
            /** Format: password */
            passwordConfirmation: string;
        };
        EmailRequest: {
            /** Format: email */
            email: string;
        };
        TokenRequest: {
            token: string;
        };
        PasswordReset: {
            token: string;
            /** Format: password */
            password: string;
            /** Format: password */
            passwordConfirmation: string;
        };
        Category: {
            /** Format: uuid */
            id: string;
            slug: string;
            name: string;
        };
        StudioCategory: {
            /** Format: uuid */
            id: string;
            slug: string;
            name: string;
            position: number;
            /** Format: int64 */
            version: number;
        };
        CategoryWrite: {
            name?: string;
            slug?: components["schemas"]["SlugValue"];
        };
        SlugValue: string;
        /** @description Present for provider images; fields may be omitted */
        Attribution: {
            provider?: string;
            photographer?: string;
            photographerUrl?: string;
            sourceUrl?: string;
            licenseUrl?: string;
        };
        MediaPublic: {
            /** Format: uuid */
            id: string;
            /** @example /api/v1/media/0b6f1c1e-0000-4000-8000-000000000000 */
            url: string;
            width?: number;
            height?: number;
            attribution?: components["schemas"]["Attribution"];
        };
        Link: {
            /** Format: uuid */
            id: string;
            slug: string;
            title: string;
            url: string;
        };
        Redirect: {
            /** @constant */
            resolution: "redirect";
            canonicalPath: string;
        };
        ArticlePresentation: {
            /** @enum {string} */
            width: "comfortable" | "wide";
            /** @enum {string} */
            heading: "left" | "center";
            showMeta: boolean;
        };
        SeriesPresentation: {
            /** @enum {string} */
            heading: "left" | "center";
            /** @enum {string} */
            chapterStyle: "cards" | "rows";
        };
        Seo: {
            title?: string | null;
            description?: string | null;
            indexable: boolean;
        };
        Document: {
            /** @constant */
            schemaVersion: 1;
            blocks: components["schemas"]["Block"][];
        };
        /** @description Plain-text body block; IDs stay stable across revisions so annotations can anchor */
        Block: components["schemas"]["ParagraphBlock"] | components["schemas"]["HeadingBlock"] | components["schemas"]["QuoteBlock"] | components["schemas"]["CodeBlock"] | components["schemas"]["ImageBlock"] | components["schemas"]["TableBlock"];
        ParagraphBlock: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "paragraph";
            /** Format: uuid */
            id: string;
            text: string;
        };
        HeadingBlock: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "heading";
            /** Format: uuid */
            id: string;
            text: string;
            /** @enum {integer} */
            level: 2 | 3;
        };
        QuoteBlock: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "quote";
            /** Format: uuid */
            id: string;
            text: string;
            attribution?: string;
        };
        CodeBlock: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "code";
            /** Format: uuid */
            id: string;
            text: string;
            /** @enum {string} */
            language?: "plain" | "java" | "javascript" | "typescript" | "python" | "bash" | "sql" | "json" | "yaml" | "html" | "css" | "kotlin" | "go" | "rust" | "csharp" | "cpp";
            caption?: string;
        };
        /** @description Exactly one of `assetId` (uploaded media) or `staticPath` (trusted `/assets/…` file) */
        ImageBlock: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "image";
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            assetId?: string;
            staticPath?: string;
            alt?: string;
            caption?: string;
            width?: number;
            height?: number;
        };
        TableBlock: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            type: "table";
            /** Format: uuid */
            id: string;
            caption?: string;
            columns: string[];
            /** @description Each row has as many cells as there are columns */
            rows: string[][];
        };
        CoverInput: {
            /** @enum {string} */
            mode: "auto" | "manual" | "none";
            /**
             * Format: uuid
             * @description Required for manual; must be null for none
             */
            assetId?: string | null;
        };
        CoverView: {
            /** @enum {string} */
            mode: "auto" | "manual" | "none";
            /** Format: uuid */
            assetId: string | null;
            media: components["schemas"]["MediaPublic"] | null;
        };
        VersionRef: {
            /** Format: uuid */
            id: string;
            /** Format: int64 */
            version: number;
        };
        ArticleStatsInline: {
            /** Format: int64 */
            views: number;
            /** Format: int64 */
            claps: number;
            /** Format: int64 */
            saves: number;
        };
        ArticleDetail: {
            /** Format: uuid */
            id: string;
            slug: string;
            url: string;
            title: string;
            eyebrow?: string | null;
            abstract?: string | null;
            bodyPreview?: string | null;
            categories: components["schemas"]["Category"][];
            /** Format: date */
            displayDate: string;
            readingMinutes: number;
            cover?: components["schemas"]["MediaPublic"] | null;
            stats: components["schemas"]["ArticleStatsInline"];
            /** Format: uuid */
            revisionId: string;
            document: components["schemas"]["Document"];
            presentation: components["schemas"]["ArticlePresentation"];
            seo: components["schemas"]["Seo"];
            /** Format: date-time */
            firstPublishedAt?: string | null;
            /** Format: date-time */
            publicModifiedAt?: string | null;
            series?: null | {
                /** Format: uuid */
                id: string;
                slug: string;
                title: string;
                /** @description Public chapter number */
                position: number;
                total: number;
                previous: components["schemas"]["Link"] | null;
                next: components["schemas"]["Link"] | null;
            };
        };
        /** @description Full replacement of the editable content */
        ArticleWrite: {
            /** @description Non-blank to publish */
            title?: string;
            slug?: components["schemas"]["SlugValue"];
            eyebrow?: string | null;
            abstract?: string | null;
            /** Format: date */
            displayDate?: string;
            categoryIds?: string[];
            document?: components["schemas"]["Document"];
            presentation?: components["schemas"]["ArticlePresentation"];
            seo?: components["schemas"]["Seo"];
            cover?: components["schemas"]["CoverInput"];
            seriesPlacement?: null | {
                /** Format: uuid */
                seriesId: string;
            };
            /** @description Versions of the old and new series when membership changes */
            seriesVersions?: components["schemas"]["VersionRef"][];
        };
        /** @description ArticleWrite fields; slug and displayDate may be omitted. Visibility can only be chosen here */
        ArticleCreate: {
            title?: string;
            slug?: components["schemas"]["SlugValue"];
            eyebrow?: string | null;
            abstract?: string | null;
            /** Format: date */
            displayDate?: string;
            categoryIds?: string[];
            document?: components["schemas"]["Document"];
            presentation?: components["schemas"]["ArticlePresentation"];
            seo?: components["schemas"]["Seo"];
            cover?: components["schemas"]["CoverInput"];
            seriesPlacement?: null | {
                /** Format: uuid */
                seriesId: string;
            };
            seriesVersions?: components["schemas"]["VersionRef"][];
            /**
             * @default public
             * @enum {string}
             */
            visibility: "public" | "private";
        };
        ArticleAction: {
            /** @enum {string} */
            action: "save-draft" | "publish" | "schedule" | "cancel-schedule" | "archive" | "trash" | "restore" | "make-private" | "prepare-public";
            /**
             * Format: date-time
             * @description Required for schedule; must be in the future
             */
            scheduledAt?: string | null;
            /** @description IANA zone the owner scheduled in */
            timeZone?: string | null;
            /** @description Also publish the article's draft series in the same transaction */
            publishSeries?: boolean | null;
            /** Format: int64 */
            seriesVersion?: number | null;
        };
        ArticleEdit: {
            /** Format: uuid */
            id: string;
            /** Format: int64 */
            version: number;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
            /** @enum {string} */
            status: "draft" | "scheduled" | "published" | "archived" | "trashed";
            /** @enum {string} */
            visibility: "public" | "private";
            /** Format: date-time */
            scheduledAt: string | null;
            scheduleZone: string | null;
            /** Format: date-time */
            firstPublishedAt: string | null;
            /** Format: date-time */
            lastPublishedAt: string | null;
            /** Format: uuid */
            revisionId: string;
            title: string;
            slug: string;
            url: string;
            eyebrow: string | null;
            abstract: string | null;
            /** Format: date */
            displayDate: string;
            categoryIds: string[];
            document: components["schemas"]["Document"];
            presentation: components["schemas"]["ArticlePresentation"];
            seo: components["schemas"]["Seo"];
            cover: components["schemas"]["CoverView"];
            seriesPlacement: null | {
                /** Format: uuid */
                seriesId: string;
            };
            readingMinutes: number;
        };
        ChapterRef: {
            /** Format: uuid */
            id: string;
            slug: string;
            title: string;
        };
        SeriesSummary: {
            /** Format: uuid */
            id: string;
            slug: string;
            url: string;
            title: string;
            summary: string | null;
            ongoing: boolean;
            cover: components["schemas"]["MediaPublic"] | null;
            /** @description Public chapters only */
            chapterCount: number;
            stats: components["schemas"]["ArticleStatsInline"];
            presentation: components["schemas"]["SeriesPresentation"];
            /** @description Public chapters in order */
            chapters: components["schemas"]["ChapterRef"][];
        };
        SeriesDetail: {
            /** Format: uuid */
            id: string;
            slug: string;
            url: string;
            title: string;
            summary: string | null;
            ongoing: boolean;
            cover: components["schemas"]["MediaPublic"] | null;
            chapterCount: number;
            stats: components["schemas"]["ArticleStatsInline"];
            presentation: components["schemas"]["SeriesPresentation"];
            chapters: components["schemas"]["ChapterRef"][];
            seo: components["schemas"]["Seo"];
            /** Format: date-time */
            publicModifiedAt: string | null;
        };
        SeriesWrite: {
            title?: string;
            slug?: components["schemas"]["SlugValue"];
            summary?: string | null;
            ongoing?: boolean;
            cover?: components["schemas"]["CoverInput"];
            presentation?: components["schemas"]["SeriesPresentation"];
            seo?: components["schemas"]["Seo"];
            chapterIds?: string[];
            /** @description Versions of articles added or removed */
            articleVersions?: components["schemas"]["VersionRef"][];
        };
        SeriesEdit: {
            /** Format: uuid */
            id: string;
            /** Format: int64 */
            version: number;
            /** @enum {string} */
            status: "draft" | "published" | "archived" | "trashed";
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
            title: string;
            slug: string;
            url: string;
            summary: string | null;
            ongoing: boolean;
            cover: components["schemas"]["CoverView"];
            presentation: components["schemas"]["SeriesPresentation"];
            seo: components["schemas"]["Seo"];
            chapterIds: string[];
        };
        ArticleSummaryPage: {
            items: components["schemas"]["ArticleSummary"][];
            page: number;
            size: number;
            /** Format: int64 */
            totalElements: number;
            totalPages: number;
            sort: string | null;
        };
        ArticleEditPage: {
            items: components["schemas"]["ArticleEdit"][];
            page: number;
            size: number;
            /** Format: int64 */
            totalElements: number;
            totalPages: number;
            sort: string | null;
        };
        SeriesSummaryPage: {
            items: components["schemas"]["SeriesSummary"][];
            page: number;
            size: number;
            /** Format: int64 */
            totalElements: number;
            totalPages: number;
            sort: string | null;
        };
        SeriesEditPage: {
            items: components["schemas"]["SeriesEdit"][];
            page: number;
            size: number;
            /** Format: int64 */
            totalElements: number;
            totalPages: number;
            sort: string | null;
        };
        SeoUrlPage: {
            items: {
                /** @description Relative to the canonical origin */
                path: string;
                /** Format: date-time */
                lastModified: string | null;
            }[];
            page: number;
            size: number;
            /** Format: int64 */
            totalElements: number;
            totalPages: number;
            sort: string | null;
        };
        JobPage: {
            items: {
                /** Format: uuid */
                id: string;
                /** @example PUBLICATION_EMAIL */
                type: string;
                /**
                 * Format: uuid
                 * @description The article
                 */
                aggregateId: string;
                /** Format: int64 */
                generation: number;
                /** @enum {string} */
                state: "pending" | "running" | "done" | "failed" | "skipped";
                attempts: number;
                lastErrorCode: string | null;
                /** Format: date-time */
                availableAt: string;
                /** Format: date-time */
                createdAt: string;
                /** Format: date-time */
                updatedAt: string;
            }[];
            page: number;
            size: number;
            /** Format: int64 */
            totalElements: number;
            totalPages: number;
            sort: string | null;
        };
        SiteSeo: {
            title?: string | null;
            description?: string | null;
        };
        PublicSite: {
            siteName?: string;
            theme?: components["schemas"]["ThemeDocument"];
            authorPublicName?: string;
            seo?: components["schemas"]["SiteSeo"];
            /** @description Owner switch and deployment gate combined */
            indexingEnabled: boolean;
            canonicalOrigin?: string;
        };
        SiteSettings: {
            authorPublicName: string | null;
            seo: components["schemas"]["SiteSeo"];
            indexingEnabled: boolean;
            /** @description Read-only deployment gate */
            deploymentIndexingEnabled: boolean;
            /** @description Read-only deployment configuration */
            canonicalOrigin: string | null;
            /** Format: int64 */
            version: number;
        };
        ThemeWorkspace: {
            /** Format: int64 */
            version: number;
            /** Format: uuid */
            draftRevisionId: string | null;
            /** Format: uuid */
            appliedRevisionId: string | null;
            draft: components["schemas"]["ThemeDocument"] | null;
            applied: components["schemas"]["ThemeDocument"] | null;
        };
        /** @description Builder allowlist (256 KiB). Header first, one lead (intro XOR scene) after it, footer last; block ids and kinds unique */
        ThemeDocument: {
            /** @constant */
            schemaVersion: 1;
            name: string;
            siteName: string;
            /** @description mint, violet, amber or #rrggbb */
            accent: string;
            /** @enum {string} */
            typography: "modern" | "editorial" | "mono";
            /** @enum {string} */
            surface: "paper" | "night" | "warm";
            /** @enum {string} */
            width: "reading" | "wide";
            /** @enum {string} */
            spacing: "airy" | "compact";
            blocks: components["schemas"]["ThemeBlock"][];
        };
        ThemeBlock: components["schemas"]["ThemeHeader"] | components["schemas"]["ThemeIntro"] | components["schemas"]["ThemeScene"] | components["schemas"]["ThemeArticles"] | components["schemas"]["ThemeSeries"] | components["schemas"]["ThemeQuote"] | components["schemas"]["ThemeAbout"] | components["schemas"]["ThemeProjects"] | components["schemas"]["ThemeFooter"];
        ThemeBlockId: string;
        ThemeHeader: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "header";
            id: components["schemas"]["ThemeBlockId"];
        };
        ThemeIntro: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "intro";
            id: components["schemas"]["ThemeBlockId"];
            title: string;
            description: string;
            eyebrow: string;
            /** @enum {string} */
            layout: "statement" | "centered" | "split";
        };
        ThemeScene: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "scene";
            id: components["schemas"]["ThemeBlockId"];
            title: string;
            emphasis: string;
            description: string;
            /**
             * Format: uuid
             * @description Null in the public site when the article is hidden
             */
            featuredArticleId: string | null;
            showFeaturedArticle: boolean;
            /** Format: uuid */
            featuredSeriesId: string | null;
            showFeaturedSeries: boolean;
        };
        ThemeArticles: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "articles";
            id: components["schemas"]["ThemeBlockId"];
            title: string;
            /** Format: uuid */
            categoryId: string | null;
            /** @enum {string} */
            display: "rows" | "cards";
            /** @enum {string} */
            loading: "all" | "progressive";
        };
        ThemeSeries: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "series";
            id: components["schemas"]["ThemeBlockId"];
            title: string;
            /** @enum {string} */
            display: "cards" | "list";
        };
        ThemeQuote: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "quote";
            id: components["schemas"]["ThemeBlockId"];
            text: string;
            attribution: string;
            /** @enum {string} */
            display: "band" | "card";
        };
        ThemeAbout: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "about";
            id: components["schemas"]["ThemeBlockId"];
            title: string;
            text: string;
        };
        ThemeProjects: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "projects";
            id: components["schemas"]["ThemeBlockId"];
            title: string;
        };
        ThemeFooter: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            kind: "footer";
            id: components["schemas"]["ThemeBlockId"];
            text: string;
        };
        MediaStatus: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            state: "quarantined" | "ready" | "failed";
            /** @enum {string} */
            mime?: "image/jpeg" | "image/png" | "image/webp";
            /** Format: int64 */
            size?: number;
            width?: number;
            height?: number;
            url?: string;
            provider?: string;
            photographer?: string;
            photographerUrl?: string;
            sourceUrl?: string;
            licenseUrl?: string;
            errorCode?: string;
        };
        CoverJob: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            state: "done" | "failed";
            candidates: {
                candidateId: string;
                thumbnailUrl: string;
                downloadUrl?: string | null;
                sourceUrl: string;
                photographer: string | null;
                photographerUrl?: string | null;
                licenseUrl: string;
                alt?: string | null;
            }[];
            errorCode: string | null;
        };
    };
    responses: {
        /** @description Problem details */
        Problem: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description `RATE_LIMITED` */
        RateLimited: {
            headers: {
                "Retry-After"?: number;
                [name: string]: unknown;
            };
            content: {
                "application/problem+json": components["schemas"]["Problem"];
            };
        };
        /** @description Accepted; the same answer whether or not an account exists */
        Accepted: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    message: string;
                };
            };
        };
        /** @description Redirect the browser here */
        AuthorizationUrl: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** Format: uri */
                    authorizationUrl: string;
                };
            };
        };
        /** @description Own profile */
        ProfileWithEtag: {
            headers: {
                ETag?: string;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Profile"];
            };
        };
        /** @description Article edit view */
        ArticleEdit: {
            headers: {
                ETag?: string;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ArticleEdit"];
            };
        };
        /** @description Series edit view */
        SeriesEdit: {
            headers: {
                ETag?: string;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["SeriesEdit"];
            };
        };
        /** @description Site settings */
        SiteSettings: {
            headers: {
                ETag?: string;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["SiteSettings"];
            };
        };
        /** @description Theme workspace */
        ThemeWorkspace: {
            headers: {
                ETag?: string;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["ThemeWorkspace"];
            };
        };
    };
    parameters: {
        IdempotencyKey: string;
        IfMatch: string;
        Page: number;
        Size: number;
        /** @description Trimmed search text */
        Query: string;
        Slug: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getCsrfToken: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description CSRF token for unsafe requests */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CsrfToken"];
                };
            };
        };
    };
    login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LoginRequest"];
            };
        };
        responses: {
            /** @description Signed in; session cookie set */
            200: {
                headers: {
                    /** @description `__Host-satir-session` (HttpOnly; Secure; SameSite=Lax; Path=/) */
                    "Set-Cookie"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Profile"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            /** @description Too many failed attempts */
            429: {
                headers: {
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getSession: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Anonymous or signed-in state */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Session"];
                };
            };
        };
    };
    renewSession: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Session still valid */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Session"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
        };
    };
    logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Signed out (also when already anonymous) */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            403: components["responses"]["Problem"];
        };
    };
    register: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RegisterRequest"];
            };
        };
        responses: {
            202: components["responses"]["Accepted"];
            403: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            429: components["responses"]["RateLimited"];
        };
    };
    resendVerification: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailRequest"];
            };
        };
        responses: {
            202: components["responses"]["Accepted"];
            403: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            429: components["responses"]["RateLimited"];
        };
    };
    confirmVerification: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TokenRequest"];
            };
        };
        responses: {
            /** @description Verified */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            403: components["responses"]["Problem"];
            /** @description `INVALID_TOKEN` (unknown, used or expired) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    forgotPassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailRequest"];
            };
        };
        responses: {
            202: components["responses"]["Accepted"];
            403: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            429: components["responses"]["RateLimited"];
        };
    };
    resetPassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PasswordReset"];
            };
        };
        responses: {
            /** @description Password changed; all sessions ended */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            403: components["responses"]["Problem"];
            /** @description `INVALID_TOKEN` or `VALIDATION_FAILED` */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    confirmEmailChange: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["TokenRequest"];
            };
        };
        responses: {
            /** @description Address changed; all sessions ended */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            403: components["responses"]["Problem"];
            /** @description `EMAIL_TAKEN` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description `INVALID_TOKEN` */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    reauthenticate: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: password */
                    password: string;
                };
            };
        };
        responses: {
            /** @description Re-authenticated */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: date-time */
                        validUntil: string;
                    };
                };
            };
            /** @description `INVALID_CREDENTIALS` or no session */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            403: components["responses"]["Problem"];
            /** @description `PASSWORD_NOT_SET` (Google-only account: use Google start with purpose `reauth`) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            429: components["responses"]["RateLimited"];
        };
    };
    startGoogle: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Allowlisted same-origin relative path; defaults to `/` */
                    returnTo?: string | null;
                    /**
                     * @default login
                     * @enum {string|null}
                     */
                    purpose?: "login" | "reauth" | null;
                };
            };
        };
        responses: {
            200: components["responses"]["AuthorizationUrl"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            /** @description `GOOGLE_NOT_CONFIGURED` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    googleCallback: {
        parameters: {
            query?: {
                state?: string;
                code?: string;
                error?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Back to the frontend */
            303: {
                headers: {
                    Location?: string;
                    "Referrer-Policy"?: "no-referrer";
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getMe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Own profile */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Profile"];
                };
            };
            401: components["responses"]["Problem"];
            /** @description `EMAIL_VERIFICATION_REQUIRED` for unverified accounts */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    deleteAccount: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @constant */
                    confirmation: "DELETE";
                };
            };
        };
        responses: {
            /** @description Deleted; all sessions ended */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Problem"];
            /** @description `REAUTH_REQUIRED` */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description `OWNER_DELETE_REQUIRES_MIGRATION` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            422: components["responses"]["Problem"];
        };
    };
    updateProfile: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    name?: string;
                    /** @description One of the 60 built-in avatar keys; null removes it */
                    avatar?: string | null;
                };
            };
        };
        responses: {
            200: components["responses"]["ProfileWithEtag"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            412: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    updatePreferences: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    publicationEmail?: boolean;
                    /** @description IANA zone */
                    timeZone?: string;
                };
            };
        };
        responses: {
            200: components["responses"]["ProfileWithEtag"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            412: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    changePassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: password */
                    password: string;
                    /** Format: password */
                    passwordConfirmation: string;
                };
            };
        };
        responses: {
            /** @description Changed; all sessions ended */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Problem"];
            /** @description `REAUTH_REQUIRED` */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            422: components["responses"]["Problem"];
        };
    };
    requestEmailChange: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailRequest"];
            };
        };
        responses: {
            202: components["responses"]["Accepted"];
            401: components["responses"]["Problem"];
            /** @description `REAUTH_REQUIRED` */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            422: components["responses"]["Problem"];
            429: components["responses"]["RateLimited"];
        };
    };
    listConnections: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Connections */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: {
                            /** @enum {string} */
                            provider: "google";
                            /** Format: date-time */
                            connectedAt: string;
                        }[];
                    };
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
        };
    };
    startGoogleLink: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    returnTo?: string | null;
                };
            };
        };
        responses: {
            200: components["responses"]["AuthorizationUrl"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            /** @description `GOOGLE_NOT_CONFIGURED` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    unlinkGoogle: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Unlinked (also when not linked) */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            /** @description `LAST_LOGIN_METHOD` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listSessions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Sessions, current first */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: {
                            /** @description Opaque handle, not the session cookie */
                            id: string;
                            current: boolean;
                            deviceLabel: string | null;
                            /** Format: date-time */
                            createdAt: string;
                            /** Format: date-time */
                            lastSeenAt: string;
                            /** Format: date-time */
                            expiresAt: string;
                        }[];
                    };
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
        };
    };
    revokeSession: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Ended */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            /** @description Unknown or another account's session */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    revokeOtherSessions: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Other sessions ended */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
        };
    };
    listCollections: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Collections with bookmark counts */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: components["schemas"]["Collection"][];
                    };
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
        };
    };
    createCollection: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CollectionWrite"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    Location?: string;
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Collection"];
                };
            };
            /** @description `DUPLICATE_COLLECTION`, `COLLECTION_LIMIT` or `IDEMPOTENCY_KEY_REUSED` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            422: components["responses"]["Problem"];
            /** @description Idempotency-Key missing */
            428: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    deleteCollection: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            404: components["responses"]["Problem"];
            /** @description `DEFAULT_COLLECTION` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            412: components["responses"]["Problem"];
        };
    };
    renameCollection: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CollectionWrite"];
            };
        };
        responses: {
            /** @description Renamed */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Collection"];
                };
            };
            /** @description Missing or another account's collection */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description `DEFAULT_COLLECTION` or `DUPLICATE_COLLECTION` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            412: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    listBookmarks: {
        parameters: {
            query?: {
                collectionId?: string;
                /** @description Matches visible title, abstract and category only */
                q?: string;
                sort?: "saved_asc" | "saved_desc" | "date_desc" | "title_asc";
                page?: components["parameters"]["Page"];
                size?: components["parameters"]["Size"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Page of bookmarks */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BookmarkPage"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            /** @description Foreign or missing collectionId */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description `INVALID_PAGE`, `INVALID_SORT` or `INVALID_QUERY` */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    saveBookmark: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                articleId: string;
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": {
                    /** Format: uuid */
                    collectionId?: string;
                };
            };
        };
        responses: {
            /** @description Saved */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Bookmark"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            /** @description Hidden article (new save) or foreign collection */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description `LIBRARY_FULL` (1000 bookmarks) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    removeBookmark: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                articleId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Removed (also when absent or hidden) */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    articleState: {
        parameters: {
            query: {
                /** @description Comma-separated UUIDs, at most 50 */
                ids: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Own bookmark and last visit per article; hidden articles only `available:false` */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items?: components["schemas"]["ArticleState"][];
                    };
                };
            };
            422: components["responses"]["Problem"];
        };
    };
    listAnnotations: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                articleId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Own marks; for a hidden article only opaque `{id, available:false}` items */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        articleId: string;
                        /** @description false only when the article is hidden; otherwise null */
                        available?: boolean | null;
                        /**
                         * Format: uuid
                         * @description Current public revision; null when hidden
                         */
                        revisionId?: string | null;
                        items: (components["schemas"]["Annotation"] | {
                            /** Format: uuid */
                            id: string;
                            /** @constant */
                            available: false;
                        })[];
                    };
                };
            };
        };
    };
    putAnnotation: {
        parameters: {
            query?: never;
            header?: {
                "If-None-Match"?: "*";
                "If-Match"?: string;
            };
            path: {
                articleId: string;
                /** @description Client-generated; unique per account */
                markId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AnnotationWrite"];
            };
        };
        responses: {
            /** @description Updated */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Annotation"];
                };
            };
            /** @description Created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Annotation"];
                };
            };
            /** @description Hidden article, or update of a mark this account does not have */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description `ANNOTATION_LIMIT` (200 per article) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description `ALREADY_EXISTS` on create or `STALE_VERSION` on update */
            412: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description Field codes: QUOTE_MISMATCH, UNKNOWN_ANCHOR, UNKNOWN_REVISION, RANGE, CONTEXT_LENGTH, LENGTH, REQUIRED */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            428: components["responses"]["Problem"];
        };
    };
    deleteAnnotation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                articleId: string;
                /** @description Client-generated; unique per account */
                markId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Not this account's mark */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    importAnnotations: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uuid */
                    clientImportId: string;
                    items: (components["schemas"]["AnnotationWrite"] & {
                        /** Format: uuid */
                        articleId: string;
                        /** Format: date-time */
                        createdAt?: string;
                    })[];
                };
            };
        };
        responses: {
            /** @description Per-item report (valid items are never blocked by invalid ones) */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        clientImportId?: string;
                        accepted?: {
                            index?: number;
                            /** Format: uuid */
                            id?: string;
                            /** Format: uuid */
                            articleId?: string;
                        }[];
                        rejected?: {
                            index?: number;
                            /**
                             * @example NOT_AVAILABLE
                             * @example QUOTE_MISMATCH
                             * @example ANNOTATION_LIMIT
                             * @example DUPLICATE
                             */
                            code?: string;
                        }[];
                    };
                };
            };
            409: components["responses"]["Problem"];
        };
    };
    recordVisit: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uuid */
                    eventId: string;
                    /** Format: uuid */
                    articleId: string;
                    /** Format: uuid */
                    revisionId: string;
                    /**
                     * Format: date-time
                     * @description Capped at server time; older than 24 h is 422
                     */
                    visitedAt?: string;
                };
            };
        };
        responses: {
            /** @description Recorded */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            404: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
        };
    };
    listHistory: {
        parameters: {
            query?: {
                page?: components["parameters"]["Page"];
                size?: components["parameters"]["Size"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Newest first; hidden articles as `{articleId, available:false}`. Retention 180 days */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HistoryPage"];
                };
            };
        };
    };
    clearHistory: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Cleared */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    seriesHistory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                seriesId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Visits of the series' current public chapters, in chapter order (no "completed") */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items?: {
                            /** Format: uuid */
                            articleId?: string;
                            /** Format: date-time */
                            lastVisitedAt?: string;
                        }[];
                    };
                };
            };
            404: components["responses"]["Problem"];
        };
    };
    ensureEngagementActor: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Ready */
            200: {
                headers: {
                    /** @description `__Host-satir-actor` (HttpOnly; Secure; SameSite=Lax; Path=/) when newly created */
                    "Set-Cookie"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @constant */
                        ready?: true;
                    };
                };
            };
        };
    };
    myClap: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The caller's own clap */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        clapped?: boolean;
                    };
                };
            };
            /** @description Hidden or missing article */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    setClap: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    clapped: boolean;
                };
            };
        };
        responses: {
            /** @description New state and public total */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        clapped?: boolean;
                        /** Format: int64 */
                        claps?: number;
                    };
                };
            };
            /** @description `CSRF_INVALID` */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            404: components["responses"]["Problem"];
            /** @description `RATE_LIMITED` with Retry-After */
            429: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    recordImpression: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uuid */
                    eventId: string;
                    /** Format: uuid */
                    articleId: string;
                    /** @enum {string} */
                    source: "card" | "permalink";
                    /** Format: uuid */
                    pageViewId: string;
                    /**
                     * Format: date-time
                     * @description At most 24 h past / 5 min future
                     */
                    occurredAt: string;
                };
            };
        };
        responses: {
            /** @description `accepted:false` for known automation user agents */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        accepted?: boolean;
                        counted?: boolean;
                        /** Format: int64 */
                        views?: number;
                    };
                };
            };
            404: components["responses"]["Problem"];
            /** @description `EVENT_ID_REUSED` for a different payload */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            422: components["responses"]["Problem"];
            429: components["responses"]["Problem"];
        };
    };
    articleStats: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Public totals */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArticleStats"];
                };
            };
            404: components["responses"]["Problem"];
        };
    };
    ownerArticleStats: {
        parameters: {
            query?: {
                page?: components["parameters"]["Page"];
                size?: components["parameters"]["Size"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Page of totals, newest display date first */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OwnerArticleStatsPage"];
                };
            };
            403: components["responses"]["Problem"];
        };
    };
    ownerMembers: {
        parameters: {
            query?: {
                /** @description Name or e-mail */
                q?: string;
                page?: components["parameters"]["Page"];
                size?: components["parameters"]["Size"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Newest first; deleted accounts are not listed */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MemberPage"];
                };
            };
            403: components["responses"]["Problem"];
        };
    };
    getSite: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Public site */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PublicSite"];
                };
            };
        };
    };
    listPublicCategories: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Categories in editorial order */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: components["schemas"]["Category"][];
                    };
                };
            };
        };
    };
    listArticles: {
        parameters: {
            query?: {
                page?: components["parameters"]["Page"];
                size?: components["parameters"]["Size"];
                /** @description Trimmed search text */
                q?: components["parameters"]["Query"];
                categoryId?: string;
                sort?: "date_desc" | "date_asc" | "title_asc";
                /** @description Also return body blocks and presentation */
                expand?: "document";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Page of summaries */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArticleSummaryPage"];
                };
            };
            /** @description `INVALID_PAGE`, `INVALID_SORT` or `INVALID_QUERY` */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    getArticleBySlug: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: components["parameters"]["Slug"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The article, or where its canonical path is now (the frontend answers 308) */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArticleDetail"] | components["schemas"]["Redirect"];
                };
            };
            /** @description Missing, private, draft, scheduled, archived or trashed */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listSeries: {
        parameters: {
            query?: {
                page?: components["parameters"]["Page"];
                size?: components["parameters"]["Size"];
                /** @description Trimmed search text */
                q?: components["parameters"]["Query"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Page of series */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SeriesSummaryPage"];
                };
            };
            422: components["responses"]["Problem"];
        };
    };
    getSeriesBySlug: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                slug: components["parameters"]["Slug"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The series or its canonical path */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SeriesDetail"] | components["schemas"]["Redirect"];
                };
            };
            /** @description Missing, hidden or without public chapters */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    listChapters: {
        parameters: {
            query?: {
                page?: components["parameters"]["Page"];
                size?: components["parameters"]["Size"];
            };
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Page of chapters (summaries with `chapterNumber`) */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArticleSummaryPage"];
                };
            };
            404: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
        };
    };
    listSeoUrls: {
        parameters: {
            query?: {
                page?: components["parameters"]["Page"];
                size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Page of paths */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SeoUrlPage"];
                };
            };
            422: components["responses"]["Problem"];
        };
    };
    getMedia: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Re-encoded image without metadata */
            200: {
                headers: {
                    "Content-Disposition"?: "inline";
                    "X-Content-Type-Options"?: "nosniff";
                    [name: string]: unknown;
                };
                content: {
                    "image/jpeg": string;
                    "image/png": string;
                    "image/webp": string;
                };
            };
            /** @description Missing, not ready, or not visible to the caller */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    studioListArticles: {
        parameters: {
            query?: {
                status?: "draft" | "scheduled" | "published" | "archived" | "trashed";
                visibility?: "public" | "private";
                seriesId?: string;
                /** @description Trimmed search text */
                q?: components["parameters"]["Query"];
                /** @description Default date_desc; scheduled_asc when status=scheduled */
                sort?: "date_desc" | "created_asc" | "scheduled_asc" | "scheduled_desc" | "title_asc";
                page?: components["parameters"]["Page"];
                size?: components["parameters"]["Size"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Page of edit views */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArticleEditPage"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
        };
    };
    studioCreateArticle: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ArticleCreate"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    Location?: string;
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ArticleEdit"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            /** @description Unknown category, series or media */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description `SLUG_TAKEN` (with `suggestedSlug`), `ARTICLE_IN_OTHER_SERIES`, `MEDIA_NOT_READY`, `IDEMPOTENCY_KEY_REUSED`, `IDEMPOTENCY_IN_PROGRESS` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            412: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    studioGetArticle: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ArticleEdit"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
        };
    };
    studioUpdateArticle: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ArticleWrite"];
            };
        };
        responses: {
            200: components["responses"]["ArticleEdit"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
            /** @description `SLUG_TAKEN`, `ARTICLE_IN_OTHER_SERIES`, `SCHEDULE_ALREADY_DUE`, `MEDIA_NOT_READY`, `ASSET_SHARED_ACROSS_VISIBILITY` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            412: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    studioTrashArticle: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Trashed */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
            412: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    studioArticleAction: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ArticleAction"];
            };
        };
        responses: {
            200: components["responses"]["ArticleEdit"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
            /** @description `INVALID_TRANSITION`, `PRIVATE_NOT_PUBLISHABLE`, `CONTENT_REQUIRED`, `SERIES_NOT_DRAFT`, `IDEMPOTENCY_KEY_REUSED` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            412: components["responses"]["Problem"];
            /** @description `VALIDATION_FAILED` (e.g. scheduledAt `IN_PAST`) */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            428: components["responses"]["Problem"];
        };
    };
    studioListSeries: {
        parameters: {
            query?: {
                status?: "draft" | "published" | "archived" | "trashed";
                /** @description Trimmed search text */
                q?: components["parameters"]["Query"];
                page?: components["parameters"]["Page"];
                size?: components["parameters"]["Size"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Page of edit views */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SeriesEditPage"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
        };
    };
    studioCreateSeries: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SeriesWrite"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    Location?: string;
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SeriesEdit"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
            /** @description `SLUG_TAKEN`, `ARTICLE_IN_OTHER_SERIES`, `IDEMPOTENCY_KEY_REUSED` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            412: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    studioGetSeries: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["SeriesEdit"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
        };
    };
    studioUpdateSeries: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SeriesWrite"];
            };
        };
        responses: {
            200: components["responses"]["SeriesEdit"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
            /** @description `SLUG_TAKEN`, `ARTICLE_IN_OTHER_SERIES`, `DUPLICATE` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            412: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    studioTrashSeries: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Trashed */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
            412: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    studioSeriesAction: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
                "Idempotency-Key": components["parameters"]["IdempotencyKey"];
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @enum {string} */
                    action: "publish" | "save-draft" | "archive" | "trash" | "restore";
                };
            };
        };
        responses: {
            200: components["responses"]["SeriesEdit"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
            /** @description `INVALID_TRANSITION`, `SERIES_EMPTY`, `IDEMPOTENCY_KEY_REUSED` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            412: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    studioListCategories: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Categories in position order */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        items: components["schemas"]["StudioCategory"][];
                    };
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
        };
    };
    studioCreateCategory: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CategoryWrite"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    Location?: string;
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioCategory"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            /** @description `CATEGORY_EXISTS` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            422: components["responses"]["Problem"];
        };
    };
    studioDeleteCategory: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
            /** @description `CATEGORY_IN_USE` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            412: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    studioUpdateCategory: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
            };
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CategoryWrite"];
            };
        };
        responses: {
            /** @description Updated */
            200: {
                headers: {
                    ETag?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StudioCategory"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
            /** @description `CATEGORY_EXISTS` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            412: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    studioListPublicationJobs: {
        parameters: {
            query?: {
                state?: "pending" | "running" | "done" | "failed" | "skipped";
                page?: components["parameters"]["Page"];
                size?: components["parameters"]["Size"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Page of jobs */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["JobPage"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
        };
    };
    studioRetryPublicationJob: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Queued again */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
            /** @description `JOB_NOT_FAILED` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    studioGetSiteSettings: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["SiteSettings"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
        };
    };
    studioUpdateSiteSettings: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    authorPublicName?: string | null;
                    seo?: components["schemas"]["SiteSeo"];
                    indexingEnabled?: boolean;
                };
            };
        };
        responses: {
            200: components["responses"]["SiteSettings"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            412: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    studioGetTheme: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ThemeWorkspace"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
        };
    };
    studioSaveThemeDraft: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ThemeDocument"];
            };
        };
        responses: {
            200: components["responses"]["ThemeWorkspace"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            /** @description Unknown article, series or category reference */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            412: components["responses"]["Problem"];
            /** @description `THEME_TOO_LARGE` (256 KiB) */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            422: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    studioApplyTheme: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: uuid */
                    draftRevisionId: string;
                };
            };
        };
        responses: {
            200: components["responses"]["ThemeWorkspace"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            /** @description `DRAFT_CHANGED` or `NOT_PUBLIC` reference */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            412: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    studioRestoreTheme: {
        parameters: {
            query?: never;
            header: {
                "If-Match": components["parameters"]["IfMatch"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["ThemeWorkspace"];
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            /** @description `NOTHING_APPLIED` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            412: components["responses"]["Problem"];
            428: components["responses"]["Problem"];
        };
    };
    studioUploadMedia: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /** Format: binary */
                    file: string;
                };
            };
        };
        responses: {
            /** @description Accepted */
            202: {
                headers: {
                    Location?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MediaStatus"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            /** @description `MEDIA_TOO_LARGE` or `PAYLOAD_TOO_LARGE` */
            413: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description `MEDIA_TYPE_UNSUPPORTED` */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description `MEDIA_EMPTY`, `MEDIA_DECODE_FAILED`, `MEDIA_TOO_MANY_PIXELS` */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    studioGetMedia: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Media */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["MediaStatus"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
        };
    };
    studioDeleteMedia: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Deleted (also when absent) */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            /** @description `MEDIA_IN_USE` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    studioSearchCovers: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @enum {string} */
                    resourceType: "article" | "series";
                    /** Format: uuid */
                    resourceId: string;
                    /** Format: int64 */
                    resourceVersion?: number | null;
                    /** @description Required for private articles (titles are never sent to the provider) */
                    query?: string | null;
                };
            };
        };
        responses: {
            /** @description Search job */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CoverJob"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
            409: components["responses"]["Problem"];
            422: components["responses"]["Problem"];
            /** @description `COVER_PROVIDER_UNAVAILABLE` */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
    studioGetCoverJob: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Job */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CoverJob"];
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
        };
    };
    studioSelectCover: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    candidateId: string;
                };
            };
        };
        responses: {
            /** @description Stored asset */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** Format: uuid */
                        assetId: string;
                        url: string;
                    };
                };
            };
            401: components["responses"]["Problem"];
            403: components["responses"]["Problem"];
            404: components["responses"]["Problem"];
            /** @description `VALIDATION_FAILED` with candidateId `UNKNOWN` for a candidate not in the job */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
            /** @description `COVER_DOWNLOAD_FAILED` */
            502: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["Problem"];
                };
            };
        };
    };
}
