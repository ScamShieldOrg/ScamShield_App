package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.BlacklistResourceFilterRequest;
import com.be.scamshield.dto.request.WhitelistResourceFilterRequest;
import com.be.scamshield.dto.response.BlacklistResourceResponse;
import com.be.scamshield.dto.response.WhitelistResourceResponse;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.service.IResourceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ResourceController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class ResourceControllerTest {
    @Autowired
    private MockMvc mvc;
    @MockitoBean
    private IResourceService service;
    @MockitoBean
    private JwtTokenProvider tokenProvider;
    @MockitoBean
    private CustomUserDetailsService userDetailsService;

    @Test
    void blacklistImageUrlIsAvailableWithoutAuthenticationAndIsNotCached() throws Exception {
        when(service.getBlackListImageUrl(4L)).thenReturn("https://example.test/signed.jpg");
        mvc.perform(get("/api/resources/blacklist/4/image"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.data").value("https://example.test/signed.jpg"));
    }

    @Test
    void blacklistBindsFiltersAndReturnsPaginatedItemsWithoutAuthentication() throws Exception {
        var item = BlacklistResourceResponse.builder().id(3L).title("0900000000").severity("HIGH").build();
        when(service.getBlackListResources(any())).thenReturn(
                new PaginatedResponse<>(List.of(item), 1, 12, 3, 5, true, true));

        mvc.perform(get("/api/resources/blacklist")
                        .param("page", "1").param("size", "5")
                        .param("keyword", "0900").param("resourceType", "PHONE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.data[0].id").value(3))
                .andExpect(jsonPath("$.data.data[0].severity").value("HIGH"))
                .andExpect(jsonPath("$.data.currentPage").value(1))
                .andExpect(jsonPath("$.data.totalItems").value(12));

        var captor = ArgumentCaptor.forClass(BlacklistResourceFilterRequest.class);
        verify(service).getBlackListResources(captor.capture());
        assertThat(captor.getValue().getPage()).isEqualTo(1);
        assertThat(captor.getValue().getSize()).isEqualTo(5);
        assertThat(captor.getValue().getKeyword()).isEqualTo("0900");
        assertThat(captor.getValue().getResourceType()).isEqualTo("PHONE");
    }

    @Test
    void whitelistBindsFiltersAndWrapsPaginatedItems() throws Exception {
        var item = WhitelistResourceResponse.builder().id(8L).name("Verified partner").build();
        when(service.getWhiteListResources(any())).thenReturn(
                new PaginatedResponse<>(List.of(item), 0, 1, 1, 10, false, false));

        mvc.perform(get("/api/resources/whitelist")
                        .param("keyword", "partner").param("sortBy", "name"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.data[0].name").value("Verified partner"))
                .andExpect(jsonPath("$.data.totalItems").value(1));

        var captor = ArgumentCaptor.forClass(WhitelistResourceFilterRequest.class);
        verify(service).getWhiteListResources(captor.capture());
        assertThat(captor.getValue().getPage()).isZero();
        assertThat(captor.getValue().getSize()).isEqualTo(10);
        assertThat(captor.getValue().getKeyword()).isEqualTo("partner");
        assertThat(captor.getValue().getSortBy()).isEqualTo("name");
    }

    @ParameterizedTest
    @CsvSource({"/api/resources/blacklist,page,-1", "/api/resources/blacklist,size,0",
            "/api/resources/blacklist,resourceType,phone", "/api/resources/whitelist,page,-1",
            "/api/resources/whitelist,size,51", "/api/resources/whitelist,sortBy,unknown"})
    void rejectsInvalidFiltersBeforeCallingService(String path, String field, String value) throws Exception {
        mvc.perform(get(path).param(field, value)).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
