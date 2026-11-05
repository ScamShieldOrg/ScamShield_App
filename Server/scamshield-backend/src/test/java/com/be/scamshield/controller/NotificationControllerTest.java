package com.be.scamshield.controller;

import com.be.scamshield.constant.NotificationType;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.response.NotificationItemResponse;
import com.be.scamshield.dto.response.NotificationListResponse;
import com.be.scamshield.dto.response.NotificationTabCountsResponse;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.INotificationService;
import com.be.scamshield.serviceImpl.NotificationStreamService;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;

@WebMvcTest(NotificationController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class NotificationControllerTest {
    @MockitoBean private NotificationStreamService streams;

    private static final String BASE_URL = "/api/notifications";

    @MockitoBean
    private INotificationService notificationService;

    @MockitoBean
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Autowired
    private MockMvc mvc;

    private UsernamePasswordAuthenticationToken auth;

    @BeforeEach
    void setUp() {
        UserPrincipal userPrincipal = UserPrincipal.builder()
                .id(1L)
                .username("tuananh@example.com")
                .email("tuananh@example.com")
                .role("REGISTERED_USER")
                .build();

        auth = new UsernamePasswordAuthenticationToken(userPrincipal, null, userPrincipal.getAuthorities());
    }

    @Test
    void getNotificationsReturnsPaginatedListAndTabCounts() throws Exception {
        NotificationItemResponse item = NotificationItemResponse.builder()
                .id(1L)
                .title("Báo cáo #RPT-8492 đã được phê duyệt")
                .desc("Đã thẩm định và đưa số 089.842.XXXX vào Blacklist quốc gia (+50 điểm Sentinel).")
                .message("Đã thẩm định và đưa số 089.842.XXXX vào Blacklist quốc gia (+50 điểm Sentinel).")
                .time("15 phút trước")
                .createdAt(LocalDateTime.now().minusMinutes(15))
                .unread(true)
                .isRead(false)
                .type(NotificationType.REPORT)
                .referenceId(8492L)
                .dotColor("bg-emerald-500")
                .icon("SealCheck")
                .iconBg("bg-emerald-50 dark:bg-emerald-900/30")
                .iconColor("text-emerald-500")
                .build();

        PaginatedResponse<NotificationItemResponse> paginated = new PaginatedResponse<>();
        paginated.setData(List.of(item));
        paginated.setCurrentPage(0);
        paginated.setPageSize(10);
        paginated.setTotalItems(12);
        paginated.setTotalPages(2);
        paginated.setHasNext(true);
        paginated.setHasPrevious(false);

        NotificationTabCountsResponse tabCounts = NotificationTabCountsResponse.builder()
                .all(12)
                .report(6)
                .dispute(2)
                .system(4)
                .unread(3)
                .build();

        NotificationListResponse response = NotificationListResponse.builder()
                .notifications(paginated)
                .tabCounts(tabCounts)
                .build();

        when(notificationService.getNotifications(eq(1L), any(), any(), any()))
                .thenReturn(response);

        mvc.perform(get(BASE_URL).with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.notifications.data[0].id").value(1))
                .andExpect(jsonPath("$.data.notifications.data[0].title").value("Báo cáo #RPT-8492 đã được phê duyệt"))
                .andExpect(jsonPath("$.data.notifications.data[0].unread").value(true))
                .andExpect(jsonPath("$.data.notifications.data[0].time").value("15 phút trước"))
                .andExpect(jsonPath("$.data.tabCounts.all").value(12))
                .andExpect(jsonPath("$.data.tabCounts.report").value(6))
                .andExpect(jsonPath("$.data.tabCounts.dispute").value(2))
                .andExpect(jsonPath("$.data.tabCounts.system").value(4))
                .andExpect(jsonPath("$.data.tabCounts.unread").value(3));
    }

    @Test
    void userNotificationsAliasEndpointWorks() throws Exception {
        when(notificationService.getNotifications(eq(1L), any(), any(), any()))
                .thenReturn(NotificationListResponse.builder().build());

        mvc.perform(get("/api/user/notifications").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }

    @Test
    void getTabCountsReturnsValidBreakdown() throws Exception {
        NotificationTabCountsResponse counts = NotificationTabCountsResponse.builder()
                .all(12)
                .report(6)
                .dispute(2)
                .system(4)
                .unread(3)
                .build();

        when(notificationService.getTabCounts(1L)).thenReturn(counts);

        mvc.perform(get(BASE_URL + "/tab-counts").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.all").value(12))
                .andExpect(jsonPath("$.data.report").value(6))
                .andExpect(jsonPath("$.data.dispute").value(2))
                .andExpect(jsonPath("$.data.system").value(4))
                .andExpect(jsonPath("$.data.unread").value(3));
    }

    @Test
    void getUnreadCountReturnsCount() throws Exception {
        when(notificationService.getUnreadCount(1L)).thenReturn(3L);

        mvc.perform(get(BASE_URL + "/unread-count").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data").value(3));
    }

    @Test
    void getNotificationsRejectsNegativePage() throws Exception {
        mvc.perform(get(BASE_URL)
                        .with(authentication(auth))
                        .param("page", "-1"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getNotificationsRejectsZeroSize() throws Exception {
        mvc.perform(get(BASE_URL)
                        .with(authentication(auth))
                        .param("size", "0"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void markAllAsReadCallsService() throws Exception {
        mvc.perform(patch(BASE_URL + "/read-all").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));

        verify(notificationService).markAllAsRead(1L);
    }

    @Test
    void markAsReadCallsService() throws Exception {
        mvc.perform(patch(BASE_URL + "/1/read").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));

        verify(notificationService).markAsRead(1L, 1L);
    }
    @Test
    void streamIsScopedToAuthenticatedUser() throws Exception {
        when(streams.subscribe(1L)).thenReturn(new SseEmitter(1000L));
        mvc.perform(get(BASE_URL + "/stream").with(authentication(auth)))
                .andExpect(status().isOk()).andExpect(request().asyncStarted());
        verify(streams).subscribe(1L);
    }

    @Test
    void streamRejectsAnonymousCaller() throws Exception {
        mvc.perform(get(BASE_URL + "/stream")).andExpect(status().isUnauthorized());
    }

}
