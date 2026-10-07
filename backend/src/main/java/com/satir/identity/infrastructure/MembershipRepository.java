package com.satir.identity.infrastructure;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Membership persistence: accounts, credentials, preferences, action tokens and external identities. */
@Repository
public class MembershipRepository {

    public record Account(UUID id, String email, String displayName, String avatarKey, String role, String status,
            Instant verifiedAt, long version) {
        public boolean deleted() {
            return "DELETED".equals(status);
        }
    }

    public record Token(UUID id, UUID userId, String purpose, String encryptedTargetEmail, Instant expiresAt) {
    }

    public record Identity(UUID userId, String provider, String subject, Instant createdAt) {
    }

    public record MemberRow(UUID id, String name, String email, String status, Instant createdAt) {
    }

    public record MemberPage(List<MemberRow> items, long total) {
    }

    private static final String ACCOUNT_COLUMNS =
            "id, email, display_name, avatar_key, role, status, verified_at, version FROM app_user";

    private final JdbcClient jdbc;

    MembershipRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    // ---------------------------------------------------------------- accounts

    public Optional<Account> byEmail(String normalizedEmail) {
        return jdbc.sql("SELECT " + ACCOUNT_COLUMNS + " WHERE email_normalized = :email").param("email", normalizedEmail)
                .query(MembershipRepository::account).optional();
    }

    public Optional<Account> byId(UUID id, boolean forUpdate) {
        return jdbc.sql("SELECT " + ACCOUNT_COLUMNS + " WHERE id = :id" + (forUpdate ? " FOR UPDATE" : "")).param("id", id)
                .query(MembershipRepository::account).optional();
    }

    public void insertMember(UUID id, String email, String normalized, String name, boolean verified, Instant now) {
        jdbc.sql("""
                INSERT INTO app_user (id, email, email_normalized, display_name, role, status, verified_at, created_at, updated_at)
                VALUES (:id, :email, :normalized, :name, 'MEMBER', :status, :verifiedAt, :now, :now)
                """)
                .param("id", id).param("email", email).param("normalized", normalized).param("name", name)
                .param("status", verified ? "ACTIVE" : "PENDING").param("verifiedAt", verified ? Timestamp.from(now) : null)
                .param("now", Timestamp.from(now)).update();
        jdbc.sql("INSERT INTO user_preference (user_id) VALUES (:id)").param("id", id).update();
    }

    public void markVerified(UUID id, Instant now) {
        jdbc.sql("""
                UPDATE app_user SET status = 'ACTIVE', verified_at = COALESCE(verified_at, :now), updated_at = :now,
                    version = version + 1 WHERE id = :id AND status = 'PENDING'
                """)
                .param("id", id).param("now", Timestamp.from(now)).update();
    }

    public int updateProfile(UUID id, long expectedVersion, String name, String avatar, Instant now) {
        return jdbc.sql("""
                UPDATE app_user SET display_name = :name, avatar_key = :avatar, updated_at = :now, version = version + 1
                WHERE id = :id AND version = :version
                """)
                .param("id", id).param("version", expectedVersion).param("name", name).param("avatar", avatar)
                .param("now", Timestamp.from(now)).update();
    }

    /** Preferences share the profile version (API contract §4). */
    public int updatePreferences(UUID id, long expectedVersion, boolean publicationEmail, String timeZone, Instant now) {
        int bumped = jdbc.sql("UPDATE app_user SET updated_at = :now, version = version + 1 WHERE id = :id AND version = :version")
                .param("id", id).param("version", expectedVersion).param("now", Timestamp.from(now)).update();
        if (bumped == 1) {
            jdbc.sql("UPDATE user_preference SET publication_email = :publication, preferred_timezone = :zone WHERE user_id = :id")
                    .param("id", id).param("publication", publicationEmail).param("zone", timeZone).update();
        }
        return bumped;
    }

    public void updateEmail(UUID id, String email, String normalized, Instant now) {
        jdbc.sql("""
                UPDATE app_user SET email = :email, email_normalized = :normalized, verified_at = :now, status = 'ACTIVE',
                    updated_at = :now, version = version + 1 WHERE id = :id
                """)
                .param("id", id).param("email", email).param("normalized", normalized).param("now", Timestamp.from(now))
                .update();
    }

    /** Member accounts (never the owner or tombstones), newest first; q matches name or e-mail. */
    public MemberPage memberPage(String query, int page, int size) {
        String where = " WHERE role = 'MEMBER' AND status <> 'DELETED'"
                + (query == null ? "" : " AND (display_name ILIKE :q ESCAPE '\\' OR email_normalized ILIKE :q ESCAPE '\\')");
        String like = query == null ? null : "%" + query.toLowerCase(java.util.Locale.ROOT)
                .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
        var count = jdbc.sql("SELECT count(*) FROM app_user" + where);
        var select = jdbc.sql("SELECT id, display_name, email, status, created_at FROM app_user" + where
                + " ORDER BY created_at DESC, id DESC LIMIT :limit OFFSET :offset");
        if (like != null) {
            count = count.param("q", like);
            select = select.param("q", like);
        }
        long total = count.query(Long.class).single();
        List<MemberRow> rows = select.param("limit", size).param("offset", (long) page * size)
                .query((rs, n) -> new MemberRow(rs.getObject("id", UUID.class), rs.getString("display_name"),
                        rs.getString("email"), rs.getString("status"), rs.getTimestamp("created_at").toInstant()))
                .list();
        return new MemberPage(rows, total);
    }

