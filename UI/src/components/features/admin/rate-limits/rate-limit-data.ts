export type RuleGroup = "quota" | "otp" | "api"

export interface RateLimitRule {
  id: string
  name: string
  description: string
  group: RuleGroup
  scope: string
  limit: string
  window: string
  source: string
  enforced: boolean
  behavior: string
}

export const GROUP_LABELS: Record<RuleGroup, string> = {
  quota: "Hạn mức kiểm tra & báo cáo",
  otp: "Bảo vệ OTP",
  api: "Giới hạn API",
}

// Static examples from repository seeds and defaults; never live configuration.
export const RATE_LIMIT_RULES: RateLimitRule[] = [
  {
    id: "guest-checks",
    name: "Kiểm tra lừa đảo · Khách",
    description: "Hạn mức kiểm tra dành cho phiên khách vãng lai.",
    group: "quota",
    scope: "Phiên khách",
    limit: "5 lượt",
    window: "Mỗi ngày",
    source: "Chính sách GUEST",
    enforced: true,
    behavior:
      "Đặt lại lúc 00:00 theo giờ Việt Nam. Khi hết lượt, yêu cầu kiểm tra bị từ chối với mã 429. Giá trị mẫu lấy từ chính sách GUEST trong dữ liệu mẫu.",
  },
  {
    id: "registered-checks",
    name: "Kiểm tra lừa đảo · Thành viên",
    description: "Hạn mức mặc định khi chưa có chính sách phù hợp.",
    group: "quota",
    scope: "Tài khoản thành viên",
    limit: "10 lượt",
    window: "Mỗi ngày",
    source: "Cấu hình mặc định",
    enforced: true,
    behavior:
      "Ưu tiên chính sách theo hạng uy tín, sau đó REGISTERED_USER, cuối cùng là cấu hình mặc định. Đặt lại lúc 00:00 theo giờ Việt Nam.",
  },
  {
    id: "rank-checks",
    name: "Kiểm tra lừa đảo · Tân Binh",
    description: "Hạn mức riêng theo hạng uy tín của thành viên.",
    group: "quota",
    scope: "Hạng Tân Binh",
    limit: "100 lượt",
    window: "Mỗi ngày",
    source: "Chính sách theo hạng",
    enforced: true,
    behavior:
      "Chính sách theo hạng được ưu tiên hơn hạn mức mặc định của thành viên. Giá trị 100 lượt lấy từ dữ liệu mẫu; đặt lại lúc 00:00 theo giờ Việt Nam.",
  },
  {
    id: "reports",
    name: "Gửi báo cáo · Thành viên",
    description: "Kiểm soát số báo cáo gửi trong 24 giờ gần nhất.",
    group: "quota",
    scope: "Tài khoản thành viên",
    limit: "10 báo cáo",
    window: "24 giờ gần nhất",
    source: "Chính sách / mặc định",
    enforced: true,
    behavior:
      "Ưu tiên chính sách theo hạng, sau đó REGISTERED_USER, rồi cấu hình mặc định 10 báo cáo. Dùng cửa sổ 24 giờ liên tục, không đặt lại đồng loạt vào nửa đêm. Dữ liệu mẫu của hạng Tân Binh cũng là 10 báo cáo.",
  },
  {
    id: "report-burst",
    name: "Chống gửi báo cáo liên tục",
    description: "Giảm các đợt gửi báo cáo dồn dập.",
    group: "quota",
    scope: "Tài khoản thành viên",
    limit: "3 báo cáo",
    window: "5 phút gần nhất",
    source: "Cấu hình mặc định",
    enforced: true,
    behavior:
      "Từ chối yêu cầu khi tài khoản đã gửi đủ 3 báo cáo trong 5 phút gần nhất. Áp dụng đồng thời với giới hạn 24 giờ.",
  },
  {
    id: "sms-cooldown",
    name: "Thời gian chờ gửi lại SMS OTP",
    description: "Ngăn yêu cầu mã SMS liên tiếp đến cùng số điện thoại.",
    group: "otp",
    scope: "Số điện thoại",
    limit: "1 yêu cầu",
    window: "60 giây",
    source: "Quy tắc cố định",
    enforced: true,
    behavior:
      "Phải chờ ít nhất 60 giây từ yêu cầu SMS OTP gần nhất trước khi yêu cầu mã mới.",
  },
  {
    id: "sms-cap",
    name: "Hạn mức SMS OTP của dự án",
    description: "Giới hạn tổng số yêu cầu SMS của toàn dự án.",
    group: "otp",
    scope: "Toàn dự án",
    limit: "10 yêu cầu",
    window: "24 giờ gần nhất",
    source: "Cấu hình mặc định",
    enforced: true,
    behavior:
      "Đếm yêu cầu SMS OTP trên toàn dự án trong 24 giờ gần nhất. Giá trị mặc định là 10; môi trường triển khai có thể cấu hình giá trị khác.",
  },
  {
    id: "email-cooldown",
    name: "Thời gian chờ gửi lại email OTP",
    description: "Giãn cách yêu cầu gửi mã tới cùng địa chỉ email.",
    group: "otp",
    scope: "Địa chỉ email",
    limit: "1 yêu cầu",
    window: "60 giây",
    source: "Quy tắc cố định",
    enforced: true,
    behavior:
      "Chờ ít nhất một phút từ lần gửi mã gần nhất trước khi gửi lại email OTP.",
  },
  {
    id: "global-api",
    name: "Giới hạn API tổng quát",
    description:
      "Chính sách đã có trong dữ liệu mẫu, chưa áp dụng vào yêu cầu.",
    group: "api",
    scope: "Người dùng (USER)",
    limit: "100 yêu cầu",
    window: "60 giây",
    source: "Chính sách mẫu",
    enforced: false,
    behavior:
      "Bản ghi Global API Limit được bật trong dữ liệu mẫu nhưng chưa được nối với bộ xử lý giới hạn yêu cầu. Giá trị này chưa có hiệu lực bảo vệ API.",
  },
]
