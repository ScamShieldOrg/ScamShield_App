"use client"

import { useState } from "react"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { ThresholdSection } from "./threshold-section"

// Repository report snapshots, not production measurements.
const BENCHMARKS = {
  cascaded: {
    samples: "3.266",
    accuracy: "95,44%",
    precision: "90,72%",
    recall: "93,03%",
    f1: "91,86%",
    fpr: "3,64%",
    escalation: "1,10%",
    mean: "277,6 ms",
    p99: "9.551,4 ms",
  },
  tier1: {
    samples: "3.261",
    accuracy: "95,12%",
    precision: "88,92%",
    recall: "94,14%",
    f1: "91,46%",
    fpr: "4,50%",
    escalation: "0%",
    mean: "124,8 ms",
    p99: "230,9 ms",
  },
} as const

export function OfflineEvaluation() {
  const [mode, setMode] = useState<keyof typeof BENCHMARKS>("cascaded")
  const benchmark = BENCHMARKS[mode]
  return (
    <ThresholdSection
      id="evaluation"
      title="Kết quả đánh giá ngoại tuyến"
      description="Số liệu từ báo cáo lưu trong kho mã; không phải hiệu suất của dịch vụ đang chạy."
      source="results/benchmark_metrics.json · models/visobert_finetuned/training_report.json"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <label className="block min-w-0 text-xs font-semibold">
          Báo cáo benchmark
          <NativeSelect
            className="mt-2 w-full sm:w-72"
            value={mode}
            onChange={(event) =>
              setMode(event.target.value as keyof typeof BENCHMARKS)
            }
          >
            <NativeSelectOption value="cascaded">
              Pipeline kết hợp tầng 1 & tầng 2
            </NativeSelectOption>
            <NativeSelectOption value="tier1">Chỉ tầng 1</NativeSelectOption>
          </NativeSelect>
        </label>
        <p className="text-xs text-muted-foreground" role="status">
          {benchmark.samples} mẫu được khai báo trong báo cáo
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-3">
        {[
          ["Độ chính xác · Accuracy", benchmark.accuracy],
          ["Precision · Lừa đảo", benchmark.precision],
          ["Recall · Lừa đảo", benchmark.recall],
          ["F1 · Lừa đảo", benchmark.f1],
          ["Tỷ lệ cảnh báo nhầm · FPR", benchmark.fpr],
          ["Tỷ lệ chuyển tầng 2", benchmark.escalation],
          ["Độ trễ trung bình", benchmark.mean],
          ["Độ trễ P99", benchmark.p99],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] leading-5 text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 font-heading text-xl font-semibold tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 rounded-md bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
        Hai chế độ có số mẫu khác nhau. Báo cáo không ghi rõ ngày chạy và phiên
        bản dữ liệu; chưa thể coi đây là phép so sánh trên cùng tập kiểm tra
        hoặc cấu hình đang triển khai.
      </p>
      <details className="mt-4 rounded-md border border-border p-3 text-xs">
        <summary className="cursor-pointer font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          Báo cáo kiểm tra riêng của mô hình ViSoBERT
        </summary>
        <p className="mt-2 leading-5 text-muted-foreground">
          training_report.json ghi 566 mẫu kiểm tra (432 HAM, 134 SCAM):
          accuracy 90,64%; precision lừa đảo 73,41%; recall lừa đảo 94,78%; F1
          lừa đảo 82,74%. Đây là báo cáo riêng, không cùng tập mẫu với benchmark
          phía trên.
        </p>
      </details>
    </ThresholdSection>
  )
}
