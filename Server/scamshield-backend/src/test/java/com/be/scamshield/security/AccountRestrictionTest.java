package com.be.scamshield.security;

import com.be.scamshield.entity.User;
import com.be.scamshield.repository.UserRepository;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.authentication.DisabledException;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AccountRestrictionTest {
    @ParameterizedTest
    @ValueSource(strings = {"SUSPENDED", "BANNED"})
    void restrictedAccountsCannotLoadPrincipalForExistingToken(String status) {
        UserRepository repository = mock(UserRepository.class);
        User user = User.builder().id(1L).status(status).build();
        when(repository.findByEmailOrPhoneNumber("user@example.test")).thenReturn(Optional.of(user));
        when(repository.findById(1L)).thenReturn(Optional.of(user));
        var service = new CustomUserDetailsService(repository);
        assertThatThrownBy(() -> service.loadUserByUsername("user@example.test")).isInstanceOf(DisabledException.class);
        assertThatThrownBy(() -> service.loadUserById(1L)).isInstanceOf(DisabledException.class);
    }
}
