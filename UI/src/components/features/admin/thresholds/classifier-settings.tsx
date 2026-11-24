import { SettingValues, ThresholdSection } from "./threshold-section"

export function ClassifierSettings() {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <ThresholdSection
        id="tier1"
        title="Tầng 1 · Phân loại ViSoBERT"
        description="Phân vùng theo xác suất lừa đảo đã hiệu chỉnh (p)."
        source="models/visobert_finetuned/training_report.json · pipeline/visobert_classifier.py"
      >
        <div
          className="mb-5 grid grid-cols-[35fr_50fr_15fr] overflow-hidden rounded-md text-center text-[10px] font-semibold"
          aria-hidden="true"
        >
          <div className="bg-emerald-100 py-3 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            HAM
          </div>
          <div className="bg-amber-100 py-3 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            REVIEW
          </div>
          <div className="bg-destructive/10 py-3 text-destructive">SCAM</div>
        </div>
        <dl className="mb-5 grid gap-3 text-xs sm:grid-cols-3">
          {[
            ["HAM · Ít rủi ro", "p < 0.35"],
            ["REVIEW · Cần phân tích", "0.35 ≤ p ≤ 0.85"],
            ["SCAM · Nghi lừa đảo", "p > 0.85"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="font-semibold">{label}</dt>
              <dd className="mt-1 font-mono text-muted-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-border pt-4">
          <SettingValues
            items={[
              {
                label: "Nhiệt độ hiệu chỉnh",
                value: "1.4015",
                hint: "Temperature scaling từ báo cáo huấn luyện.",
              },
              {
                label: "Độ dài đầu vào tối đa",
                value: "128 token",
                hint: "Theo bộ tách token của mô hình.",
              },
            ]}
          />
        </div>
        <details className="mt-5 rounded-md border border-border p-3 text-xs">
          <summary className="cursor-pointer font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            Nguồn cấu hình và thứ tự sử dụng
          </summary>
          <p className="mt-2 leading-5 text-muted-foreground">
            Thư mục mặc định: models/visobert_finetuned. VISOBERT_MODEL_DIR có
            thể đổi thư mục mô hình. Bộ phân loại đọc training_report.json trong
            thư mục được chọn; nếu thiếu sẽ dùng giá trị mặc định trong mã.
          </p>
          <p className="mt-2 leading-5 text-muted-foreground">
            Tệp models/scamshield_config.json có ngưỡng 0.10 / 0.90 nhưng không
            phải nguồn được bộ phân loại này đọc. Cấu hình đang chạy chưa được
            xác nhận.
          </p>
        </details>
      </ThresholdSection>
      <ThresholdSection
        id="routing"
        title="Chuyển lên tầng 2"
        description="Ngưỡng định tuyến dựa trên độ tin cậy, khác với xác suất phân loại."
        source="api/app.py · pipeline/two_tier_router.py"
      >
        <SettingValues
          items={[
            {
              label: "Ngưỡng tin cậy mặc định τ",
              value: "0.90",
              hint: "TIER1_CONFIDENCE_THRESHOLD · Có thể đổi theo môi trường.",
            },
            {
              label: "Cách tính độ tin cậy",
              value: "max(p, 1 − p)",
              hint: "Giá trị từ bộ phân loại tầng 1.",
            },
          ]}
        />
        <h3 className="mt-5 font-heading text-sm font-semibold">
          Điều kiện phân tích sâu
        </h3>
        <ul className="mt-2 list-disc space-y-2 pl-4 text-xs leading-5 text-muted-foreground">
          <li>Độ tin cậy tầng 1 thấp hơn 0.90.</li>
          <li>Yêu cầu đặt force_tier2=true.</li>
          <li>URL khớp nguồn đe dọa nhưng nhãn tầng 1 là HAM.</li>
        </ul>
        <p className="mt-4 rounded-md bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
          Trả trực tiếp từ tầng 1 khi độ tin cậy đạt ngưỡng, không ép tầng 2 và
          không có xung đột URL. Nếu phân tích sâu không khả dụng và không thể
          kết luận, trả UNKNOWN.
        </p>
      </ThresholdSection>
    </div>
  )
}
