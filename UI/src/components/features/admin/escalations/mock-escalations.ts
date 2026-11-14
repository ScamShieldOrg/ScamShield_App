export type EscalationStatus = "pending" | "reviewing" | "resolved"
export type Decision = "dismiss" | "flag" | "suspend" | "ban"

export type Escalation = {
  id: string
  name: string
  userId: string
  email: string
  status: EscalationStatus
  summary: string
  submittedAt: string
  moderator: string
  joinedAt: string
  reputation: number
  reports: number
  reportContext: string
  rejected: number
  targets: number
  verifiedTargets: number
  alert: string
  moderatorNote: string
  evidence: { id: string; target: string; result: string }[]
}

export const mockEscalations: Escalation[] = [
  {
    id: "ESC-0041",
    name: "Trần Minh Khôi",
    userId: "U-00842",
    email: "khoi.tran@example.com",
    status: "pending",
    summary: "89 báo cáo · 24 giờ qua",
    submittedAt: "27/10/2026, 09:42",
    moderator: "Mai Phương",
    joinedAt: "14/02/2025",
    reputation: 120,
    reports: 89,
    reportContext: "Gấp 8,4 lần mức 30 ngày",
    rejected: 65,
    targets: 12,
    verifiedTargets: 3,
    alert: "Phát hiện gửi báo cáo hàng loạt",
    moderatorNote:
      "Tài khoản gửi lượng lớn báo cáo nhắm đến các tổ chức đã xác minh. Phần lớn bị từ chối do trùng lặp hoặc thiếu bằng chứng; đề nghị xem xét hành vi cố ý lạm dụng.",
    evidence: [
      {
        id: "RPT-10281",
        target: "Đường dây nóng chính thức Vietcombank",
        result: "Từ chối · bằng chứng trùng lặp",
      },
      {
        id: "RPT-10277",
        target: "Tên miền chính thức BIDV",
        result: "Từ chối · cáo buộc thiếu căn cứ",
      },
      {
        id: "RPT-10263",
        target: "Số hỗ trợ Techcombank",
        result: "Từ chối · thiếu bằng chứng",
      },
    ],
  },
  {
    id: "ESC-0038",
    name: "Lê Thanh Hà",
    userId: "U-00619",
    email: "ha.le@example.com",
    status: "pending",
    summary: "42 báo cáo · 24 giờ qua",
    submittedAt: "26/10/2026, 16:18",
    moderator: "Mai Phương",
    joinedAt: "03/08/2025",
    reputation: 185,
    reports: 42,
    reportContext: "Gấp 4,1 lần mức 30 ngày",
    rejected: 22,
    targets: 9,
    verifiedTargets: 1,
    alert: "Tần suất báo cáo tăng bất thường",
    moderatorNote:
      "Nhiều báo cáo được gửi trong thời gian ngắn với nội dung gần giống nhau. Cần kiểm tra thêm trước khi xử lý tài khoản.",
    evidence: [
      {
        id: "RPT-10192",
        target: "Trang hỗ trợ ngân hàng",
        result: "Từ chối · nội dung trùng lặp",
      },
      {
        id: "RPT-10188",
        target: "Số điện thoại dịch vụ",
        result: "Chờ kiểm duyệt",
      },
      {
        id: "RPT-10174",
        target: "Tên miền mua sắm",
        result: "Từ chối · thiếu bằng chứng",
      },
    ],
  },
  {
    id: "ESC-0031",
    name: "Nguyễn Gia Bảo",
    userId: "U-00507",
    email: "bao.nguyen@example.com",
    status: "reviewing",
    summary: "18 báo cáo · 7 ngày",
    submittedAt: "24/10/2026, 11:06",
    moderator: "Thanh Hương",
    joinedAt: "19/05/2024",
    reputation: 240,
    reports: 18,
    reportContext: "Trong 7 ngày gần đây",
    rejected: 8,
    targets: 7,
    verifiedTargets: 0,
    alert: "Hồ sơ đang được xem xét",
    moderatorNote:
      "Một số báo cáo thiếu bằng chứng xác thực. Đề nghị đối chiếu lịch sử báo cáo trước khi đưa ra quyết định.",
    evidence: [
      {
        id: "RPT-10042",
        target: "Số điện thoại lạ",
        result: "Từ chối · thiếu bằng chứng",
      },
      {
        id: "RPT-10038",
        target: "Tài khoản mạng xã hội",
        result: "Đã xác nhận",
      },
    ],
  },
  {
    id: "ESC-0025",
    name: "Phạm Ngọc Linh",
    userId: "U-00386",
    email: "linh.pham@example.com",
    status: "resolved",
    summary: "Nhiều báo cáo trùng lặp",
    submittedAt: "22/10/2026, 14:31",
    moderator: "Mai Phương",
    joinedAt: "07/01/2025",
    reputation: 310,
    reports: 27,
    reportContext: "Trong 7 ngày gần đây",
    rejected: 14,
    targets: 5,
    verifiedTargets: 1,
    alert: "Hồ sơ đã được xử lý",
    moderatorNote:
      "Hồ sơ đã được kiểm tra và đóng sau khi đối chiếu các báo cáo liên quan.",
    evidence: [
      {
        id: "RPT-09981",
        target: "Đường dẫn thanh toán",
        result: "Từ chối · nội dung trùng lặp",
      },
      { id: "RPT-09976", target: "Tên miền dịch vụ", result: "Đã xác nhận" },
    ],
  },
]

export const decisionOptions: {
  value: Decision
  label: string
  description: string
}[] = [
  {
    value: "dismiss",
    label: "Bác bỏ báo cáo",
    description: "Không xử lý tài khoản; đóng hồ sơ",
  },
  {
    value: "flag",
    label: "Gắn cờ tài khoản",
    description: "Ghi nhận để theo dõi; tài khoản vẫn truy cập được",
  },
  {
    value: "suspend",
    label: "Tạm khóa tài khoản",
    description: "Tạm thời chặn quyền truy cập nền tảng",
  },
  {
    value: "ban",
    label: "Cấm tài khoản",
    description: "Chặn vĩnh viễn quyền truy cập nền tảng",
  },
]
