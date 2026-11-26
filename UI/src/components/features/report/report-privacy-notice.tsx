"use client"

import { Popover } from "@base-ui/react/popover"
import { ArrowSquareOut, Info, ShieldCheck, X } from "@phosphor-icons/react"
import Link from "next/link"

export function ReportPrivacyNotice({ forPublication = false }: { forPublication?: boolean }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        className="inline-flex cursor-pointer items-center gap-1 rounded-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary dark:text-sky-400 dark:decoration-sky-400/40"
      >
        <Info size={14} aria-hidden="true" />
        {forPublication ? "Bảo vệ thông tin Zero-PII" : "Bảo vệ thông tin (Zero-PII)"}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={10}
          align="start"
          collisionPadding={16}
          className="z-50"
        >
          <Popover.Popup className="w-88 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-lg outline-none">
            <div className="flex items-start justify-between gap-3">
              <Popover.Title className="flex items-center gap-2 text-sm font-bold">
                <ShieldCheck
                  size={18}
                  weight="duotone"
                  className="shrink-0 text-emerald-600 dark:text-emerald-400"
                />
                {forPublication ? "Bảo vệ thông tin khi công khai" : "Bảo vệ thông tin khi báo cáo"}
              </Popover.Title>
              <Popover.Close
                type="button"
                aria-label="Đóng hướng dẫn bảo vệ thông tin"
                className="-mt-1 -mr-1 rounded-md p-1 text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary"
              >
                <X size={15} />
              </Popover.Close>
            </div>
            <Popover.Description className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Theo định hướng Zero-PII, hãy chỉ chia sẻ dữ liệu cần thiết để xác
              minh hành vi lừa đảo.
            </Popover.Description>
            <ul role="list" className="mt-3 space-y-2 text-xs leading-relaxed">
              <li className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground"
                >
                  –
                </span>
                <span>
                  Che tên, ảnh đại diện, địa chỉ và thông tin cá nhân không liên
                  quan trong minh chứng.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground"
                >
                  –
                </span>
                <span>
                  {forPublication
                    ? "Che mật khẩu, mã OTP và thông tin trên giấy tờ tùy thân trước khi công khai."
                    : "Không gửi mật khẩu, mã OTP hoặc ảnh giấy tờ tùy thân."}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="shrink-0 text-muted-foreground"
                >
                  –
                </span>
                <span>
                  Giữ lại số điện thoại, đường link hoặc tài khoản của đối tượng
                  bị báo cáo để đối chiếu.
                </span>
              </li>
            </ul>
            {!forPublication && <p className="mt-3 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
              Báo cáo vẫn gắn với tài khoản của bạn để theo dõi xử lý. Hãy lưu
              ảnh sau khi che và kiểm tra lại tệp đính kèm trước khi gửi.
            </p>}
            {!forPublication && (
              <Link
                href="https://csrc.nist.gov/pubs/sp/800/122/final"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-sm text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:text-sky-400"
              >
                Tham khảo hướng dẫn bảo vệ PII của NIST
                <ArrowSquareOut size={14} aria-hidden="true" />
                <span className="sr-only"> (mở trong thẻ mới)</span>
              </Link>
            )}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
