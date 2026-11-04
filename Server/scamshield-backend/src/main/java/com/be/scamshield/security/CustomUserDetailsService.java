package com.be.scamshield.security;

import com.be.scamshield.entity.User;
import org.springframework.security.authentication.DisabledException;
import com.be.scamshield.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String usernameOrEmailOrPhone) throws UsernameNotFoundException {
        User user = userRepository.findByEmailOrPhoneNumber(usernameOrEmailOrPhone)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email or phone number: " + usernameOrEmailOrPhone));

        return activePrincipal(user);
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));

        return activePrincipal(user);
    }
    private UserPrincipal activePrincipal(User user) {
        if ("SUSPENDED".equalsIgnoreCase(user.getStatus()) || "BANNED".equalsIgnoreCase(user.getStatus())) {
            throw new DisabledException("Tài khoản đã bị tạm khóa hoặc bị cấm");
        }
        return UserPrincipal.create(user);
    }

}
