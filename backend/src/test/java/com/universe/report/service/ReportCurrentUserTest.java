package com.universe.report.service;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import static org.assertj.core.api.Assertions.*;

class ReportCurrentUserTest {
    private final ReportCurrentUser currentUser = new ReportCurrentUser();

    @Test void readsOnlyVerifiedAuthenticationIdentity() {
        var authentication = UsernamePasswordAuthenticationToken.authenticated("42", null, List.of());
        assertThat(currentUser.requireId(authentication)).isEqualTo(42L);
    }

    @Test void supportsLargestDatabaseId() {
        var authentication = UsernamePasswordAuthenticationToken.authenticated("9223372036854775807", null, List.of());
        assertThat(currentUser.requireId(authentication)).isEqualTo(Long.MAX_VALUE);
    }

    @Test void rejectsMissingAuthentication() {
        assertThatThrownBy(() -> currentUser.requireId(null))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
    }

    @Test void rejectsUnverifiedIdentity() {
        var authentication = UsernamePasswordAuthenticationToken.unauthenticated("42", null);
        assertThatThrownBy(() -> currentUser.requireId(authentication))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
    }

    @Test void rejectsAnonymousEvenWithNumericName() {
        var authentication = new AnonymousAuthenticationToken("test", "42",
                List.of(new SimpleGrantedAuthority("ROLE_ANONYMOUS")));
        assertThatThrownBy(() -> currentUser.requireId(authentication))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "01", " 42", "42 ", "me", "user@example.com", "9223372036854775808"})
    void rejectsUnsupportedPrincipalNames(String name) {
        var authentication = UsernamePasswordAuthenticationToken.authenticated(name, null, List.of());
        assertThatThrownBy(() -> currentUser.requireId(authentication))
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
    }
}
