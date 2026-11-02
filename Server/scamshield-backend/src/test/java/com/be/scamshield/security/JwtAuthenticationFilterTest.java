package com.be.scamshield.security;

import io.jsonwebtoken.JwtException;
import org.springframework.security.authentication.DisabledException;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class JwtAuthenticationFilterTest {

    private final JwtTokenProvider tokenProvider = mock(JwtTokenProvider.class);
    private final CustomUserDetailsService customUserDetailsService = mock(CustomUserDetailsService.class);
    private final JwtAuthenticationEntryPoint unauthorizedHandler = mock(JwtAuthenticationEntryPoint.class);
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(
            tokenProvider,
            customUserDetailsService,
            unauthorizedHandler
    );

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/auth/logout", "/api/auth/login"})
    void authPathsContinueWithoutAuthenticationFailureHandlingWhenBearerTokenIsInvalid(String path) throws Exception {
        MockHttpServletRequest request = requestWithBearerToken(path);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);
        when(tokenProvider.getUsernameFromJWT("bad-token")).thenThrow(new JwtException("bad token"));

        filter.doFilter(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        verify(unauthorizedHandler, never()).commence(any(), any(), any());
        verify(customUserDetailsService, never()).loadUserByUsername(any());
    }

    @Test
    void securedPathsStillUseAuthenticationFailureHandlingWhenBearerTokenIsInvalid() throws Exception {
        MockHttpServletRequest request = requestWithBearerToken("/api/users/me");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);
        when(tokenProvider.getUsernameFromJWT("bad-token")).thenThrow(new JwtException("bad token"));

        filter.doFilter(request, response, filterChain);

        verify(filterChain, never()).doFilter(any(), any());
        verify(unauthorizedHandler).commence(any(), any(), any());
    }

    @Test
    void existingTokenOfRestrictedAccountCannotReachSecuredEndpoint() throws Exception {
        MockHttpServletRequest request = requestWithBearerToken("/api/users/me");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        when(tokenProvider.getUsernameFromJWT("bad-token")).thenReturn("restricted@example.test");
        when(customUserDetailsService.loadUserByUsername("restricted@example.test"))
                .thenThrow(new DisabledException("Tài khoản bị khóa"));
        filter.doFilter(request, response, chain);
        verify(chain, never()).doFilter(any(), any());
        verify(unauthorizedHandler).commence(any(), any(), any());
    }

    private MockHttpServletRequest requestWithBearerToken(String path) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.addHeader("Authorization", "Bearer bad-token");
        return request;
    }
}
