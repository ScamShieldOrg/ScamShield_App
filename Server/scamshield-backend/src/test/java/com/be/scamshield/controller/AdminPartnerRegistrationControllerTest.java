package com.be.scamshield.controller;

import com.be.scamshield.dto.admin.AdminPartnerRegistrationCountsResponse;
import com.be.scamshield.external.ScamCheckAiClient;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.AdminPartnerRegistrationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:scamshield-admin-review;MODE=PostgreSQL;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminPartnerRegistrationControllerTest {
    @Autowired private MockMvc mvc;
    @MockitoBean private AdminPartnerRegistrationService service;
    @MockitoBean private ScamCheckAiClient scamCheckAiClient;

    @Test
    void anonymousCannotReadApplications() throws Exception {
        mvc.perform(get("/api/admin/partner-registrations/counts"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void normalUserCannotReadApplications() throws Exception {
        mvc.perform(get("/api/admin/partner-registrations/counts").with(user(principal("REGISTERED_USER"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void administratorReceivesWrappedCounts() throws Exception {
        when(service.counts()).thenReturn(new AdminPartnerRegistrationCountsResponse(2, 3, 1));
        mvc.perform(get("/api/admin/partner-registrations/counts").with(user(principal("ADMINISTRATOR"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.pending").value(2));
    }

    private UserPrincipal principal(String role) {
        User account = User.builder().id(1L).fullName("Admin").email("admin@example.com")
                .phoneNumber("0912345678").passwordHash("unused")
                .role(Role.builder().name(role).build()).status("ACTIVE").build();
        return UserPrincipal.create(account);
    }
}
