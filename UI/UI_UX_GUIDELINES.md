# ScamShield VN — Hướng Dẫn Thiết Kế & Nâng Cấp UI/UX Cho Các Main Flow

> Tài liệu chuẩn hóa bộ nguyên tắc UI/UX, chiều sâu thị giác, tương tác và quy trình kiểm chứng đã được kiểm nghiệm thành công trên **Main Flow Scam Check** và **User Sidebar** — dùng làm chuẩn áp dụng nhất quán cho các luồng tiếp theo (History, Reports, Disputes, Blacklist/Whitelist, Moderator, Admin, Partner).

---

## 1. Triết Lý Cốt Lõi & Định Hướng (North Star)

Kết hợp **5 trụ cột chất lượng** (*Clear → Precise → Efficient → Durable → Delightful*), ngôn ngữ thẩm mỹ **Claude Web + Railway Tactile Depth**, và bộ quy chuẩn **UX / WCAG 2.2 / React** (`ui-ux-pro-max-skill`):

1. **Good Design = Good Consideration:** Mọi chi tiết người dùng *không phải suy nghĩ* là một quyết định ta đã cân nhắc kỹ thay họ; mọi sự bối rối họ gặp là một quyết định bị bỏ sót.
2. **Công cụ tốt nhất là công cụ "biến mất":** Giao diện không khoe hiệu ứng phô trương mà dẫn người dùng hoàn thành mục tiêu trơn tru rồi nhường chỗ cho nội dung.
3. **Thứ tự ưu tiên bắt buộc:** Chạy đúng nghiệp vụ trước → **Clear** → **Precise** → **Efficient** → **Durable** → **Delightful**.
4. **Bài test 100 lần dùng:** Mọi animation, màu sắc, và luồng thao tác phải vẫn dễ chịu, nhanh và không gây mỏi mắt sau 100 lần sử dụng lặp lại.

---

## 2. Hệ Quy Chuẩn Thị Giác & Chiều Sâu (Visual System)

### 2.1. Typography & Độ Rộng Đọc
- **Font chữ:** Dùng `font-sans antialiased` cho nội dung UI (áp dụng cục bộ trên wrapper của flow nếu chưa đổi global để tránh ảnh hưởng flow khác), `font-heading` cho tiêu đề với `tracking-[-0.02em]` đến `tracking-[-0.025em]`, `font-mono` chỉ dùng cho mã định danh, URL, số điện thoại, số tài khoản, thời gian phản hồi.
- **Cỡ chữ tối thiểu (WCAG thân thiện cả người lớn tuổi):**
  - Nội dung chính, ô nhập liệu, danh sách hành động: **`text-sm` (`14px`)** hoặc `15px`, `leading-relaxed` (`1.65`).
  - Label, metadata, badge, phụ đề nhỏ: **`text-xs` (`12px`)**.
  - **CẤM tuyệt đối** `text-[10px]` và `text-[11px]` trên mọi nội dung người dùng cần đọc.
- **Số liệu động:** Bắt buộc gắn `tabular-nums` cho mọi con số (hạn mức `remaining/limit`, bộ đếm ký tự, đồng hồ giây, điểm rủi ro `/100`, độ trễ `ms`, badge số lượng chưa đọc) để chống rung ngang.
- **Độ rộng dòng đọc:** Giới hạn văn bản mô tả ở `max-w-[60ch]`–`max-w-[65ch]`; các trang dạng form/tool/verdict giữ khung trung tâm `max-w-3xl` (`768px`) để không bị kéo dãn loãng trên màn hình rộng.

### 2.2. Hệ Lưới & Bo Góc
- **Lưới `4px / 8px`:** Mọi padding, gap, margin đều là bội số của `4px` (`4, 8, 12, 16, 20, 24, 32, 48px`).
- **Thống nhất 3 mức bo góc:**
  - `rounded-md` (`6px`): badge, chip nhỏ, `<kbd>`, nút phụ gọn.
  - `rounded-lg` (`8px`): nút chính, nav item, callout, ô thông tin nhỏ.
  - `rounded-xl` (`12px`): card chính, composer nổi, popover/dropdown, modal.

