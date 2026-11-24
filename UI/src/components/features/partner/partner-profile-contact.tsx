"use client"

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"

import { toast } from "react-toastify"

import { Button } from "@/components/ui/button"
import {
  getPartnerProfileError,
  updatePartnerProfile,
  type PartnerProfile,
} from "@/features/partner/services/partner-profile.service"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring"

function ContactField({
  label,
  value,
  children,
}: {
  label: ReactNode
  value?: string | null
  children?: ReactNode
}) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">
        {children ?? (value?.trim() || "Chưa có thông tin")}
      </dd>
    </div>
  )
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

export function PartnerProfileContact({
  profile,
  onSave,
}: {
  profile: PartnerProfile
  onSave: (profile: PartnerProfile) => void
}) {
  const [draft, setDraft] = useState<{ name: string; email: string } | null>(
    null
  )
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [summary, setSummary] = useState("")
  const busy = useRef(false)
  const confirmation = useRef<HTMLDialogElement>(null)
  const emailInput = useRef<HTMLInputElement>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const editButton = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  const editing = draft !== null
  const representative = draft?.name.trim()
  const email = normalizeEmail(draft?.email ?? "")
  const nameChanged =
    editing &&
    representative !== (profile.representativeNameAndTitle?.trim() ?? "")
  const emailChanged =
    editing && email !== normalizeEmail(profile.corporateEmail ?? "")

  useEffect(() => {
    if (editing) {
      nameInput.current?.focus()
    } else if (restoreFocus.current) {
      editButton.current?.focus()
      restoreFocus.current = false
    }
  }, [editing])

  function closeEditor() {
    restoreFocus.current = true
    setDraft(null)
    setError("")
  }

  async function save(currentPassword?: string) {
    if (busy.current) return
    busy.current = true
    setSaving(true)
    setError("")
    setPasswordError("")
    try {
      const updated = await updatePartnerProfile({
        representativeNameAndTitle: nameChanged ? representative : undefined,
        ...(emailChanged ? { corporateEmail: email, currentPassword } : {}),
      })
      confirmation.current?.close()
      onSave(updated)
      const changes = [
        nameChanged && "họ tên và chức vụ người đại diện",
        emailChanged && "email liên hệ",
      ].filter(Boolean)
      const message = `Đã cập nhật ${changes.join(" và ")}.`
      setSummary(message)
      toast.success(message)
      closeEditor()
    } catch (cause) {
      const message = getPartnerProfileError(
        cause,
        "Không thể lưu thay đổi. Vui lòng thử lại."
      )
      if (emailChanged) setPasswordError(message)
      else setError(message)
      toast.error(message)
    } finally {
      setPassword("")
      busy.current = false
      setSaving(false)
    }
  }

  function submitDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current || (!nameChanged && !emailChanged)) return

    if (nameChanged && (!representative || representative.length > 255)) {
      setError("Nhập họ tên và chức vụ người đại diện từ 1 đến 255 ký tự.")
      nameInput.current?.focus()
      return
    }
    if (emailChanged) {
      if (!email || !emailInput.current?.checkValidity()) {
        setError("Nhập địa chỉ email liên hệ hợp lệ.")
        emailInput.current?.focus()
        return
      }
      setError("")
      confirmation.current?.showModal()
      return
    }
    void save()
  }

  return (
    <>
      <form
        onSubmit={submitDraft}
        noValidate
        aria-busy={saving}
        className="space-y-4"
      >
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <ContactField
            label={
              draft ? (
                <label htmlFor="partner-representative">
                  Họ tên và chức vụ người đại diện
                </label>
              ) : (
                "Họ tên và chức vụ người đại diện"
              )
            }
            value={profile.representativeNameAndTitle}
          >
            {draft && (
              <>
                <input
                  id="partner-representative"
                  value={draft.name}
                  maxLength={255}
                  ref={nameInput}
                  readOnly={saving}
                  className={inputClass}
                  aria-describedby="partner-representative-hint"
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                />
                <p
                  id="partner-representative-hint"
                  className="mt-1 text-xs text-muted-foreground"
                >
                  Thông tin này có thể xuất hiện trong danh sách trắng công
                  khai.
                </p>
              </>
            )}
          </ContactField>

          <ContactField
            label={
              draft ? (
                <label htmlFor="partner-email">Email liên hệ</label>
              ) : (
                "Email liên hệ"
              )
            }
            value={profile.corporateEmail}
          >
            {draft && (
              <input
                id="partner-email"
                ref={emailInput}
                type="email"
                autoComplete="email"
                maxLength={254}
                value={draft.email}
                readOnly={saving}
                className={inputClass}
                onChange={(event) =>
                  setDraft({ ...draft, email: event.target.value })
                }
              />
            )}
          </ContactField>

          <ContactField
            label="Tư cách đại diện"
            value={
              profile.legalRepresentative === null
                ? null
                : profile.legalRepresentative
                  ? "Người đại diện theo pháp luật"
                  : "Người đại diện được ủy quyền"
            }
          />
          <ContactField
            label="Số điện thoại liên hệ"
            value={profile.contactPhone}
          />
        </dl>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {draft ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              disabled={saving || (!nameChanged && !emailChanged)}
            >
              {saving ? "Đang lưu…" : "Lưu"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closeEditor}
              disabled={saving}
            >
              Hủy
            </Button>
          </div>
        ) : profile.verificationStatus === "VERIFIED" ? (
          <Button
            type="button"
            variant="outline"
            ref={editButton}
            onClick={() => {
              setSummary("")
              setDraft({
                name: profile.representativeNameAndTitle ?? "",
                email: profile.corporateEmail ?? "",
              })
            }}
          >
            Chỉnh sửa
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Chỉ hồ sơ đối tác đã xác thực mới có thể chỉnh sửa.
          </p>
        )}
        {summary && (
          <p role="status" className="text-sm">
            {summary}
          </p>
        )}
      </form>

      <dialog
        ref={confirmation}
        aria-labelledby="partner-password-title"
        aria-describedby="partner-password-description"
        className="fixed inset-0 m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-xl border border-border bg-card p-5 text-card-foreground shadow-lg backdrop:bg-black/50"
        onCancel={(event) => {
          if (busy.current) event.preventDefault()
        }}
        onClose={() => {
          setPassword("")
          setPasswordError("")
        }}
      >
        <form
          className="space-y-4"
          aria-busy={saving}
          onSubmit={(event) => {
            event.preventDefault()
            if (password) void save(password)
          }}
        >
          <div className="space-y-1">
            <h3 id="partner-password-title" className="text-lg font-semibold">
              Xác nhận mật khẩu
            </h3>
            <p
              id="partner-password-description"
              className="text-sm text-muted-foreground"
            >
              Nhập mật khẩu tài khoản hiện tại để cập nhật email liên hệ.
            </p>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="block">Mật khẩu hiện tại</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              maxLength={256}
              required
              readOnly={saving}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
            />
          </label>
          {passwordError && (
            <p role="alert" className="text-sm text-destructive">
              {passwordError}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => confirmation.current?.close()}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={saving || !password}>
              {saving ? "Đang lưu…" : "Xác nhận"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  )
}
