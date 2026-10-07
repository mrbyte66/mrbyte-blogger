package com.satir.identity.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.satir.platform.validation.ValidationException;

class IdentityRulesTest {

    @Test
    void emailIsTrimmedAndNormalizedWithoutMergingAliases() {
        EmailAddress email = EmailAddress.parse("email", "  Ada.Lovelace+blog@Example.COM ");

        assertThat(email.value()).isEqualTo("Ada.Lovelace+blog@Example.COM");
        assertThat(email.normalized()).isEqualTo("ada.lovelace+blog@example.com");
    }

    @Test
    void emailNormalizationIgnoresDefaultLocale() {
        // Turkish locale would lower-case 'I' to dotless 'ı'; normalization must not depend on it.
        assertThat(EmailAddress.normalize("INFO@EXAMPLE.TEST")).isEqualTo("info@example.test");
    }

    @ParameterizedTest
    @ValueSource(strings = {"plain", "a@b", "a b@example.test", "@example.test"})
    void malformedEmailsAreRejected(String raw) {
        assertThatThrownBy(() -> EmailAddress.parse("email", raw))
                .isInstanceOf(ValidationException.class)
                .extracting("code").isEqualTo("FORMAT");
    }

    @Test
    void passwordLengthCountsCodePointsAndIsNeverTruncated() {
        PasswordPolicy.check("password", "123456789012".toCharArray());
        // 12 emoji = 24 UTF-16 chars but only 12 code points: still valid.
        PasswordPolicy.check("password", "😀".repeat(12).toCharArray());

        assertThatThrownBy(() -> PasswordPolicy.check("password", "12345678901".toCharArray()))
                .extracting("code").isEqualTo("LENGTH");
        assertThatThrownBy(() -> PasswordPolicy.check("password", "x".repeat(129).toCharArray()))
                .extracting("code").isEqualTo("LENGTH");
        assertThatThrownBy(() -> PasswordPolicy.check("password", " ".repeat(20).toCharArray()))
                .extracting("code").isEqualTo("FORMAT");
    }

    @Test
    void ownerUsernameIsLowerCasedAndRestricted() {
        assertThat(OwnerUsername.parse("username", " MrByte ")).isEqualTo("mrbyte");
        assertThatThrownBy(() -> OwnerUsername.parse("username", "a@b")).extracting("code").isEqualTo("FORMAT");
        assertThatThrownBy(() -> OwnerUsername.parse("username", "ab")).extracting("code").isEqualTo("FORMAT");
    }

    @Test
    void displayNameIsTrimmedAndBounded() {
        assertThat(DisplayName.parse("name", "  Mr Byte ")).isEqualTo("Mr Byte");
        assertThatThrownBy(() -> DisplayName.parse("name", "x".repeat(81))).extracting("code").isEqualTo("LENGTH");
        assertThatThrownBy(() -> DisplayName.parse("name", "   ")).extracting("code").isEqualTo("REQUIRED");
    }
}