### 2.3. Chiều Sâu Bề Mặt (Claude + Railway Tactile Depth)
- **Light Mode:** Nền dịu (tránh trắng gắt toàn trang) + viền `1px` sắc nét `border-black/10` + đổ bóng đa tầng mềm cho bề mặt trọng tâm:
  ```text
  shadow-[0_8px_30px_rgb(15,23,42,0.06),0_1px_2px_rgb(15,23,42,0.04)]
  ```
- **Dark Mode:** Tránh đen tuyền `#000000`; phân tầng bề mặt tối + viền `dark:border-white/10` (hoặc `/12` cho bề mặt nổi) + viền sáng specular `1px` phía trên:
  ```text
  dark:shadow-[0_16px_44px_rgb(0,0,0,0.45),inset_0_1px_0_rgb(255,255,255,0.08)]
  ```
- **Backdrop cục bộ nhẹ:** Có thể dùng dot-grid siêu mờ + quầng radial wash nhẹ phía sau vùng Hero/Composer (`pointer-events-none`, phạm vi cục bộ trong `<section>`), tuyệt đối không lạm dụng neon/gradient tím-hồng kiểu AI slop.
- **CẤM Card lồng Card:** Không đặt hộp có viền/shadow bên trong hộp có viền/shadow. Chia nhóm bên trong cùng một card bằng đường ngăn `divide-y divide-border/70` và độ sáng nền (`bg-muted/30`).

### 2.4. Màu Trạng Thái Điềm Tĩnh (Calm Authority)
- Dùng **chấm tròn `6–8px` + nền mờ `10–15%` + viền `20–25%` + chữ tương phản cao** (đạt WCAG AA ≥ 4.5:1 ở cả Light & Dark):
  - Nguy hiểm: `border-rose-500/25 bg-rose-500/10 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200`
  - Cảnh báo / Nghi vấn: `border-amber-500/25 bg-amber-500/10 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200`
  - An toàn / Xác minh: `border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200`
  - Thông tin / Trung tính: `border-sky-500/25 bg-sky-500/10 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200`
- **CẤM:**
  - Mảng màu đặc chói mắt (`bg-rose-700 text-white`, `bg-emerald-700 text-white`) cho nhãn tĩnh hoặc khung khuyến cáo không bấm được.
  - Viền màu dày bên trái/phải (`border-l-2`, `border-l-4`) trên card/alert.
  - Kicker/eyebrow pill thừa phía trên tiêu đề chính.
  - Dùng emoji hoặc ký tự Unicode (`✓`, `✗`, `⚠`) thay cho icon — luôn dùng `@phosphor-icons/react` đồng nhất.

---

## 3. Các Mẫu Tương Tác Chuẩn (Interactive Patterns)

### 3.1. Nhập Liệu Thông Minh (Effort Reduction & Step Minimization)
- **Tự suy đoán trước, cho sửa sau:** Nếu hệ thống có thể tự nhận diện loại dữ liệu, bộ lọc hoặc giá trị mặc định, hãy tự chọn sẵn dưới dạng pill gọn và cho người dùng bấm đổi tay khi cần — tránh bắt chọn qua nhiều tab/bước trước khi nhập.
- **Vị trí Popover / Dropdown hợp lý:** Component nằm ở nửa trên màn hình phải thả menu **xuống dưới (`top-full mt-2`)** để không che ô nhập hoặc đụng sticky header.
- **Gợi ý thử nhanh / Empty state hữu ích:** Thay các khung rỗng vô nghĩa lặp lại placeholder bằng 3–4 chip hành động nhanh hoặc 1 dòng ghi chú ngắn gọn.

