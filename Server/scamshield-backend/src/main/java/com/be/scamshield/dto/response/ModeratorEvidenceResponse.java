package com.be.scamshield.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
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
}
