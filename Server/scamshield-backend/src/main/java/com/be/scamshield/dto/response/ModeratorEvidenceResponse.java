package com.be.scamshield.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.time.LocalDateTime;
import com.be.scamshield.constant.EvidenceAnalysisStatus;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Bằng chứng đính kèm trong ca kiểm duyệt")
public class ModeratorEvidenceResponse {

    @Schema(description = "Mã định danh bằng chứng hiển thị", example = "ev-1")
    private String id;

    @Schema(description = "ID gốc trong cơ sở dữ liệu", example = "1")
    private Long rawId;

    @Schema(description = "Tên tệp bằng chứng", example = "screenshot_1.jpg")
    private String name;

    @Schema(description = "Loại tệp bằng chứng (image, video, pdf)", example = "image")
    private String type;

    @Schema(description = "Đường dẫn tải tệp", example = "https://example.com/evidences/screenshot_1.jpg")
    private String url;

    @Schema(description = "Đường dẫn tải xuống tệp, buộc trình duyệt tải thay vì mở nội tuyến")
    private String downloadUrl;

    @Schema(description = "Có hash để đối chiếu file giống hệt; chỉ dùng hỗ trợ quyết định")
    private boolean duplicateCheckAvailable;
    private long duplicateCount;
    private List<DuplicateEvidence> duplicates;
    @Schema(description = "Trạng thái xử lý pHash/OCR, không phải kết luận minh chứng thật hay giả")
    private EvidenceAnalysisStatus analysisStatus;
    private String analysisMessage;
    private LocalDateTime analyzedAt;
    private boolean imageFingerprintAvailable;
    private boolean ocrTextAvailable;
    private long similarEvidenceCount;
    @Schema(description = "Tối đa 20 minh chứng gần giống; PHASH là ảnh tương tự, OCR_TEXT là nội dung chữ tương tự; điểm từ 0 đến 1")
    private List<SimilarEvidence> similarEvidences;

    public record SimilarEvidence(Long evidenceId, Long reportId, String reportStatus, LocalDateTime createdAt,
                                  boolean sameReporter, List<String> matchTypes, Double imageSimilarity, Double textSimilarity) { }
    public record DuplicateEvidence(Long evidenceId, Long reportId, String reportStatus,
                                    LocalDateTime createdAt, boolean sameReporter) { }

}
