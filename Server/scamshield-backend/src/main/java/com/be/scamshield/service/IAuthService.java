package com.be.scamshield.service;

import com.be.scamshield.dto.AuthResponse;
import com.be.scamshield.dto.ChangePasswordRequest;
import com.be.scamshield.dto.LoginRequest;
import com.be.scamshield.dto.UserDto;
import com.be.scamshield.dto.request.LoginGoogleRequest;
import com.be.scamshield.dto.request.RegisterGoogleRequest;
import com.be.scamshield.dto.request.RegisterPersonalRequest;
import jakarta.servlet.http.HttpServletResponse;

public interface IAuthService {

    /**
     * Registers a new personal user account.
     */
    void registerPersonal(RegisterPersonalRequest request);

    /**
     * Registers a new user account via Google ID Token with phone verification.
     * Generates JWT access token and sets refresh token in HttpOnly cookie.
     */
    AuthResponse registerGoogle(RegisterGoogleRequest request, HttpServletResponse response);

    /**
     * Registers a new user account via Google ID Token without setting cookies.
     */
    default void registerGoogle(RegisterGoogleRequest request) {
        registerGoogle(request, null);
    }

    /**
     * Authenticates user using Google ID Token.
     * Sets refresh token in HttpOnly cookie.
     */
    AuthResponse loginGoogle(LoginGoogleRequest request, HttpServletResponse response);

    /**
     * Authenticates user with username, email, or phone number and password.
     * Sets refresh token in HttpOnly cookie.
     */
    AuthResponse login(LoginRequest request, HttpServletResponse response);

    /**
     * Exchanges a valid refresh token cookie for a new access token.
     */
    AuthResponse refreshToken(String refreshToken, HttpServletResponse response);

    /**
     * Changes the authenticated user's password.
     */
    void changePassword(String currentUsername, ChangePasswordRequest request);

    /**
     * Logs out the user by invalidating refresh tokens and clearing HttpOnly cookie.
     */
    void logout(String refreshToken, String currentUsername, HttpServletResponse response);

    /**
     * Gets profile details of the currently authenticated user.
     */
    UserDto getCurrentUserProfile(String currentUsername);
}
