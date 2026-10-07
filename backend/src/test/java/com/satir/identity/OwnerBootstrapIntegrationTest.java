package com.satir.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Timestamp;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import com.satir.platform.api.ApiException;
import com.satir.platform.validation.ValidationException;
import com.satir.support.IntegrationTest;

class OwnerBootstrapIntegrationTest extends IntegrationTest {

    @Test
    void createsAVerifiedOwnerWithArgon2HashAndDefaultPreferences() {
        UUID id = createOwner();

        var row = jdbc.sql("SELECT role, status, verified_at, owner_username, email_normalized FROM app_user WHERE id = :id")
                .param("id", id).query().singleRow();
        assertThat(row.get("role")).isEqualTo("OWNER");
        assertThat(row.get("status")).isEqualTo("ACTIVE");
        assertThat(row.get("verified_at")).isNotNull();
        assertThat(row.get("owner_username")).isEqualTo("mrbyte");
        assertThat(row.get("email_normalized")).isEqualTo("sahip@example.test");

        String hash = jdbc.sql("SELECT password_hash FROM password_credential WHERE user_id = :id").param("id", id)
                .query(String.class).single();
        assertThat(hash).startsWith("$argon2id$").doesNotContain(OWNER_PASSWORD);
        assertThat(jdbc.sql("SELECT publication_email FROM user_preference WHERE user_id = :id").param("id", id)
                .query(Boolean.class).single()).isTrue();
        assertThat(jdbc.sql("SELECT count(*) FROM audit_event WHERE action = 'OWNER_BOOTSTRAP'").query(Long.class).single())
                .isEqualTo(1);
    }

    @Test
    void neverOverwritesOrAddsASecondOwner() {
        UUID first = createOwner();

        assertThatThrownBy(() -> ownerBootstrap.bootstrap("baska@example.test", "baskasi", "Başkası",
                "baska-parola-123".toCharArray()))
                .isInstanceOf(ApiException.class)
                .extracting("code").isEqualTo("OWNER_ALREADY_EXISTS");
        assertThat(jdbc.sql("SELECT id FROM app_user WHERE role = 'OWNER'").query(UUID.class).list()).containsExactly(first);
    }

    @Test
    void rejectsWeakPasswordsBeforeWritingAnything() {
        assertThatThrownBy(() -> ownerBootstrap.bootstrap(OWNER_EMAIL, OWNER_USERNAME, "Mr Byte", "kisa".toCharArray()))
                .isInstanceOf(ValidationException.class)
                .extracting("field", "code").containsExactly("password", "LENGTH");
        assertThat(jdbc.sql("SELECT count(*) FROM app_user").query(Long.class).single()).isZero();
    }

    @Test
    void databaseEnforcesSingleOwnerEvenOutsideTheService() {
        createOwner();
        Timestamp now = Timestamp.from(clock.instant());

        assertThatThrownBy(() -> jdbc.sql("""
                INSERT INTO app_user (id, email, email_normalized, display_name, role, status, verified_at, created_at, updated_at)
                VALUES (:id, 'x@example.test', 'x@example.test', 'X', 'OWNER', 'ACTIVE', :now, :now, :now)
                """).param("id", UUID.randomUUID()).param("now", now).update())
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseRejectsUnverifiedOwnersAndMemberUsernames() {
        Timestamp now = Timestamp.from(clock.instant());

        assertThatThrownBy(() -> jdbc.sql("""
                INSERT INTO app_user (id, email, email_normalized, display_name, role, status, created_at, updated_at)
                VALUES (:id, 'o@example.test', 'o@example.test', 'O', 'OWNER', 'ACTIVE', :now, :now)
                """).param("id", UUID.randomUUID()).param("now", now).update())
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.sql("""
                INSERT INTO app_user (id, email, email_normalized, owner_username, display_name, role, status, created_at, updated_at)
                VALUES (:id, 'm@example.test', 'm@example.test', 'member', 'M', 'MEMBER', 'PENDING', :now, :now)
                """).param("id", UUID.randomUUID()).param("now", now).update())
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
