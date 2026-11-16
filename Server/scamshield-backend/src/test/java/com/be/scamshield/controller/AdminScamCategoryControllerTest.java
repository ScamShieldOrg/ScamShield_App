package com.be.scamshield.controller;

import com.be.scamshield.dto.admin.AdminScamCategoryResponse;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.exception.ScamCategoryConflictException;
import com.be.scamshield.external.ScamCheckAiClient;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IAdminScamCategoryService;
import com.be.scamshield.support.PostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminScamCategoryControllerTest extends PostgresIntegrationTest {
    private static final String BASE = "/api/admin/scam-categories";
    @Autowired private MockMvc mvc;
    @MockitoBean private IAdminScamCategoryService service;
    @MockitoBean private ScamCheckAiClient scamCheckAiClient;

    @Test
    void onlyAdministratorCanUseCategoryEndpoints() throws Exception {
        mvc.perform(get(BASE)).andExpect(status().isUnauthorized());
        mvc.perform(post(BASE).contentType(MediaType.APPLICATION_JSON).content(validCreate()))
                .andExpect(status().isUnauthorized());
        mvc.perform(put(BASE + "/1").contentType(MediaType.APPLICATION_JSON).content(validUpdate()))
                .andExpect(status().isUnauthorized());
        mvc.perform(get(BASE).with(user(principal("REGISTERED_USER"))))
                .andExpect(status().isForbidden());
        mvc.perform(post(BASE).with(user(principal("MODERATOR")))
                .contentType(MediaType.APPLICATION_JSON).content(validCreate()))
                .andExpect(status().isForbidden());
        mvc.perform(put(BASE + "/1").with(user(principal("MODERATOR")))
                .contentType(MediaType.APPLICATION_JSON).content(validUpdate()))
                .andExpect(status().isForbidden());
    }

    @Test
    void administratorReceivesWrappedListAndCanCreateAndUpdate() throws Exception {
        AdminScamCategoryResponse category = AdminScamCategoryResponse.builder()
                .id(1L).code("1").name("Lừa đảo việc làm")
                .description("Tuyển dụng giả").isActive(true).version(1)
                .approvedReportCount(3L).build();
        when(service.list()).thenReturn(List.of(category));
        when(service.create(any(), eq(5L))).thenReturn(category);
        when(service.update(eq(1L), any(), eq(5L))).thenReturn(category);
        var admin = user(principal("ADMINISTRATOR"));

        mvc.perform(get(BASE).with(admin)).andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data[0].isActive").value(true))
                .andExpect(jsonPath("$.data[0].approvedReportCount").value(3));
        mvc.perform(post(BASE).with(user(principal("ADMINISTRATOR")))
                .contentType(MediaType.APPLICATION_JSON).content(validCreate()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.code").value("1"));
        mvc.perform(put(BASE + "/1").with(user(principal("ADMINISTRATOR")))
                .contentType(MediaType.APPLICATION_JSON).content(validUpdate()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.version").value(1));
    }

    @Test
    void invalidAndMissingAndStaleRequestsUseStandardErrors() throws Exception {
        mvc.perform(post(BASE).with(user(principal("ADMINISTRATOR")))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"  \",\"description\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.isSuccess").value(false));
        when(service.update(eq(999L), any(), eq(5L)))
                .thenThrow(new ResourceNotFoundException("Không tìm thấy phân loại lừa đảo"));
        when(service.update(eq(1L), any(), eq(5L)))
                .thenThrow(new ScamCategoryConflictException("Phân loại đã được cập nhật"));
        mvc.perform(put(BASE + "/999").with(user(principal("ADMINISTRATOR")))
                .contentType(MediaType.APPLICATION_JSON).content(validUpdate()))
                .andExpect(status().isNotFound());
        mvc.perform(put(BASE + "/1").with(user(principal("ADMINISTRATOR")))
                .contentType(MediaType.APPLICATION_JSON).content(validUpdate()))
                .andExpect(status().isConflict());
    }

    private String validCreate() {
        return "{\"name\":\"Lừa đảo việc làm\",\"description\":\"Tuyển dụng giả\"}";
    }

    private String validUpdate() {
        return "{\"name\":\"Lừa đảo việc làm\",\"description\":\"Tuyển dụng giả\",\"isActive\":false,\"version\":1}";
    }

    private UserPrincipal principal(String role) {
        return UserPrincipal.create(User.builder().id(5L).fullName("Admin")
                .email("admin@example.com").phoneNumber("0912345678")
                .passwordHash("unused").status("ACTIVE")
                .role(Role.builder().name(role).build()).build());
    }
}
