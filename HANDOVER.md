# 📋 PROJECT HANDOVER DOCUMENTATION

**Branch:** `feature/scam-check-fullstack-core`  
**Pull Request:** [#63 - [FEAT][FULLSTACK] Implement Scam Check Core Engine & Citizen-Centric Advisory UI](https://github.com/ScamShieldOrg/ScamShield_App/pull/63)  
**Target Branch:** `dev`  
**Date:** November 5, 2026  
**Status:** ✅ CI Passed (Green) | ✅ CodeRabbit Discussions Resolved | Ready for Peer Review & Merge  

---

## 1. 🎯 Executive Summary & Context

Tài liệu này bàn giao toàn bộ các thay đổi trong đợt phát triển tính năng **Kiểm tra lừa đảo (Scam Check Fullstack Core & Citizen Advisory UI)**.

### Bối cảnh & Mục tiêu chính:
1. **Hợp nhất Fullstack**: Tích hợp đồng bộ cả **Backend Spring Boot** (Core Scam Check Engine, Session & Quota Management, Partner Verification, AI Bridge Client) và **Frontend Next.js** (Citizen-Centric Advisory UI) vào một nhánh duy nhất để giải quyết triệt để vấn đề diff bị phân mảnh trên PR #62 cũ.
2. **Loại bỏ 100% Mock Data**: Xóa bỏ các tập dữ liệu giả lập (`CANONICAL_SCENARIOS`, dummy keywords, hard-coded foreign-server claims, hard-coded Vietcombank domain comparisons). Toàn bộ dữ liệu hiển thị trên UI hiện nay đều phản ánh trung thực từ phản hồi API thời gian thực.
3. **Tuân thủ chuẩn Accessibility & Architecture**: Đưa trang `/user/check` về mô hình **Thin Server Component** chuẩn Next.js (có metadata SEO/a11y), chuyển logic state sang feature client component (`user-scam-check.tsx`), bổ sung các thuộc tính hỗ trợ screen-reader (`role="alert"`, `aria-live="polite"`).
4. **Chuẩn hóa Testing & CI Green**: Tích hợp lớp cơ sở `PostgresIntegrationTest` (sử dụng Testcontainers PostgreSQL 16) cho toàn bộ integration test suite của Scam Check, khắc phục triệt để lỗi kết nối fallback `127.0.0.1:1` trên GitHub Actions.

---

## 2. 🏗️ Chi tiết các thay đổi kỹ thuật (Changelog)

### A. Backend Core (`Server/scamshield-backend`)

| File / Component | Mô tả thay đổi |
| :--- | :--- |
| `controller/ScamCheckController.java` | Endpoint công khai `POST /api/scam-checks` và `GET /api/scam-checks/{id}` hỗ trợ cả Guest Session token (`X-Guest-Session`) và User JWT. |
| `serviceImpl/ScamCheckServiceImpl.java` | Điều phối luồng kiểm tra: đặt chỗ hạn mức (quota reservation), bóc tách IoC, đối soát danh sách whitelist/blacklist, gọi AI Bridge, ghi nhận verdict vào DB, và tự động hoàn trả quota nếu giao dịch lỗi. |
| `serviceImpl/ScamCheckDecisionService.java` | Bộ ra quyết định: phân loại nhanh Tier 1 (Rule-based & Whitelist), định tuyến sang AI Client khi không có đối soát xác định. |
| `serviceImpl/ScamCheckQuotaService.java` | Quản lý hạn mức theo ngày dựa trên Redis/DB counter cho từng loại đối tượng (User hạng danh tiếng hoặc Guest). |
| `external/ScamCheckAiClient.java` | HTTP Client kết nối FastAPI AI Bridge, chuẩn hóa phản hồi (`normalizeRisk`), trích xuất snapshot AI (`ScamCheckAiDetails`), bảo vệ quyền riêng tư (loại bỏ telemetry/raw input khỏi log). |
| `constant/ScamVerdict.java` | Chuẩn hóa tập nhãn verdict công khai: `SCAM_RISK`, `LOW_RISK`, và `UNKNOWN` (tri-state caution). |
| `support/PostgresIntegrationTest.java` | Lớp base testcontainer PostgreSQL được kế thừa bởi `GuestQuotaControllerTest`, `ScamCheckAiIntegrationTest`, `ScamCheckControllerTest`, và `ScamCheckPersistenceTest`. |
| `ScamCheckAiIntegrationTest.java` | Cập nhật assertion test fixture sang `SCAM_RISK` để kiểm thử toàn vẹn nhánh rủi ro cao với `riskScore: 68` và snapshot hội đồng AI. |
| `ScamCheckQuotaServiceTest.java` | Bổ sung test kiểm thử trực tiếp phương thức `releaseReservation(key)` khi gặp ngoại lệ. |

### B. Frontend Advisory UI (`UI/src/...`)

| File / Component | Mô tả thay đổi |
| :--- | :--- |
| `app/(user)/user/check/page.tsx` | Chuyển thành **Server Component** mỏng đóng vai trò composition root, export `metadata` (`title: "Kiểm Tra Lừa Đảo \| ScamShield"`). |
| `components/features/check/user-scam-check.tsx` | Feature client component quản lý state (`result`, `isLoading`, `error`), gọi API, bọc an toàn trợ năng (`role="alert"`, `aria-live="polite"`). |
| `components/features/check/scam-check-input.tsx` | Form nhập liệu 4 tab (Văn bản, URL, SĐT, OCR). Loại bỏ triệt để đoạn duplicate function header (lines 53-63), hỗ trợ dán nhanh/xóa nhanh, khóa submit trên tab OCR kèm thông báo tính năng đang hoàn thiện. |
| `components/features/check/scam-verdict-banner.tsx` | Hiển thị kết luận rủi ro theo tri-state banner. Sửa thứ tự ưu tiên nhận diện ngân hàng (ưu tiên Techcombank trước MB), dùng regex ranh giới từ `/\bmb\b/i`, `/\bacb\b/i`, bỏ phát ngôn sai lệch "tại thiết bị". |
| `components/features/check/scam-evidence-card.tsx` | Thẻ phân tích bằng chứng. Xóa bỏ dòng so sánh cứng Vietcombank (`vietcombank.com.vn`), điều chỉnh diễn giải URL theo danh sách xác minh thực tế, thêm defensive null guard cho token weight và detected URLs. |
| `features/check/services/check.service.ts` | Định tuyến toàn bộ scan qua Spring Boot `/api/scam-checks` (bỏ gọi trực tiếp từ browser tới port 8001 để đảm bảo quota & persistence), đo latency thực tế bằng `performance.now()`, hiển thị thông báo lỗi chi tiết từ server (như 429 quota exhausted). |
| `features/check/types/check.types.ts` | Bổ sung `SERVER_PIPELINE` vào `RuntimeType`, định nghĩa đầy đủ interface `Verdict`, `CheckScanResponse`, `DeterministicFeatures`. |

---

## 3. 🧪 Ma trận kiểm thử & Trạng thái nghiệm thu (Verification Matrix)

| Hạng mục kiểm thử | Công cụ / Lệnh kiểm tra | Kết quả | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Backend Test Compilation** | `./mvnw test-compile` | ✅ `BUILD SUCCESS` | Biên dịch thành công 309 source files, 70 test files. |
| **Backend Unit & Integration Tests** | `./mvnw test` | ✅ `BUILD SUCCESS` | Testcontainers PostgreSQL chạy cô lập schema, pass 100%. |
| **Frontend TypeScript Checking** | `npx tsc --noEmit` | ✅ 0 errors | Khớp 100% contracts và types giữa Service, Hook và Component. |
| **Frontend Next.js Production Build** | `npm run build` | ✅ Compiled (45/45 routes) | Route `/user/check` được prerender tối ưu dạng static page. |
| **GitHub Actions CI Pipeline** | Workflow `backend-tests.yml` | ✅ All checks passed | Xanh hoàn toàn trên commit `c65b9a0`. |
| **CodeRabbit Review Status** | AI Peer Reviewer | ✅ All conversations resolved | Không còn blocker hoặc warning ngoài diff. |

---

## 4. ⚙️ Hướng dẫn cài đặt & Cấu hình môi trường (Environment Setup)

### Yêu cầu hệ thống:
- **Java**: OpenJDK 21 LTS
- **Node.js**: v20+ / npm v10+ hoặc pnpm
- **Docker**: Yêu cầu cài đặt và chạy Docker Engine khi chạy local test suite backend (để Testcontainers spin up container PostgreSQL).

### Biến môi trường Frontend (`UI/.env.local`):
```ini
NEXT_PUBLIC_BE_URL=http://localhost:8080/api
```
*(Lưu ý: Không cần cấu hình `NEXT_PUBLIC_AI_API_URL` ở client nữa, vì toàn bộ scan đã được chuyển qua Backend Core để kiểm soát hạn mức và bảo mật).*

### Chạy kiểm thử nhanh cục bộ:
```bash
# 1. Kiểm tra Backend
cd Server/scamshield-backend
./mvnw clean test-compile
./mvnw test -Dtest=ScamCheckAiClientTest,ScamCheckQuotaServiceTest

# 2. Kiểm tra Frontend
cd ../../UI
npm run typecheck # hoặc npx tsc --noEmit
npm run build
```

---

## 5. 📌 Lưu ý & Đề xuất cho đợt phát triển tiếp theo (Next Steps)

1. **Tính năng OCR Ảnh chụp màn hình**:
   - Hiện tại tab OCR đang được khóa nút Phân tích và hiển thị thông báo "Tính năng OCR đang được hoàn thiện".
   - Bước tiếp theo: Triển khai upload file `MultipartFile` lên endpoint Backend `/api/scam-checks/ocr` để chuyển tiếp qua dịch vụ bóc tách OCR quang học thực tế trước khi gửi text vào pipeline.
2. **Cấu hình Redis Quota trên Production**:
   - Khi deploy lên staging/production, kích hoạt cấu hình `spring.data.redis` trong `application-prod.yml` để sử dụng Redis Cluster cho việc rate-limit và đếm quota đồng thời với hiệu năng cao.
3. **Theo dõi duyệt PR**:
   - PR #63 tuân thủ đúng chính sách nhánh `dev` của repository. Cần 2 lượt Approve từ các thành viên / Reviewers có thẩm quyền để tiến hành Merge.

---
*Người lập tài liệu: Antigravity Coding Assistant (Pair Programmer)*  
*Kho mã nguồn: [ScamShieldOrg/ScamShield_App](https://github.com/ScamShieldOrg/ScamShield_App)*
