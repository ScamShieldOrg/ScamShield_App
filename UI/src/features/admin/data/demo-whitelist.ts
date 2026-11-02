export type WhitelistType = "hotline" | "domain"

export type WhitelistStatus = "active" | "pending" | "suspended"

export interface WhitelistEvidence {
  name: string
  url?: string
}

export interface WhitelistItem {
  id: string
  value: string
  type: WhitelistType
  organization: string
  addedAt: string
  status: WhitelistStatus
  requestedBy?: {
    name: string
    organization: string
    email?: string
    notes?: string
  }
  evidences?: WhitelistEvidence[]
}

export const DEMO_WHITELIST: WhitelistItem[] = [
  {
    id: "WL-001",
    value: "1800 545 413",
    type: "hotline",
    organization: "Vietcombank",
    addedAt: "15/03/2022",
    status: "active",
  },
  {
    id: "WL-002",
    value: "bidv.com.vn",
    type: "domain",
    organization: "BIDV",
    addedAt: "10/03/2022",
    status: "active",
  },
  {
    id: "WL-003",
    value: "1900 9247",
    type: "hotline",
    organization: "Techcombank",
    addedAt: "18/04/2022",
    status: "active",
  },
  {
    id: "WL-004",
    value: "vietinbank.vn",
    type: "domain",
    organization: "VietinBank",
    addedAt: "22/05/2022",
    status: "active",
  },
  {
    id: "WL-005",
    value: "sacombank-personal.vn",
    type: "domain",
    organization: "Sacombank",
    addedAt: "28/01/2024",
    status: "pending",
    requestedBy: {
      name: "Phạm Thanh Vân",
      organization: "Sacombank",
      email: "van.pham@sacombank.com.vn",
      notes:
        "Tên miền chính thức phục vụ cổng thông tin khách hàng cá nhân mới triển khai của Sacombank.",
    },
    evidences: [
      { name: "business_cert.pdf" },
      { name: "brand_registration.pdf" },
      { name: "authorized_letter.pdf" },
    ],
  },
  {
    id: "WL-006",
    value: "1800 6868",
    type: "hotline",
    organization: "MB Bank",
    addedAt: "29/01/2024",
    status: "pending",
    requestedBy: {
      name: "Nguyễn Minh Khoa",
      organization: "MB Bank",
      email: "khoa.nm@mbbank.com.vn",
      notes:
        "Tổng đài hỗ trợ ưu tiên mới cho khách hàng cá nhân và doanh nghiệp vừa và nhỏ của MB Bank.",
    },
    evidences: [
      { name: "telco_registration.pdf" },
      { name: "hotline_cert.pdf" },
    ],
  },
  {
    id: "WL-007",
    value: "agribank.com.vn",
    type: "domain",
    organization: "Agribank",
    addedAt: "01/06/2022",
    status: "suspended",
  },
]
