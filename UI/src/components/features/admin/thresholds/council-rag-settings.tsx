import { SettingValues, ThresholdSection } from "./threshold-section"

export function CouncilRagSettings() {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <ThresholdSection
        id="council"
        title="Tầng 2 · Hội đồng AI"
        description="Kết hợp điểm của ba vai trò và cơ chế giảm cảnh báo nhầm."
        source="config/council_registry.yaml · pipeline/forensic_council.py"
      >
        <dl className="grid gap-3 sm:grid-cols-3">
          {[
            ["LOW-RISK", "Điểm < 0.40"],
            ["SCAM-RISK", "Điểm ≥ 0.60"],
            ["CRITICAL", "Điểm ≥ 0.85"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border p-3">
              <dt className="text-[11px] font-semibold">{label}</dt>
              <dd className="mt-1 font-mono text-xs text-muted-foreground">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Vùng 0.40–dưới 0.60 thường trả UNKNOWN. Đây không phải phép chia điểm
          đơn thuần: khi phiếu mâu thuẫn và chênh lệch tối đa 1, điểm dưới 0.68
          trả UNKNOWN; nhãn LOW-RISK cũng yêu cầu không có mâu thuẫn.
        </p>
        <h3 className="mt-5 font-heading text-sm font-semibold">
          Vai trò và trọng số
        </h3>
        <dl className="mt-2 divide-y divide-border text-xs">
          {[
            ["Pháp y tài chính & an ninh mạng", "35%"],
            ["Tâm lý & ngôn ngữ tiếng Việt", "35%"],
            ["Biện hộ, chống cảnh báo nhầm", "30%"],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 py-2">
              <dt>{label}</dt>
              <dd className="font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <details className="mt-4 rounded-md border border-border p-3 text-xs">
          <summary className="cursor-pointer font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            Biện hộ và dừng sớm
          </summary>
          <p className="mt-2 leading-5 text-muted-foreground">
            Nếu vai trò biện hộ bỏ phiếu LOW-RISK hoặc BENIGN, điểm tổng giảm
            0.25, tối thiểu bằng 0. Dừng sớm được bật trong cấu hình; với 3 vai
            trò, cần 3 phiếu cùng LOW-RISK hoặc cùng SCAM-RISK.
          </p>
        </details>
      </ThresholdSection>
      <ThresholdSection
        id="rag"
        title="RAG · Truy xuất bằng chứng"
        description="Độ tương đồng đo mức liên quan của tài liệu, không phải xác suất lừa đảo."
        source="config/rag_threshold.json · pipeline/rag.py"
      >
        <SettingValues
          items={[
            {
              label: "Ngưỡng cosine similarity",
              value: "0.6536799",
              hint: "Chấp nhận đoạn có độ tương đồng từ ngưỡng trở lên.",
            },
            {
              label: "Mô hình embedding",
              value: "BAAI/bge-m3",
              hint: "Tối đa 5 đoạn phù hợp cho mỗi truy vấn.",
            },
          ]}
        />
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Hiệu chỉnh ngày{" "}
            <time dateTime="2026-10-31T10:24:08.759906+00:00">
              31/10/2026 · 17:24 (UTC+7)
            </time>{" "}
            · 40 mẫu
          </p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">
                Precision trên tập kiểm tra riêng
              </dt>
              <dd className="mt-1 font-heading text-xl font-semibold">100%</dd>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                Chỉ 2 kết quả được chấp nhận / 10 truy vấn.
              </p>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Recall trên tập kiểm tra riêng
              </dt>
              <dd className="mt-1 font-heading text-xl font-semibold">25%</dd>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                80% truy vấn không có kết quả phù hợp.
              </p>
            </div>
          </dl>
        </div>
        <details className="mt-4 rounded-md border border-border p-3 text-xs">
          <summary className="cursor-pointer font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            Phiên bản và điều kiện sử dụng
          </summary>
          <code className="mt-2 block text-[11px] break-all text-muted-foreground">
            5617a9f61b028005a4858fdac845db406aefb181
          </code>
          <p className="mt-2 leading-5 text-muted-foreground">
            Ngưỡng chỉ được chấp nhận khi khớp mô hình, phiên bản embedding và
            đạt điều kiện hiệu chỉnh. Truy xuất từ tài liệu VERIFIED còn hiệu
            lực. Tầng 2 vẫn tiếp tục khi không có bằng chứng RAG phù hợp.
          </p>
        </details>
      </ThresholdSection>
    </div>
  )
}