    /** Removes all personal data and leaves an identity-free tombstone row. */
    public void tombstone(UUID id, Instant now) {
        jdbc.sql("DELETE FROM password_credential WHERE user_id = :id").param("id", id).update();
        jdbc.sql("DELETE FROM external_identity WHERE user_id = :id").param("id", id).update();
        jdbc.sql("DELETE FROM action_token WHERE user_id = :id").param("id", id).update();
        jdbc.sql("DELETE FROM user_preference WHERE user_id = :id").param("id", id).update();
        jdbc.sql("""
                UPDATE app_user SET status = 'DELETED', email = NULL, email_normalized = NULL, display_name = NULL,
                    avatar_key = NULL, verified_at = NULL, updated_at = :now, version = version + 1 WHERE id = :id
                """)
                .param("id", id).param("now", Timestamp.from(now)).update();
    }

    // ---------------------------------------------------------------- credentials

    public boolean hasPassword(UUID userId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM password_credential WHERE user_id = :id)").param("id", userId)
                .query(Boolean.class).single();
    }

    public Optional<String> passwordHash(UUID userId) {
        return jdbc.sql("SELECT password_hash FROM password_credential WHERE user_id = :id").param("id", userId)
                .query(String.class).optional();
    }

    public void setPassword(UUID userId, String hash, Instant now) {
        jdbc.sql("""
                INSERT INTO password_credential (user_id, password_hash, changed_at) VALUES (:id, :hash, :now)
                ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, changed_at = EXCLUDED.changed_at
                """)
                .param("id", userId).param("hash", hash).param("now", Timestamp.from(now)).update();
    }

    // ---------------------------------------------------------------- tokens

    public void insertToken(UUID id, UUID userId, String purpose, String hash, String encryptedTarget, Instant expiresAt,
            Instant now) {
        jdbc.sql("""
                INSERT INTO action_token (id, user_id, purpose, token_hash, encrypted_target_email, expires_at, created_at)
                VALUES (:id, :user, :purpose, :hash, :target, :expires, :now)
                """)
                .param("id", id).param("user", userId).param("purpose", purpose).param("hash", hash)
                .param("target", encryptedTarget).param("expires", Timestamp.from(expiresAt)).param("now", Timestamp.from(now))
                .update();
    }

    /** Older unused tokens of the same purpose stop working when a new one is issued. */
    public void retireTokens(UUID userId, String purpose, Instant now) {
        jdbc.sql("UPDATE action_token SET consumed_at = :now WHERE user_id = :user AND purpose = :purpose AND consumed_at IS NULL")
                .param("user", userId).param("purpose", purpose).param("now", Timestamp.from(now)).update();
    }

    /** Locks a valid (unused, unexpired) token for single-use consumption. */
    public Optional<Token> lockValidToken(String hash, String purpose, Instant now) {
        return jdbc.sql("""
                SELECT id, user_id, purpose, encrypted_target_email, expires_at FROM action_token
                WHERE token_hash = :hash AND purpose = :purpose AND consumed_at IS NULL AND expires_at > :now FOR UPDATE
                """)
                .param("hash", hash).param("purpose", purpose).param("now", Timestamp.from(now))
                .query((rs, row) -> new Token(rs.getObject("id", UUID.class), rs.getObject("user_id", UUID.class),
                        rs.getString("purpose"), rs.getString("encrypted_target_email"),
                        rs.getTimestamp("expires_at").toInstant()))
                .optional();
    }

    public void consumeToken(UUID id, Instant now) {
        jdbc.sql("UPDATE action_token SET consumed_at = :now WHERE id = :id").param("id", id).param("now", Timestamp.from(now))
                .update();
    }

    /** Expired or used tokens are kept 24 hours, then purged (architecture §6). */
    public void purgeTokens(Instant cutoff) {
        jdbc.sql("DELETE FROM action_token WHERE expires_at < :cutoff OR consumed_at < :cutoff")
                .param("cutoff", Timestamp.from(cutoff)).update();
    }

    // ---------------------------------------------------------------- external identities

    public Optional<Identity> identity(String provider, String subject) {
        return jdbc.sql("SELECT user_id, provider, subject, created_at FROM external_identity WHERE provider = :p AND subject = :s")
                .param("p", provider).param("s", subject).query(MembershipRepository::identity).optional();
    }

    public List<Identity> identities(UUID userId) {
        return jdbc.sql("SELECT user_id, provider, subject, created_at FROM external_identity WHERE user_id = :id ORDER BY created_at")
                .param("id", userId).query(MembershipRepository::identity).list();
    }

    public void insertIdentity(UUID id, UUID userId, String provider, String subject, Instant now) {
        jdbc.sql("""
                INSERT INTO external_identity (id, user_id, provider, subject, created_at) VALUES (:id, :user, :p, :s, :now)
                """)
                .param("id", id).param("user", userId).param("p", provider).param("s", subject).param("now", Timestamp.from(now))
                .update();
    }

    public int deleteIdentity(UUID userId, String provider) {
        return jdbc.sql("DELETE FROM external_identity WHERE user_id = :id AND provider = :p")
                .param("id", userId).param("p", provider).update();
    }

    private static Account account(ResultSet rs, int row) throws SQLException {
        Timestamp verified = rs.getTimestamp("verified_at");
        return new Account(rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("display_name"),
                rs.getString("avatar_key"), rs.getString("role"), rs.getString("status"),
                verified == null ? null : verified.toInstant(), rs.getLong("version"));
    }

    private static Identity identity(ResultSet rs, int row) throws SQLException {
        return new Identity(rs.getObject("user_id", UUID.class), rs.getString("provider"), rs.getString("subject"),
                rs.getTimestamp("created_at").toInstant());
    }
}