### 3.2. Hiển Thị Kết Quả & Dữ Liệu (Workflow First & Progressive Disclosure)
- **Không lặp lại cùng một thông điệp:** Gộp kết luận chính + chỉ số trực quan + hành động cần làm ngay vào **1 khối liền mạch**, cắt bỏ các đoạn mô tả lặp giữa các card.
- **Tương tác trực tiếp trên dữ liệu:** Ưu tiên highlight/đánh dấu trực tiếp trên nội dung và cho bấm/chạm để xem lý do thay vì liệt kê tường chữ dài. Mọi phần tử giải thích phải **bấm/chạm và dùng bàn phím được** (không dùng tooltip chỉ-hover).
- **Chia tầng theo nhu cầu:**
  1. **Tầng 1 (0–3 giây):** Kết luận chính + chỉ số/trạng thái + 1 Primary CTA duy nhất.
  2. **Tầng 2 (3–15 giây):** Việc cần làm ngay (tối đa 3 ý gọn) + tương tác trực tiếp trên dữ liệu.
  3. **Tầng 3 (Khi cần):** Tab trượt `layoutId` hoặc Accordion đóng/mở cho chi tiết chuyên sâu và thông số kỹ thuật/kiểm toán.
- **1 Primary CTA duy nhất mỗi vùng:** Các nút còn lại dùng kiểu `outline` hoặc `ghost`. Tuyệt đối không tạo `<div>` có giao diện giống nút bấm (`Fake CTAs`).

### 3.3. Bền Bỉ & Chống Ngõ Cụt (Durable & Accurate Representation)
- **Undo > Confirm:** Thao tác xóa nháp / xóa mềm dùng thanh **Hoàn tác** (6–7 giây + `Ctrl+Z`) thay vì hộp thoại Confirm phiền toái. Chỉ dùng Confirm cho hành động phá hủy không thể khôi phục.
- **Zero Dead-End Errors:** Mọi trạng thái lỗi phải có (1) tiêu đề đúng ngữ cảnh (phân biệt rõ lỗi tải dữ liệu nền với lỗi gửi form), (2) nguyên nhân dễ hiểu, (3) nút **Thử lại** giữ nguyên 100% dữ liệu người dùng đã nhập.
- **Bảo toàn ngữ cảnh (Spatial Continuity):** Không xóa trắng kết quả đang xem khi người dùng lỡ gõ sửa 1 ký tự — giữ lại kèm nhãn nhẹ báo *"Nội dung đã thay đổi"*. Giữ nguyên draft/filter khi chuyển tab.
- **Trung thực với quyền hạn & trạng thái:** Ẩn hoặc ghi chú rõ ngay từ đầu các tính năng không thuộc vai trò hiện tại (ví dụ Guest không bao giờ thấy link trỏ vào `/user/...` gây redirect bất ngờ); nút chưa khả dụng phải thể hiện rõ lý do trước khi bấm.

### 3.4. Bàn Phím & Cảm Ứng (WCAG 2.2)
- Hỗ trợ phím tắt tự nhiên (`Enter` cho input đơn, `Ctrl/Cmd+Enter` cho textarea, `Escape` đóng popover, `ArrowLeft`/`ArrowRight` cho tablist).
- Vòng focus rõ ràng `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`.
- Gắn `scroll-mt-24` cho các vùng neo cuộn để không bị sticky header che mất khi focus/scroll (**Focus Not Obscured**).
- Nút bấm chạm được trên Mobile tối thiểu `min-h-10` (`40px`–`44px`), khoảng cách tối thiểu giữa các nút liền kề là `gap-2` (`8px`), số tổng đài/mã ngắn dùng `whitespace-nowrap` để không bị gãy giữa chừng.

---

## 4. Quy Chuẩn Chuyển Động (`motion` / Framer Motion)

- **Bắt buộc bọc `<MotionConfig reducedMotion="user">`** ở gốc mỗi flow có dùng `motion/react`.
- **Timing chuẩn:**
  - Hover / focus / press: `120ms`, `whileTap={{ scale: 0.97 }}`.
  - Đóng/mở popover, undo bar, error callout, tab panel: `140–220ms`, `ease: [0.16, 1, 0.3, 1]`, dịch chuyển nhỏ `y: 4–10px`.
  - Active pill ở Sidebar & Tabs: `layoutId` với `type: "spring", stiffness: 420, damping: 32`.
  - Thanh tiến trình / đồng hồ điểm: dùng `scaleX` / `pathLength` (GPU-only), tuyệt đối không animate `width`/`height`/`top`/`left` trên layout nặng.
