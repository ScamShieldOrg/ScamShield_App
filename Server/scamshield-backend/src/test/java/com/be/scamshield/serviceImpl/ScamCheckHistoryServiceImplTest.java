package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.response.ScamCheckHistoryItemResponse;
import com.be.scamshield.dto.response.ScamCheckHistoryResponse;
import com.be.scamshield.dto.response.ScamCheckRiskCountsResponse;
import com.be.scamshield.repository.CheckRequestRepository;
import com.be.scamshield.repository.ScamCheckHistoryRepository;
import com.be.scamshield.repository.ScamCheckHistoryRepository.RawCheckHistoryItem;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScamCheckHistoryServiceImplTest {

    @Mock
    private ScamCheckHistoryRepository scamCheckHistoryRepository;

    @Mock
    private CheckRequestRepository checkRequestRepository;

    @Mock
    private Clock applicationClock;

    @InjectMocks
    private ScamCheckHistoryServiceImpl service;

    private final LocalDateTime fixedNow = LocalDateTime.of(2025, 5, 16, 12, 0, 0);

    @BeforeEach
    void setUp() {
        lenient().when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        lenient().when(applicationClock.instant()).thenReturn(fixedNow.atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant());
    }

    @Test
    void getCheckHistoryMapsAll7UiItemsAccurately() {
        Long userId = 1L;

        RawCheckHistoryItem r1 = new RawCheckHistoryItem(
                1L, LocalDateTime.of(2025, 5, 12, 14, 28, 11),
                "PHONE", "\"Thông báo thuê bao sẽ bị khóa chiều sau 2 giờ do vi phạm quy định viễn thông...\"",
                "0912443882", "+84 912.443.882", "hash1",
                "PHONE", "0912443882", "+84 912.443.882",
                "Giả Mạo Viễn Thông", "VIEN_THONG", null,
                "DANGEROUS", "Lừa Đảo Nguy Cơ Cao", 98, true
        );

        RawCheckHistoryItem r2 = new RawCheckHistoryItem(
                2L, LocalDateTime.of(2025, 5, 16, 9, 14, 2),
                "URL", "Link yêu cầu tải file APK \"Dịch vụ công Bộ Công An v2.8\" giả mạo đánh cắp mã OTP.",
                "dichvucong-vneid-capnhat.gov-vn.info/apk", "https://dichvucong-vneid-capnhat.gov-vn.info/ap...", "hash2",
                "URL", "dichvucong-vneid-capnhat.gov-vn.info/apk", "https://dichvucong-vneid-capnhat.gov-vn.info/ap...",
                "Giả Mạo VNeID / Malware", "MALWARE", null,
                "DANGEROUS", "Lừa Đảo Nguy Cơ Cao", 99, false
        );

        RawCheckHistoryItem r3 = new RawCheckHistoryItem(
                3L, LocalDateTime.of(2025, 5, 15, 18, 40, 55),
                "SMS_BANK", "\"VCB Digibank: QK dang thuc hien giao dich 2,500,000 VND tai he thong POS...\"",
                "vietcombank", "SMS Brandname: Vietcombank", "hash3",
                "SMS_BANK", "vietcombank", "SMS Brandname: Vietcombank",
                "SMS Ngân Hàng Hợp Pháp", null, "Vietcombank",
                "SAFE", "An Toàn Chính Hãng", 3, false
        );

        RawCheckHistoryItem r4 = new RawCheckHistoryItem(
                4L, LocalDateTime.of(2025, 5, 14, 21, 5, 18),
                "TELEGRAM", "\"Việc nhẹ làm tại nhà 400k-800k/ngày, duyệt đơn hàng nhận hoa hồng ngay lập tức...\"",
                "@tuyendungshopeemall_hr", "Zalo/Telegram: @TuyenDungShopeeMall_HR", "hash4",
                "TELEGRAM", "@tuyendungshopeemall_hr", "Zalo/Telegram: @TuyenDungShopeeMall_HR",
                "Tuyển Dụng CTV Ảo", "VIEC_LAM", null,
                "SUSPICIOUS", "Nghi Vấn Rủi Ro", 68, false
        );

        RawCheckHistoryItem r5 = new RawCheckHistoryItem(
                5L, LocalDateTime.of(2025, 5, 13, 11, 22, 40),
                "BANK_ACCOUNT", "Tài khoản cá nhân giao dịch mua bán đồ gia dụng online trên hội nhóm mạng xã hội.",
                "104889201992", "STK: 104889201992 - VPBank (VU HOANG ANH)", "hash5",
                "BANK_ACCOUNT", "104889201992", "STK: 104889201992 - VPBank (VU HOANG ANH)",
                "Giao Dịch Dân Sự", null, null,
                "UNKNOWN", "Chưa Đủ Dữ Liệu", 15, false
        );

        RawCheckHistoryItem r6 = new RawCheckHistoryItem(
                6L, LocalDateTime.of(2025, 5, 11, 8, 35, 12),
                "TRAFFIC_FINE", "\"Cục Cảnh sát giao thông thông báo phương tiện 29A-883.xx có biên bản phạt nguội...\"",
                "tra-cuu-phatnguoi-c08.top/bienban", "http://tra-cuu-phatnguoi-c08.top/bienban", "hash6",
                "TRAFFIC_FINE", "tra-cuu-phatnguoi-c08.top/bienban", "http://tra-cuu-phatnguoi-c08.top/bienban",
                "Giả Mạo Cảnh Sát Giao Thông", "CSGT", null,
                "DANGEROUS", "Lừa Đảo Nguy Cơ Cao", 97, false
        );

        RawCheckHistoryItem r7 = new RawCheckHistoryItem(
                7L, LocalDateTime.of(2025, 5, 9, 16, 50, 33),
                "CRYPTO", "\"Nạp USDT cam kết lợi nhuận 3.5%/ngày, bảo hiểm vốn 100% bởi quỹ ủy thác...\"",
                "binance-vip-asia-trade.cc", "https://binance-vip-asia-trade.cc", "hash7",
                "CRYPTO", "binance-vip-asia-trade.cc", "https://binance-vip-asia-trade.cc",
                "Sàn Forex / Tiền Ảo", "FOREX", null,
                "DANGEROUS", "Lừa Đảo Nguy Cơ Cao", 99, false
        );

        when(scamCheckHistoryRepository.countFilteredHistory(eq(userId), any(), any(), any(), any(), any()))
                .thenReturn(38L);
        when(scamCheckHistoryRepository.findFilteredHistory(eq(userId), any(), any(), any(), any(), any(), anyInt(), anyLong()))
                .thenReturn(List.of(r1, r2, r3, r4, r5, r6, r7));

        when(scamCheckHistoryRepository.getRiskCounts(userId))
                .thenReturn(ScamCheckRiskCountsResponse.builder()
                        .all(38L).dangerous(14L).suspicious(9L).safe(11L).unknown(4L)
                        .build());

        ScamCheckHistoryResponse response = service.getCheckHistory(userId, null, "30_days", "all", "ALL", PageRequest.of(0, 10));

        assertThat(response.getItems().getData()).hasSize(7);

        // Row 1
        ScamCheckHistoryItemResponse item1 = response.getItems().getData().get(0);
        assertThat(item1.getTimestamp()).isEqualTo("12/05/2025 • 14:28:11");
        assertThat(item1.getTargetType()).isEqualTo("PHONE");
        assertThat(item1.getTargetValue()).isEqualTo("+84 912.443.882");
        assertThat(item1.getIsRetroactive()).isTrue();
        assertThat(item1.getVerdictStatus()).isEqualTo("DANGEROUS");
        assertThat(item1.getRiskScore()).isEqualTo(98);

        // Row 2
        ScamCheckHistoryItemResponse item2 = response.getItems().getData().get(1);
        assertThat(item2.getTargetType()).isEqualTo("URL");
        assertThat(item2.getVerdictStatus()).isEqualTo("DANGEROUS");
        assertThat(item2.getRiskScore()).isEqualTo(99);

        // Row 3
        ScamCheckHistoryItemResponse item3 = response.getItems().getData().get(2);
        assertThat(item3.getTargetType()).isEqualTo("SMS_BANK");
        assertThat(item3.getVerdictStatus()).isEqualTo("SAFE");
        assertThat(item3.getRiskScore()).isEqualTo(3);

        // Row 4
        ScamCheckHistoryItemResponse item4 = response.getItems().getData().get(3);
        assertThat(item4.getTargetType()).isEqualTo("TELEGRAM");
        assertThat(item4.getVerdictStatus()).isEqualTo("SUSPICIOUS");
        assertThat(item4.getRiskScore()).isEqualTo(68);

        // Row 5
        ScamCheckHistoryItemResponse item5 = response.getItems().getData().get(4);
        assertThat(item5.getTargetType()).isEqualTo("BANK_ACCOUNT");
        assertThat(item5.getVerdictStatus()).isEqualTo("UNKNOWN");
        assertThat(item5.getRiskScore()).isEqualTo(15);

        // Row 6
        ScamCheckHistoryItemResponse item6 = response.getItems().getData().get(5);
        assertThat(item6.getTargetType()).isEqualTo("TRAFFIC_FINE");
        assertThat(item6.getVerdictStatus()).isEqualTo("DANGEROUS");
        assertThat(item6.getRiskScore()).isEqualTo(97);

        // Row 7
        ScamCheckHistoryItemResponse item7 = response.getItems().getData().get(6);
        assertThat(item7.getTargetType()).isEqualTo("CRYPTO");
        assertThat(item7.getVerdictStatus()).isEqualTo("DANGEROUS");
        assertThat(item7.getRiskScore()).isEqualTo(99);

        // Summary counts
        assertThat(response.getRiskCounts().getAll()).isEqualTo(38L);
        assertThat(response.getRiskCounts().getDangerous()).isEqualTo(14L);
        assertThat(response.getRiskCounts().getSuspicious()).isEqualTo(9L);
        assertThat(response.getRiskCounts().getSafe()).isEqualTo(11L);
        assertThat(response.getRiskCounts().getUnknown()).isEqualTo(4L);
    }

    @Test
    void getRiskCountsCallsRepositoryProperly() {
        Long userId = 1L;
        when(scamCheckHistoryRepository.getRiskCounts(userId))
                .thenReturn(ScamCheckRiskCountsResponse.builder()
                        .all(38L).dangerous(14L).suspicious(9L).safe(11L).unknown(4L)
                        .build());

        ScamCheckRiskCountsResponse counts = service.getRiskCounts(userId);

        assertThat(counts.getAll()).isEqualTo(38L);
        assertThat(counts.getDangerous()).isEqualTo(14L);
        assertThat(counts.getSuspicious()).isEqualTo(9L);
        assertThat(counts.getSafe()).isEqualTo(11L);
        assertThat(counts.getUnknown()).isEqualTo(4L);
    }

    @Test
    void deleteHistoryItemsCallsRepositorySoftDelete() {
        Long userId = 1L;
        List<Long> ids = List.of(1L, 2L, 3L);

        service.deleteHistoryItems(userId, ids);

        verify(checkRequestRepository).softDeleteByIds(eq(userId), eq(ids));
    }
}
