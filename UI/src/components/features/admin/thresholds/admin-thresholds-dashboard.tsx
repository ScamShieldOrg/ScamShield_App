import { Info, LockSimple, GitBranch } from "@phosphor-icons/react/dist/ssr"
import { ClassifierSettings } from "./classifier-settings"
import { CouncilRagSettings } from "./council-rag-settings"
import { OfflineEvaluation } from "./offline-evaluation"
import { ThresholdSection } from "./threshold-section"

const SECTIONS = [
  ["tier1", "ViSoBERT"],
  ["routing", "Chuyển tầng"],
  ["council", "Hội đồng AI"],
  ["rag", "Bằng chứng RAG"],
  ["evaluation", "Đánh giá"],
  ["decision-flow", "Luồng quyết định"],
] as const

export function AdminThresholdsDashboard() {
  return (
    <div className="mx-auto max-w-[1800px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Quản trị mô hình
          </p>
          <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
            Mô hình AI & ngưỡng quyết định
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            Xem cách hệ thống phân loại rủi ro, chuyển tầng phân tích và truy
            xuất bằng chứng.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          <LockSimple size={15} aria-hidden="true" /> Chỉ xem
        </span>
      </header>
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
        <Info size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
        <p>
          <strong className="text-foreground">Bản tham chiếu từ kho mã.</strong>{" "}
          Các giá trị dưới đây được chép từ cấu hình và báo cáo của AI Pipeline.
          Chưa kết nối dịch vụ để xác nhận cấu hình hoặc trạng thái đang chạy.
        </p>
      </div>
      <nav aria-label="Các phần cấu hình AI" className="flex flex-wrap gap-2">
        {SECTIONS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="inline-flex min-h-9 items-center rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {label}
          </a>
        ))}
      </nav>
      <ClassifierSettings />
      <CouncilRagSettings />
      <OfflineEvaluation />
      <ThresholdSection
        id="decision-flow"
        title="Phạm vi áp dụng & luồng quyết định"
        description="Ngưỡng AI áp dụng sau bước đối chiếu dữ liệu đã xác minh của ứng dụng."
        source="Core: ScamCheckDecisionService.java · AI: pipeline/two_tier_router.py"
      >
        <ol className="grid gap-4 lg:grid-cols-3">
          {[
            [
              "01",
              "Đối chiếu danh sách đã xác minh",
              "Blacklist khớp trả SCAM_RISK. Whitelist được xác minh có thể trả LOW_RISK cho chỉ số độc lập; không dùng một chỉ số tin cậy để kết luận cả tin nhắn an toàn.",
            ],
            [
              "02",
              "Chọn hướng phân tích",
              "Tin nhắn chưa có kết luận chuyển sang ViSoBERT và có thể lên tầng 2. URL độc lập đối chiếu PhishTank và Google Safe Browsing; không khớp nguồn đe dọa trả UNKNOWN.",
            ],
            [
              "03",
              "Lưu và trả kết quả",
              "Backend lưu verdict và thông tin AI trả về. Số điện thoại và tài khoản ngân hàng do backend xử lý; không có kết quả đối chiếu quyết định thì trả UNKNOWN.",
            ],
          ].map(([step, title, description]) => (
            <li key={step} className="rounded-lg border border-border p-4">
              <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                {step}
              </span>
              <h3 className="mt-2 font-heading text-sm font-semibold">
                {title}
              </h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {description}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <GitBranch size={17} aria-hidden="true" className="mt-0.5 shrink-0" />{" "}
          Độ tin cậy, điểm hội đồng, điểm rủi ro và độ tương đồng RAG có ý nghĩa
          khác nhau. Không dùng chung một ngưỡng cho tất cả đầu vào.
        </p>
      </ThresholdSection>
    </div>
  )
}