- **Hiệu năng React:**
  - Bọc icon SVG xoay trong `<div>` wrapper (`<div className="motion-safe:animate-spin"><Icon /></div>`).
  - Animation lặp (loading beam) phải tự dừng khi `document.hidden` và hiển thị trạng thái tĩnh dưới `prefers-reduced-motion`.
  - Không gọi `setState` đồng bộ trong `useEffect` (tránh lỗi `react-hooks/set-state-in-effect` của React 19 ESLint).
  - Đọc theme trên client luôn dùng `resolvedTheme` sau trạng thái `mounted` để tránh lỗi hydration mismatch.

---

## 5. Quy Trình Áp Dụng & Kiểm Chứng Cho Từng Flow Tiếp Theo

### 5.1. Ranh Giới An Toàn (Strict Scope)
Trước khi sửa một flow mới:
1. Grep toàn bộ import của các component trong flow đó để phân tách rõ **file độc quyền của flow** và **file dùng chung** (`globals.css`, `layout.tsx`, `components/ui/**`, `services/**`, `sessionStorage` keys).
2. Giữ tương thích ngược 100% props và contract hand-off với các flow lân cận.

### 5.2. Cổng Kiểm Chứng Bắt Buộc Trước Khi Push
Chạy đủ 5 bước trước khi coi một flow là hoàn thành:

1. **Unit Tests:** `cd UI && npm test` (hoặc `node --test` cho các file test liên quan + thêm test cho logic mới).
2. **ESLint (0 lỗi, 0 cảnh báo):** `cd UI && npx eslint <danh sách file đã sửa>`.
3. **TypeScript (0 lỗi trong phạm vi flow):** `cd UI && npx tsc --noEmit`.
4. **Design Detector (0 vi phạm):** Chạy `impeccable detect --json <danh sách file UI đã sửa>` phải trả về `[]`.
5. **Kiểm chứng trực quan trên trình duyệt (Playwright):**
   - Kiểm tra đủ **Desktop Light (1440px)**, **Desktop Dark (1440px)**, và **Mobile (390px)** (zero tràn ngang trong container của flow).
   - Kiểm tra đủ mọi trạng thái thực tế: **Idle/Empty · Loading · Error · Success (tất cả biến thể trạng thái)**.
   - Mở và xem trực tiếp ảnh chụp màn hình trước khi chốt bàn giao.

---

## 6. File Tham Chiếu Mẫu Trong Codebase

Khi thiết kế các flow tiếp theo, đối chiếu trực tiếp cách triển khai chuẩn tại:
- **Omni-Composer & Mode Picker:** [scam-check-input.tsx](file:///c:/scamshield-app/UI/src/components/features/check/scam-check-input.tsx) · [scam-input-helpers.ts](file:///c:/scamshield-app/UI/src/components/features/check/scam-input-helpers.ts)
- **Unified Verdict, Risk Arc & Annotated Inspector:** [scam-verdict-banner.tsx](file:///c:/scamshield-app/UI/src/components/features/check/scam-verdict-banner.tsx) · [scam-risk-gauge.tsx](file:///c:/scamshield-app/UI/src/components/features/check/scam-risk-gauge.tsx) · [scam-annotated-message.tsx](file:///c:/scamshield-app/UI/src/components/features/check/scam-annotated-message.tsx)
- **Sliding Tabs & Interactive Accordions:** [scam-evidence-card.tsx](file:///c:/scamshield-app/UI/src/components/features/check/scam-evidence-card.tsx)
- **Loading, Quota & Recoverable Error:** [tier2-loading-indicator.tsx](file:///c:/scamshield-app/UI/src/components/features/check/tier2-loading-indicator.tsx) · [scam-quota-strip.tsx](file:///c:/scamshield-app/UI/src/components/features/check/scam-quota-strip.tsx) · [scam-error-callout.tsx](file:///c:/scamshield-app/UI/src/components/features/check/scam-error-callout.tsx)
- **Tactile Sidebar & Segmented Theme Switch:** [user-sidebar.tsx](file:///c:/scamshield-app/UI/src/components/layout/user/user-sidebar.tsx) · [user-quota-card.tsx](file:///c:/scamshield-app/UI/src/components/layout/user/user-quota-card.tsx)
