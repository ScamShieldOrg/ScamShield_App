-- Dữ liệu mẫu tiếng Việt. Chỉ chứa INSERT; schema phải được tạo sẵn trước khi chạy.
-- Không migration bảng hoặc xóa/cập nhật dữ liệu trong file này.
-- Mỗi bảng một nhóm; thứ tự nhóm bảo đảm các dữ liệu được tham chiếu đã được tạo.

-- 01. roles
INSERT INTO roles (name, description) VALUES
('GUEST', 'Khách vãng lai, chưa đăng ký'),
('REGISTERED_USER', 'Người dùng thông thường đã đăng ký'),
('MODERATOR', 'Người kiểm duyệt nội dung cộng đồng'),
('ADMINISTRATOR', 'Quản trị viên hệ thống'),
('BUSINESS_PARTNER', 'Đối tác doanh nghiệp (Ngân hàng, Sàn TMĐT)');

-- 02. reputation_ranks
INSERT INTO reputation_ranks (name, min_points, max_points, description) VALUES
('Tân Binh', 0, 99, 'Người dùng mới tham gia, cần thêm uy tín'),
('Hiệp Sĩ', 100, 499, 'Thành viên đóng góp tích cực'),
('Thủ Lĩnh', 500, 9999, 'Chuyên gia diệt lừa đảo đáng tin cậy');

-- 03. scam_categories
INSERT INTO scam_categories (code, name, description, version, is_active, created_at, updated_at)
VALUES ('VIEC_LAM', 'Lừa đảo việc làm, CTV', 'Tuyển CTV làm nhiệm vụ ảo, chốt đơn hàng', 1, TRUE, now(), now())
     , ('TRUNG_THUONG', 'Lừa đảo trúng thưởng', 'Yêu cầu nộp phí nhận quà', 1, TRUE, now(), now())
     , ('GIA_DANH_CQCN', 'Giả danh cơ quan chức năng', 'Giả công an, tòa án dọa bắt giam', 1, TRUE, now(), now())
     , ('VIEN_THONG', 'Giả Mạo Viễn Thông', 'Giả mạo nhà mạng khóa chiều thuê bao', 1, TRUE, now(), now())
     , ('MALWARE', 'Giả Mạo VNeID / Malware', 'Mã độc đánh cắp tài khoản và OTP', 1, TRUE, now(), now())
     , ('CSGT', 'Giả Mạo Cảnh Sát Giao Thông', 'Thông báo phạt nguội phương tiện giả mạo', 1, TRUE, now(), now())
     , ('FOREX', 'Sàn Forex / Tiền Ảo', 'Cam kết lợi nhuận 3.5%/ngày bảo hiểm vốn ảo', 1, TRUE, now(), now())

UNION ALL

SELECT v.code, v.name, v.description, 1, TRUE, pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP), pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP)
FROM ((VALUES ('GIA_DANH_NGAN_HANG', 'Mạo danh ngân hàng', 'Giả danh ngân hàng qua SMS Brandname và đường dẫn giả'), ('DANH_CAP_OTP', 'Đánh cắp mã OTP', 'Lừa cung cấp mã xác thực OTP và mã PIN'), ('VE_MAY_BAY_DU_LICH', 'Vé máy bay & Du lịch', 'Giả hoàn vé, hủy chuyến và đền bù qua liên kết độc hại'))) AS v (code, name, description)
WHERE NOT EXISTS (SELECT 1
                  FROM scam_categories AS c
                  WHERE c.code = v.code);

-- 04. users
-- LƯU Ý: Mật khẩu của tất cả user dưới đây đều là: 123456 (đã được băm bằng BCrypt)
INSERT INTO users (full_name, phone_number, email, password_hash, role_id, reputation_rank_id, status, reputation_points, is_phone_verified, created_at, updated_at)
VALUES ('Nguyễn Văn A', '0987654321', 'nguyenvana@gmail.com', '$2a$10$KjgQ5SG4mGFr37olOMAkxu4F4ekYORUUEleshwHskaOakgnZ.edu2', (SELECT id FROM roles WHERE name = 'REGISTERED_USER'), (SELECT id FROM reputation_ranks WHERE name = 'Hiệp Sĩ'), 'ACTIVE', 150, TRUE, now(), now())
     , ('Admin ScamShield', '0988888888', 'admin@scamshield.vn', '$2a$10$KjgQ5SG4mGFr37olOMAkxu4F4ekYORUUEleshwHskaOakgnZ.edu2', (SELECT id FROM roles WHERE name = 'ADMINISTRATOR'), (SELECT id FROM reputation_ranks WHERE name = 'Thủ Lĩnh'), 'ACTIVE', 9999, FALSE, now(), now())
     , ('Moderator ScamShield', '0901234567', 'moderator@scamshield.vn', '$2a$10$KjgQ5SG4mGFr37olOMAkxu4F4ekYORUUEleshwHskaOakgnZ.edu2', (SELECT id FROM roles WHERE name = 'MODERATOR'), (SELECT id FROM reputation_ranks WHERE name = 'Thủ Lĩnh'), 'ACTIVE', 5000, FALSE, now(), now())
     , ('Shopee Partner', '19001234', 'partner@shopee.vn', '$2a$10$KjgQ5SG4mGFr37olOMAkxu4F4ekYORUUEleshwHskaOakgnZ.edu2', (SELECT id FROM roles WHERE name = 'BUSINESS_PARTNER'), NULL, 'ACTIVE', 0, FALSE, now(), now())

UNION ALL

SELECT v.full_name, v.phone_number, v.email, '$2a$10$KjgQ5SG4mGFr37olOMAkxu4F4ekYORUUEleshwHskaOakgnZ.edu2', role.id, rank.id, 'ACTIVE', v.points, TRUE, pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP) - v.joined_days_ago * CAST('1 day' AS interval), pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP)
FROM ((VALUES ('Trần Minh Khôi', '0912345601', 'khoi.tran@gmail.com', 'REGISTERED_USER', 'Hiệp Sĩ', 120, 90), ('Lê Thanh Hà', '0912345602', 'ha.le@gmail.com', 'REGISTERED_USER', 'Tân Binh', 35, 45), ('Nguyễn Gia Bảo', '0912345603', 'bao.nguyen@gmail.com', 'REGISTERED_USER', 'Hiệp Sĩ', 420, 120), ('Phạm Ngọc Linh', '0912345604', 'linh.pham@gmail.com', 'REGISTERED_USER', 'Tân Binh', 80, 30), ('Mai Phương', '0912345605', 'moderator.phuong@scamshield.vn', 'MODERATOR', 'Thủ Lĩnh', 1500, 180))) AS v (full_name, phone_number, email, role_name, rank_name, points, joined_days_ago) INNER JOIN roles AS role ON role.name = v.role_name INNER JOIN reputation_ranks AS rank ON rank.name = v.rank_name
WHERE NOT EXISTS (SELECT 1
                  FROM users AS u
                  WHERE u.email = v.email OR u.phone_number = v.phone_number);

-- 05. refresh_tokens
INSERT INTO refresh_tokens (user_id, token_hash, created_at, expires_at) VALUES
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'hash256_mock_token_123', NOW(), NOW() + INTERVAL '7 days');

-- 06. reputation_transactions
INSERT INTO reputation_transactions (user_id, points_delta, reason_code, created_at) VALUES
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 10, 'REPORT_APPROVED', NOW());

-- 07. monthly_rewards
INSERT INTO monthly_rewards (user_id, reward_month, total_points, status) VALUES
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), CURRENT_DATE, 150, 'PENDING');

-- 08. guest_sessions
INSERT INTO guest_sessions (session_token_hash, created_at) VALUES
('guest_token_abc123', NOW());

-- 09. quota_policies
INSERT INTO quota_policies (name, rank_id, max_checks_per_day, max_reports_per_day, created_at, updated_at) VALUES
('GUEST', NULL, 5, 0, NOW(), NOW()),
('Tân Binh Quota', (SELECT id FROM reputation_ranks WHERE name='Tân Binh'), 10, 5, NOW(), NOW());

-- 10. rate_limit_policies
INSERT INTO rate_limit_policies (name, scope, max_requests, window_seconds, enabled, created_at, updated_at) VALUES
('Global API Limit', 'USER', 100, 60, true, NOW(), NOW());

-- 11. indicators
INSERT INTO indicators (type, normalized_value, display_value, created_at, updated_at)
(VALUES ('PHONE', '0987654321', '0987.654.321', now(), now())
      , ('URL', 'nhanqua-shopee.vip', 'http://nhanqua-shopee.vip', now(), now())
      , ('URL', 'shopee.vn', 'https://shopee.vn', now(), now())
      , ('PHONE', '0912443882', '+84 912.443.882', now(), now())
      , ('URL', 'dichvucong-vneid-capnhat.gov-vn.info/apk', 'https://dichvucong-vneid-capnhat.gov-vn.info/ap...', now(), now())
      , ('SMS_BANK', 'vietcombank', 'SMS Brandname: Vietcombank', now(), now())
      , ('TELEGRAM', '@tuyendungshopeemall_hr', 'Zalo/Telegram: @TuyenDungShopeeMall_HR', now(), now())
      , ('BANK_ACCOUNT', '104889201992', 'STK: 104889201992 - VPBank (VU HOANG ANH)', now(), now())
      , ('TRAFFIC_FINE', 'tra-cuu-phatnguoi-c08.top/bienban', 'http://tra-cuu-phatnguoi-c08.top/bienban', now(), now())
      , ('CRYPTO', 'binance-vip-asia-trade.cc', 'https://binance-vip-asia-trade.cc', now(), now())

 UNION ALL

 SELECT v.type, v.value, v.display_value, CAST('2026-07-01 00:00:00' AS timestamp), pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP)
 FROM ((VALUES ('URL', 'dashboard-viec-lam.example', 'https://dashboard-viec-lam.example'), ('BANK_ACCOUNT', 'MOCK-DASH-STK-001', 'Tài khoản giả mạo ngân hàng 001'), ('PHONE', '0919000001', 'Số điện thoại giả danh cơ quan chức năng'), ('PHONE', '0919000002', 'Số điện thoại dụ cung cấp OTP'), ('URL', 'dashboard-trung-thuong.example', 'https://dashboard-trung-thuong.example'), ('URL', 'dashboard-pending.example', 'Đối tượng chưa được xác thực'), ('URL', 'dashboard-retracted.example', 'Đối tượng đã thu hồi khỏi blacklist'), ('BANK_ACCOUNT', 'MOCK-DASH-STK-OLD', 'Tài khoản đã xác thực từ kỳ trước'), ('URL', 'dashboard-q3-2026.example', 'Hồ sơ việc làm quý 3/2026'), ('URL', 'dashboard-q4-2026.example', 'Hồ sơ trúng thưởng quý 4/2026'), ('URL', 'dashboard-july-2026.example', 'Hồ sơ tháng 7/2026 để so sánh'))) AS v (type, value, display_value)
 WHERE NOT EXISTS (SELECT 1
                   FROM indicators AS i
                   WHERE i.normalized_value = v.value AND i.type = v.type))

UNION ALL

SELECT v.type, v.value, v.display_value, pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP) - CAST('10 days' AS interval), pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP)
FROM ((VALUES ('URL', 'dispute-pending.example', 'dispute-pending.example')
            , ('PHONE', '0919000091', '091.900.0091 (Hotline doanh nghiệp mẫu)')
            , ('BANK_ACCOUNT', 'MOCK-DSP-BANK-001', 'STK Techcombank 1029999.xxxx (mẫu)')
            , ('URL', 'dispute-techcorp.example', 'dispute-techcorp.example')
            , ('PHONE', '0919000092', '091.900.0092 (Hotline đã được giải tỏa)')
            , ('URL', 'dispute-rejected.example', 'dispute-rejected.example')
            , ('URL', 'dispute-partner.example', 'dispute-partner.example')
            , ('BANK_ACCOUNT', 'MOCK-DSP-BANK-002', '1029999.xxxx')
            , ('PHONE', '0919000094', '091.900.0094')
            , ('URL', 'dispute-review-shop.example', 'dispute-review-shop.example')
            , ('URL', 'dispute-supplement-overdue.example', 'dispute-supplement-overdue.example')
            , ('URL', 'dispute-approved-active.example', 'dispute-approved-active.example')
            , ('BANK_ACCOUNT', 'MOCK-DSP-BANK-003', '1902999.xxxx')
            , ('URL', 'dispute-khoi-verified.example', 'Tên miền chính chủ của Trần Minh Khôi')
            , ('BANK_ACCOUNT', 'MOCK-DSP-LINH-VERIFIED', 'Tài khoản chính chủ của Phạm Ngọc Linh'))) AS v (type, value, display_value)
WHERE NOT EXISTS (SELECT 1
                  FROM indicators AS i
                  WHERE i.type = v.type AND i.normalized_value = v.value);

-- URL blacklist từ dữ liệu đầu vào ngày 30/10/2026.
WITH source_data (normalized_value, display_value, source_created_at) AS (
    VALUES
    ('formulary-hype-squad-event.com', 'http://formulary-hype-squad-event.com', '2026-10-30T12:36:04.616208'),
    ('23.94.136.170', 'https://23.94.136.170', '2026-10-30T12:36:24.728818'),
    ('id9828.shop', 'https://id9828.shop', '2026-10-30T06:04:20.056137'),
    ('biuvca.top', 'http://biuvca.top', '2026-10-30T09:02:50.500653'),
    ('1.20.150.71', 'https://1.20.150.71', '2026-10-30T12:43:01.478159'),
    ('fq8bgcyp3t.suijidaohxl.top', 'https://fq8bgcyp3t.suijidaohxl.top', '2026-10-30T17:36:28.007160'),
    ('juzhen202601.com', 'https://juzhen202601.com', '2026-10-30T00:54:15.483993'),
    ('327012.xyz', 'https://327012.xyz', '2026-10-30T07:57:45.182729'),
    ('ka7edrsxzm.suijidaohxl.top', 'https://ka7edrsxzm.suijidaohxl.top', '2026-10-30T05:41:11.956587'),
    ('ggptt.biz', 'https://ggptt.biz', '2026-10-30T08:32:36.786801'),
    ('777t87u8.weebly.com', 'http://777t87u8.weebly.com', '2026-10-30T04:24:34.869650'),
    ('yhhld.gpjfuh.info', 'http://yhhld.gpjfuh.info', '2026-10-30T13:12:28.172399'),
    ('mail.calvarylight.com', 'https://mail.calvarylight.com', '2026-10-30T15:43:15.220558'),
    ('xgtnkehtzn.suijidaohxl.top', 'https://xgtnkehtzn.suijidaohxl.top', '2026-10-30T09:15:13.334365'),
    ('15.181.16.225', 'http://15.181.16.225', '2026-10-30T15:40:09.711871'),
    ('dros-spaz-vlin-145-krum-zlantex-vub-680.pages.dev', 'http://dros-spaz-vlin-145-krum-zlantex-vub-680.pages.dev', '2026-10-30T16:22:19.486451'),
    ('padgnwtnm4.suijidaohxl.top', 'http://padgnwtnm4.suijidaohxl.top', '2026-10-30T09:13:25.490353'),
    ('netflixnet.webmailsegurancasempreltda.store', 'https://netflixnet.webmailsegurancasempreltda.store', '2026-10-30T11:48:40.414509'),
    ('ntdy8m8yac.3355799com-dh.top', 'http://ntdy8m8yac.3355799com-dh.top', '2026-10-30T11:21:03.315340'),
    ('kcdxh8n5hd.suijidaohxl.top', 'https://kcdxh8n5hd.suijidaohxl.top', '2026-10-30T06:04:27.276699'),
    ('mebh4hbwyy.suijidaohxl.top', 'http://mebh4hbwyy.suijidaohxl.top', '2026-10-30T12:04:08.474174'),
    ('revollutbonus.cfd', 'http://revollutbonus.cfd', '2026-10-30T13:13:08.300768'),
    ('uhsvdcnvvvd.cfd', 'http://uhsvdcnvvvd.cfd', '2026-10-30T17:23:27.421381'),
    ('rtryfx.blogspot.gr', 'http://rtryfx.blogspot.gr', '2026-10-30T03:33:33.370457'),
    ('24onlinetradecity.live', 'https://24onlinetradecity.live', '2026-10-30T02:57:21.192455'),
    ('t3w8yf5ji2.suijidaohxl.top', 'https://t3w8yf5ji2.suijidaohxl.top', '2026-10-30T11:54:13.211672'),
    ('sso-ledgr-com-strt.square.site', 'https://sso-ledgr-com-strt.square.site', '2026-10-30T02:54:02.813645'),
    ('atualizacao-mais-seguro-cliente-empresa.000webhostapp.com', 'https://atualizacao-mais-seguro-cliente-empresa.000webhostapp.com', '2026-10-30T04:00:34.218689'),
    ('mailsyncsss.weebly.com', 'https://mailsyncsss.weebly.com', '2026-10-30T11:44:25.232083'),
    ('authorityphire.weebly.com', 'https://authorityphire.weebly.com', '2026-10-30T01:41:05.350659'),
    ('jhophiqnkjbbntyjvwn.com', 'http://jhophiqnkjbbntyjvwn.com', '2026-10-30T01:32:32.343148'),
    ('com-trackesven.top', 'http://com-trackesven.top', '2026-10-30T08:42:22.357694'),
    ('sk3ecncejy.suijidaohxl.top', 'https://sk3ecncejy.suijidaohxl.top', '2026-10-30T06:06:40.659054'),
    ('8fbwgu.dzwiekuje.pl', 'http://8fbwgu.dzwiekuje.pl', '2026-10-30T10:50:08.499923'),
    ('t-mobile.ztrskf.top', 'http://t-mobile.ztrskf.top', '2026-10-30T08:36:32.095723'),
    ('myhammockvacations.worldofpowerfulyouth.org', 'http://myhammockvacations.worldofpowerfulyouth.org', '2026-10-30T13:12:54.871059'),
    ('wwuwwwiki2.aomngbr.cc', 'https://wwuwwwiki2.aomngbr.cc', '2026-10-30T08:33:15.150952'),
    ('6g1adz4wfw.622629dhxl.top', 'https://6g1adz4wfw.622629dhxl.top', '2026-10-30T18:15:10.662594'),
    ('teaezorapp.webflow.io', 'http://teaezorapp.webflow.io', '2026-10-30T21:29:18.025024'),
    ('officialpostship.top', 'http://officialpostship.top', '2026-10-30T03:27:09.211588'),
    ('haodage.cc', 'http://haodage.cc', '2026-10-30T09:27:09.187602'),
    ('222.149.49.160', 'http://222.149.49.160', '2026-10-30T02:22:14.907119'),
    ('thebergsignal-gpt.com', 'http://thebergsignal-gpt.com', '2026-10-30T01:53:17.472520'),
    ('tseswfz.blogspot.am', 'http://tseswfz.blogspot.am', '2026-10-30T11:21:29.063229'),
    ('mentyxrx4y.3355799com-dh.top', 'https://mentyxrx4y.3355799com-dh.top', '2026-10-30T10:34:00.929465'),
    ('iph5sayjxx.suijidaohxl.top', 'http://iph5sayjxx.suijidaohxl.top', '2026-10-30T06:42:54.364857'),
    ('1kxykd5bga.622629dhxl.top', 'http://1kxykd5bga.622629dhxl.top', '2026-10-30T01:32:08.402252'),
    ('bakermeekins.com', 'https://bakermeekins.com', '2026-10-30T16:08:15.103403'),
    ('rpkfxtr7jk.suijidaohxl.top', 'http://rpkfxtr7jk.suijidaohxl.top', '2026-10-30T07:51:08.090586'),
    ('ww17.uhdmovies.foo', 'https://ww17.uhdmovies.foo', '2026-10-30T16:05:11.721363')
)
INSERT INTO indicators
    (type, normalized_value, display_value, first_seen_at, last_seen_at, created_at, updated_at)
SELECT
    'URL', source_data.normalized_value, source_data.display_value,
    source_data.source_created_at::timestamp,
    source_data.source_created_at::timestamp,
    source_data.source_created_at::timestamp,
    CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh'
FROM source_data
WHERE NOT EXISTS (
    SELECT 1 FROM indicators existing
    WHERE existing.type = 'URL'
      AND existing.normalized_value = source_data.normalized_value
);

-- 10 URL whitelist: lưu indicator trước khi gắn xác minh bên dưới.
INSERT INTO indicators (type, normalized_value, display_value, first_seen_at, last_seen_at, created_at, updated_at)
SELECT 'URL', v.domain, v.url, v.source_created_at::timestamp,
       v.source_created_at::timestamp, v.source_created_at::timestamp,
       CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh'
FROM (VALUES
    ('oviland.ru', 'https://oviland.ru', '2026-08-27T08:40:15.088962'),
    ('nyulawglobal.org', 'https://nyulawglobal.org', '2026-08-27T08:40:15.088962'),
    ('brooklynfabric.com', 'https://brooklynfabric.com', '2026-08-27T08:40:15.088962'),
    ('nar.az', 'https://nar.az', '2026-08-27T08:40:15.088962'),
    ('vmos.cn', 'https://vmos.cn', '2026-08-27T08:40:15.088962'),
    ('crockford.com', 'https://crockford.com', '2026-08-27T08:40:15.088962'),
    ('portaransas.org', 'https://portaransas.org', '2026-08-27T08:40:15.088962'),
    ('assortedinternet.com', 'https://assortedinternet.com', '2026-08-27T08:40:15.088962'),
    ('koreagift.com', 'https://koreagift.com', '2026-08-27T08:40:15.088962'),
    ('oshioshi.co.il', 'https://oshioshi.co.il', '2026-08-27T08:40:15.088962')
) AS v(domain, url, source_created_at)
WHERE NOT EXISTS (
    SELECT 1 FROM indicators i
    WHERE i.type = 'URL' AND i.normalized_value = v.domain
);

-- 12. partner_profiles
-- Tài khoản mẫu riêng cho từng website; email miền .test không đại diện chủ sở hữu thật.
INSERT INTO users (full_name, phone_number, email, password_hash, role_id, status, reputation_points,
                   is_phone_verified, created_at, updated_at)
SELECT v.brand_name, v.phone_number, 'partner+' || v.domain || '@scamshield.test',
       '$2a$10$KjgQ5SG4mGFr37olOMAkxu4F4ekYORUUEleshwHskaOakgnZ.edu2',
       r.id, 'ACTIVE', 0, false,
       CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh',
       CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh'
FROM (VALUES
    ('oviland.ru', 'Овиленд', '0900000101'),
    ('nyulawglobal.org', 'Hauser Global Law School Program', '0900000102'),
    ('brooklynfabric.com', 'Brooklyn Fabric Company', '0900000103'),
    ('nar.az', 'Nar', '0900000104'),
    ('vmos.cn', 'VMOS', '0900000105'),
    ('crockford.com', 'Douglas Crockford', '0900000106'),
    ('portaransas.org', 'Port Aransas Chamber of Commerce & Tourist Bureau', '0900000107'),
    ('assortedinternet.com', 'Assorted Internet', '0900000108'),
    ('koreagift.com', '고려기프트', '0900000109'),
    ('oshioshi.co.il', 'אושי אושי', '0900000110')
) AS v(domain, brand_name, phone_number)
JOIN roles r ON r.name = 'BUSINESS_PARTNER'
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = 'partner+' || v.domain || '@scamshield.test');

-- Tên pháp lý dùng theo nguồn công khai khi có; nếu chưa rõ, dùng nhãn website làm dữ liệu mẫu.
-- VERIFIED ở đây là trạng thái mock của whitelist, không xác nhận quan hệ đối tác thật.
INSERT INTO partner_profiles (user_id, legal_name, brand_name,
                              verification_status, verified_by, verified_at,
                              official_domain, created_at, updated_at)
SELECT u.id, v.legal_name, v.brand_name, 'VERIFIED', admin.id,
       CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh',
       v.domain, CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh',
       CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh'
FROM (VALUES
    ('shopee.vn', 'Công ty TNHH Shopee', 'Shopee'),
    ('oviland.ru', 'ИП Текунов И.С.', 'Овиленд'),
    ('nyulawglobal.org', 'New York University School of Law', 'Hauser Global Law School Program'),
    ('brooklynfabric.com', 'Brooklyn Fabric Company', 'Brooklyn Fabric Company'),
    ('nar.az', 'Azerfon LLC', 'Nar'),
    ('vmos.cn', 'VMOS', 'VMOS'),
    ('crockford.com', 'Douglas Crockford', 'Douglas Crockford'),
    ('portaransas.org', 'Port Aransas Chamber of Commerce & Tourist Bureau', 'Visit Port Aransas'),
    ('assortedinternet.com', 'Assorted Internet', 'Assorted Internet'),
    ('koreagift.com', '고려기프트(주)', '고려기프트'),
    ('oshioshi.co.il', 'אושי אושי', 'אושי אושי')
) AS v(domain, legal_name, brand_name)
JOIN users u ON u.email = CASE
    WHEN v.domain = 'shopee.vn' THEN 'partner@shopee.vn'
    ELSE 'partner+' || v.domain || '@scamshield.test'
END
JOIN users admin ON admin.email = 'admin@scamshield.vn'
WHERE NOT EXISTS (SELECT 1 FROM partner_profiles p WHERE p.user_id = u.id);

-- 13. whitelist_entries
INSERT INTO whitelist_entries (partner_id, indicator_id, verification_status,
                               verified_by, verified_at, auto_lock_moderation, created_at, updated_at)
SELECT p.id, i.id, 'VERIFIED', u.id,
       CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh', true,
       CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh',
       CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh'
FROM (VALUES
    ('URL', 'shopee.vn'),
    ('URL', 'oviland.ru'),
    ('URL', 'nyulawglobal.org'),
    ('URL', 'brooklynfabric.com'),
    ('URL', 'nar.az'),
    ('URL', 'vmos.cn'),
    ('URL', 'crockford.com'),
    ('URL', 'portaransas.org'),
    ('URL', 'assortedinternet.com'),
    ('URL', 'koreagift.com'),
    ('URL', 'oshioshi.co.il')
) AS v(indicator_type, indicator_value)
JOIN users u ON u.email = 'admin@scamshield.vn'
JOIN partner_profiles p ON p.official_domain = v.indicator_value
JOIN LATERAL (
    SELECT id FROM indicators
    WHERE type = v.indicator_type AND normalized_value = v.indicator_value
    ORDER BY id LIMIT 1
) i ON true
WHERE NOT EXISTS (
    SELECT 1 FROM whitelist_entries w
    WHERE w.partner_id = p.id AND w.indicator_id = i.id
      AND w.verification_status = 'VERIFIED'
);

-- 14. check_requests
INSERT INTO check_requests (user_id, input_type, raw_input, normalized_input, masked_input, status, created_at) VALUES
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'PHONE', 'Thông báo thuê bao sẽ bị khóa chiều sau 2 giờ do vi phạm quy định viễn thông...', '0912443882', '+84 912.443.882', 'COMPLETED', NOW() - INTERVAL '1 hour'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'URL', 'Link yêu cầu tải file APK "Dịch vụ công Bộ Công An v2.8" giả mạo đánh cắp mã OTP.', 'dichvucong-vneid-capnhat.gov-vn.info/apk', 'https://dichvucong-vneid-capnhat.gov-vn.info/ap...', 'COMPLETED', NOW() - INTERVAL '3 hours'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'SMS_BANK', '"VCB Digibank: QK dang thuc hien giao dich 2,500,000 VND tai he thong POS..."', 'vietcombank', 'SMS Brandname: Vietcombank', 'COMPLETED', NOW() - INTERVAL '6 hours'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'TELEGRAM', '"Việc nhẹ làm tại nhà 400k-800k/ngày, duyệt đơn hàng nhận hoa hồng ngay lập tức..."', '@tuyendungshopeemall_hr', 'Zalo/Telegram: @TuyenDungShopeeMall_HR', 'COMPLETED', NOW() - INTERVAL '12 hours'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'BANK_ACCOUNT', 'Tài khoản cá nhân giao dịch mua bán đồ gia dụng online trên hội nhóm mạng xã hội.', '104889201992', 'STK: 104889201992 - VPBank (VU HOANG ANH)', 'COMPLETED', NOW() - INTERVAL '1 day'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'TRAFFIC_FINE', '"Cục Cảnh sát giao thông thông báo phương tiện 29A-883.xx có biên bản phạt nguội..."', 'tra-cuu-phatnguoi-c08.top/bienban', 'http://tra-cuu-phatnguoi-c08.top/bienban', 'COMPLETED', NOW() - INTERVAL '2 days'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'CRYPTO', '"Nạp USDT cam kết lợi nhuận 3.5%/ngày, bảo hiểm vốn 100% bởi quỹ ủy thác..."', 'binance-vip-asia-trade.cc', 'https://binance-vip-asia-trade.cc', 'COMPLETED', NOW() - INTERVAL '3 days');

-- 15. extracted_iocs
INSERT INTO extracted_iocs (check_request_id, indicator_id, extraction_method, created_at) VALUES
((SELECT id FROM check_requests WHERE normalized_input='0912443882' LIMIT 1), (SELECT id FROM indicators WHERE normalized_value='0912443882'), 'REGEX', NOW()),
((SELECT id FROM check_requests WHERE normalized_input='dichvucong-vneid-capnhat.gov-vn.info/apk' LIMIT 1), (SELECT id FROM indicators WHERE normalized_value='dichvucong-vneid-capnhat.gov-vn.info/apk'), 'REGEX', NOW()),
((SELECT id FROM check_requests WHERE normalized_input='vietcombank' LIMIT 1), (SELECT id FROM indicators WHERE normalized_value='vietcombank'), 'REGEX', NOW()),
((SELECT id FROM check_requests WHERE normalized_input='@tuyendungshopeemall_hr' LIMIT 1), (SELECT id FROM indicators WHERE normalized_value='@tuyendungshopeemall_hr'), 'REGEX', NOW()),
((SELECT id FROM check_requests WHERE normalized_input='104889201992' LIMIT 1), (SELECT id FROM indicators WHERE normalized_value='104889201992'), 'REGEX', NOW()),
((SELECT id FROM check_requests WHERE normalized_input='tra-cuu-phatnguoi-c08.top/bienban' LIMIT 1), (SELECT id FROM indicators WHERE normalized_value='tra-cuu-phatnguoi-c08.top/bienban'), 'REGEX', NOW()),
((SELECT id FROM check_requests WHERE normalized_input='binance-vip-asia-trade.cc' LIMIT 1), (SELECT id FROM indicators WHERE normalized_value='binance-vip-asia-trade.cc'), 'REGEX', NOW());

-- 16. rule_definitions
INSERT INTO rule_definitions (code, name, rule_type, version, is_active, is_frozen, created_at, updated_at) VALUES
('R001', 'Phát hiện tên miền trúng thưởng ảo', 'URL_PATTERN', 1, true, false, NOW(), NOW());

-- 17. reports
-- Đúng 10 báo cáo: mỗi người gửi 2 hồ sơ, đủ bốn trạng thái và có region_code.
-- reported_message là nguyên văn tin nhắn tùy chọn, độc lập với mô tả sự việc.
INSERT INTO reports (reporter_user_id, indicator_id, status, category_id, region_code,
                     description, reported_message, created_at, updated_at)
SELECT u.id, i.id, v.status, c.id, v.region_code,
       'REPORT-MOCK:' || v.key || ' — ' || v.description, v.reported_message,
       (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') - v.hours_ago * INTERVAL '1 hour',
       (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') - v.hours_ago * INTERVAL '1 hour'
            + CASE WHEN v.status IN ('APPROVED', 'REJECTED') THEN INTERVAL '30 minutes' ELSE INTERVAL '15 minutes' END
FROM (VALUES
    ('khoi-01', 'khoi.tran@gmail.com', 'shopee.vn', 'VIEC_LAM', '01', 'REJECTED', 24, 'Báo cáo website chính thức nhưng chưa cung cấp căn cứ chứng minh hành vi giả mạo.', NULL),
    ('khoi-05', 'khoi.tran@gmail.com', 'dichvucong-vneid-capnhat.gov-vn.info/apk', 'MALWARE', '01', 'APPROVED', 240, 'Liên kết giả VNeID yêu cầu tải ứng dụng ngoài kho chính thức.', 'Truy cập đường dẫn để cập nhật VNeID và tải ứng dụng xác minh.'),
    ('ha-01', 'ha.le@gmail.com', 'shopee.vn', 'VIEC_LAM', '48', 'REJECTED', 36, 'Nhầm trang thương mại điện tử chính thức với trang tuyển dụng giả mạo.', NULL),
    ('ha-05', 'ha.le@gmail.com', 'shopee.vn', 'TRUNG_THUONG', '48', 'REJECTED', 192, 'Lặp lại cáo buộc với website chính thức dù chưa có bằng chứng mới.', NULL),
    ('bao-01', 'bao.nguyen@gmail.com', '0987654321', 'GIA_DANH_CQCN', '31', 'PENDING', 72, 'Người gọi tự xưng công an và yêu cầu chuyển tiền sang tài khoản an toàn.', 'Tài khoản của bạn liên quan vụ án. Chuyển tiền vào tài khoản an toàn để xác minh.'),
    ('bao-05', 'bao.nguyen@gmail.com', 'vietcombank', 'TRUNG_THUONG', '31', 'REJECTED', 336, 'Chỉ có tên người gửi SMS, chưa cung cấp nội dung hay đường dẫn khả nghi.', NULL),
    ('linh-01', 'linh.pham@gmail.com', '0912443882', 'VIEN_THONG', '92', 'PENDING', 24, 'Cuộc gọi thông báo thuê bao sắp bị khóa và yêu cầu xác minh danh tính.', 'Thuê bao sẽ bị khóa trong 2 giờ. Vui lòng cung cấp mã OTP để tiếp tục sử dụng.'),
    ('linh-05', 'linh.pham@gmail.com', 'shopee.vn', 'VIEC_LAM', '92', 'REJECTED', 216, 'Gửi cáo buộc nhắm vào website chính thức mà không nêu giao dịch liên quan.', NULL),
    ('vana-02', 'nguyenvana@gmail.com', 'shopee.vn', 'VIEC_LAM', '79', 'REJECTED', 216, 'Báo cáo trùng lặp về tên miền chính thức, không có bằng chứng bổ sung.', NULL),
    ('vana-03', 'nguyenvana@gmail.com', '104889201992', 'VIEC_LAM', '79', 'IN_REVIEW', 48, 'Tài khoản nhận tiền đặt cọc để mở nhiệm vụ mua hàng hoàn tiền.', 'Chuyển khoản đặt cọc để mở tài khoản làm nhiệm vụ và nhận hoa hồng.')
) AS v(key, email, indicator_value, category_code, region_code, status, hours_ago, description, reported_message)
JOIN users u ON u.email = v.email
JOIN indicators i ON i.normalized_value = v.indicator_value
JOIN scam_categories c ON c.code = v.category_code
WHERE NOT EXISTS (SELECT 1 FROM reports r WHERE r.description = 'REPORT-MOCK:' || v.key || ' — ' || v.description);

-- 18. confirmed_indicators
INSERT INTO confirmed_indicators (indicator_id, category_id, status, confirmed_by, confirmed_at, retracted_at, retraction_reason, public_reason)
(VALUES ((SELECT id FROM indicators WHERE normalized_value = 'nhanqua-shopee.vip'), (SELECT id FROM scam_categories WHERE code = 'VIEC_LAM'), 'ACTIVE', (SELECT id FROM users WHERE email = 'admin@scamshield.vn'), now(), CAST(NULL AS timestamp), CAST(NULL AS text), CAST(NULL AS text))
      , ((SELECT id FROM indicators WHERE normalized_value = '0912443882'), (SELECT id FROM scam_categories WHERE code = 'VIEN_THONG'), 'ACTIVE', (SELECT id FROM users WHERE email = 'admin@scamshield.vn'), now() + CAST('1 hour' AS interval), CAST(NULL AS timestamp), CAST(NULL AS text), CAST(NULL AS text))
      , ((SELECT id FROM indicators WHERE normalized_value = 'dichvucong-vneid-capnhat.gov-vn.info/apk'), (SELECT id FROM scam_categories WHERE code = 'MALWARE'), 'ACTIVE', (SELECT id FROM users WHERE email = 'admin@scamshield.vn'), now(), CAST(NULL AS timestamp), CAST(NULL AS text), CAST(NULL AS text))
      , ((SELECT id FROM indicators WHERE normalized_value = 'tra-cuu-phatnguoi-c08.top/bienban'), (SELECT id FROM scam_categories WHERE code = 'CSGT'), 'ACTIVE', (SELECT id FROM users WHERE email = 'admin@scamshield.vn'), now(), CAST(NULL AS timestamp), CAST(NULL AS text), CAST(NULL AS text))
      , ((SELECT id FROM indicators WHERE normalized_value = 'binance-vip-asia-trade.cc'), (SELECT id FROM scam_categories WHERE code = 'FOREX'), 'ACTIVE', (SELECT id FROM users WHERE email = 'admin@scamshield.vn'), now(), CAST(NULL AS timestamp), CAST(NULL AS text), CAST(NULL AS text))

 UNION ALL

 SELECT i.id, c.id, v.status, u.id, COALESCE(v.fixed_at, date_trunc('day', pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP)) + v.day_offset * CAST('1 day' AS interval)), CASE WHEN v.status = 'RETRACTED' THEN date_trunc('day', pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP)) - CAST('2 days' AS interval) ELSE NULL END, CASE WHEN v.status = 'RETRACTED' THEN 'Dữ liệu mẫu: bằng chứng không hợp lệ, đã thu hồi xác thực' ELSE NULL END, 'Dữ liệu mẫu phục vụ kiểm thử dashboard'
 FROM ((VALUES ('dashboard-viec-lam.example', 'VIEC_LAM', 'ACTIVE', -1, CAST(NULL AS timestamp))
             , ('MOCK-DASH-STK-001', 'GIA_DANH_NGAN_HANG', 'ACTIVE', -4, CAST(NULL AS timestamp))
             , ('0919000001', 'GIA_DANH_CQCN', 'ACTIVE', -2, CAST(NULL AS timestamp))
             , ('0919000002', 'DANH_CAP_OTP', 'ACTIVE', 0, CAST(NULL AS timestamp))
             , ('dashboard-trung-thuong.example', 'TRUNG_THUONG', 'ACTIVE', -5, CAST(NULL AS timestamp))
             , ('dashboard-retracted.example', 'TRUNG_THUONG', 'RETRACTED', -9, CAST(NULL AS timestamp))
             , ('MOCK-DASH-STK-OLD', 'GIA_DANH_NGAN_HANG', 'ACTIVE', -45, CAST(NULL AS timestamp))
             , ('dashboard-q3-2026.example', 'VIEC_LAM', 'ACTIVE', NULL, CAST('2026-09-30 23:59:59' AS timestamp))
             , ('dashboard-q4-2026.example', 'TRUNG_THUONG', 'ACTIVE', NULL, CAST('2026-10-06 08:00:00' AS timestamp))
             , ('dashboard-july-2026.example', 'VIEC_LAM', 'ACTIVE', NULL, CAST('2026-07-16 08:00:00' AS timestamp)))) AS v (value, category_code, status, day_offset, fixed_at)
      INNER JOIN indicators AS i ON i.normalized_value = v.value
      INNER JOIN scam_categories AS c ON c.code = v.category_code
      INNER JOIN users AS u ON u.email = 'admin@scamshield.vn'
 WHERE NOT EXISTS (SELECT 1
                   FROM confirmed_indicators AS ci
                   WHERE ci.indicator_id = i.id))

UNION ALL

SELECT i.id, c.id, v.status, u.id, pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP) - CAST('10 days' AS interval), CASE WHEN v.status = 'RETRACTED' THEN pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP) + v.retracted_offset ELSE NULL END, CASE WHEN v.status = 'RETRACTED' THEN 'Dữ liệu mẫu: khiếu nại được chấp nhận, thu hồi xác thực sai' ELSE NULL END, 'Dữ liệu mẫu phục vụ kiểm thử danh sách khiếu nại'
FROM ((VALUES ('dispute-pending.example', 'VIEC_LAM', 'ACTIVE', CAST(NULL AS interval))
            , ('0919000091', 'GIA_DANH_CQCN', 'ACTIVE', CAST(NULL AS interval))
            , ('MOCK-DSP-BANK-001', 'GIA_DANH_NGAN_HANG', 'ACTIVE', CAST(NULL AS interval))
            , ('dispute-techcorp.example', 'GIA_DANH_CQCN', 'RETRACTED', - CAST('84 hours' AS interval))
            , ('0919000092', 'GIA_DANH_CQCN', 'RETRACTED', - CAST('54 hours' AS interval))
            , ('dispute-rejected.example', 'VIEC_LAM', 'ACTIVE', CAST(NULL AS interval))
            , ('dispute-partner.example', 'VIEC_LAM', 'ACTIVE', CAST(NULL AS interval))
            , ('MOCK-DSP-BANK-002', 'GIA_DANH_NGAN_HANG', 'ACTIVE', CAST(NULL AS interval))
            , ('0919000094', 'GIA_DANH_CQCN', 'ACTIVE', CAST(NULL AS interval))
            , ('dispute-review-shop.example', 'VIEC_LAM', 'ACTIVE', CAST(NULL AS interval))
            , ('dispute-supplement-overdue.example', 'VIEC_LAM', 'ACTIVE', CAST(NULL AS interval))
            , ('dispute-approved-active.example', 'GIA_DANH_CQCN', 'RETRACTED', - CAST('3 hours' AS interval))
            , ('MOCK-DSP-BANK-003', 'GIA_DANH_NGAN_HANG', 'ACTIVE', CAST(NULL AS interval))
            , ('dispute-khoi-verified.example', 'VIEC_LAM', 'RETRACTED', - CAST('24 hours' AS interval))
            , ('MOCK-DSP-LINH-VERIFIED', 'GIA_DANH_NGAN_HANG', 'RETRACTED', - CAST('12 hours' AS interval)))) AS v (value, category_code, status, retracted_offset)
     INNER JOIN indicators AS i ON i.normalized_value = v.value
     INNER JOIN scam_categories AS c ON c.code = v.category_code
     INNER JOIN users AS u ON u.email = 'admin@scamshield.vn'
WHERE NOT EXISTS (SELECT 1
                  FROM confirmed_indicators AS ci
                  WHERE ci.indicator_id = i.id);

-- 19. report_evidence
-- Đúng 15 minh chứng cho 10 báo cáo; URL là dữ liệu mẫu, không phải tệp thực.
-- 5 báo cáo đầu có 2 tệp, 5 báo cáo còn lại có 1 tệp.
INSERT INTO report_evidence (report_id, evidence_type, file_name, file_url, verification_status, created_at)
SELECT r.id, v.evidence_type, v.file_name,
       'https://files.example/reports/' || v.report_key || '/' || v.file_name,
       CASE r.status WHEN 'APPROVED' THEN 'VERIFIED' WHEN 'REJECTED' THEN 'REJECTED' ELSE 'PENDING' END,
       r.created_at
FROM (VALUES
    ('khoi-01', 'doan-chat.png', 'PNG'),
    ('khoi-01', 'bien-lai.pdf', 'PDF'),
    ('khoi-05', 'doan-chat.png', 'PNG'),
    ('khoi-05', 'bien-lai.pdf', 'PDF'),
    ('ha-01', 'doan-chat.png', 'PNG'),
    ('ha-01', 'bien-lai.pdf', 'PDF'),
    ('ha-05', 'doan-chat.png', 'PNG'),
    ('ha-05', 'bien-lai.pdf', 'PDF'),
    ('bao-01', 'doan-chat.png', 'PNG'),
    ('bao-01', 'bien-lai.pdf', 'PDF'),
    ('bao-05', 'doan-chat.png', 'PNG'),
    ('linh-01', 'doan-chat.png', 'PNG'),
    ('linh-05', 'doan-chat.png', 'PNG'),
    ('vana-02', 'doan-chat.png', 'PNG'),
    ('vana-03', 'doan-chat.jpg', 'JPG')
) AS v(report_key, file_name, evidence_type)
JOIN reports r ON r.description LIKE 'REPORT-MOCK:' || v.report_key || ' — %'
WHERE NOT EXISTS (SELECT 1 FROM report_evidence e WHERE e.report_id = r.id AND e.file_name = v.file_name);

-- 20. moderation_actions
-- Chỉ các báo cáo đã APPROVED/REJECTED mới có quyết định; giữ lý do phù hợp với kết quả.
INSERT INTO moderation_actions (report_id, moderator_user_id, action, reason, previous_status, new_status, created_at)
SELECT r.id, moderator.id,
       CASE WHEN r.status = 'APPROVED' THEN 'APPROVE' ELSE 'REJECT' END,
       CASE WHEN r.status = 'APPROVED'
            THEN 'Đã đối chiếu nội dung báo cáo với đối tượng và xác nhận dấu hiệu lừa đảo.'
            ELSE 'Từ chối báo cáo do trùng lặp, nhầm đối tượng hoặc chưa đủ căn cứ xác minh.' END,
       'IN_REVIEW', r.status, r.updated_at
FROM reports r
JOIN users moderator ON moderator.email = 'moderator.phuong@scamshield.vn'
WHERE r.description LIKE 'REPORT-MOCK:%' AND r.status IN ('APPROVED', 'REJECTED')
  AND NOT EXISTS (SELECT 1 FROM moderation_actions a WHERE a.report_id = r.id);

-- 21. disputes
-- Các hồ sơ extra-* bổ sung 10 trường hợp từ 6 người gửi, đủ 5 trạng thái xử lý.
INSERT INTO disputes (confirmed_indicator_id, submitted_by_user_id, reason, status, created_at, submitter_name, submitter_contact, priority, progress_message, estimated_resolution_at, supplement_reason, supplement_deadline, assigned_to, resolved_by, resolution_reason, resolution_document_url, updated_at, resolved_at)
VALUES ((SELECT id FROM confirmed_indicators LIMIT 1), (SELECT id FROM users WHERE email = 'nguyenvana@gmail.com'), 'Trang này là web nội bộ của tôi, không lừa đảo', 'PENDING', now(), CAST(NULL AS text), CAST(NULL AS text), CAST('NORMAL' AS varchar), CAST(NULL AS text), CAST(NULL AS timestamp), CAST(NULL AS text), CAST(NULL AS timestamp), CAST(NULL AS bigint), CAST(NULL AS bigint), CAST(NULL AS text), CAST(NULL AS text), CAST(NULL AS timestamp), CAST(NULL AS timestamp))

UNION ALL

SELECT ci.id
     , u.id
     , 'DISPUTE-MOCK:' || v.key || ' — ' || v.reason
     , v.status
     , pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP) + v.created_offset
     , u.full_name
     , u.email
     , v.priority
     , v.progress_message
     , CASE
         WHEN v.estimated_offset IS NOT NULL THEN pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP) + v.estimated_offset
         ELSE NULL
       END
     , v.supplement_reason
     , CASE
         WHEN v.supplement_offset IS NOT NULL THEN pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP) + v.supplement_offset
         ELSE NULL
       END
     , CASE
         WHEN v.status <> 'PENDING' THEN reviewer.id
         ELSE NULL
       END
     , CASE
         WHEN v.status IN ('APPROVED', 'REJECTED') THEN reviewer.id
         ELSE NULL
       END
     , v.resolution_reason
     , v.resolution_document_url
     , CASE
         WHEN v.resolved_offset IS NOT NULL THEN pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP) + v.resolved_offset
         ELSE pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP)
       END
     , CASE
         WHEN v.resolved_offset IS NOT NULL THEN pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP) + v.resolved_offset
         ELSE NULL
       END
FROM ((VALUES ('pending-domain', 'dispute-pending.example', 'nguyenvana@gmail.com', 'Tên miền chính chủ bị gắn nhãn nhầm.', 'PENDING', 'NORMAL', 'Đã tiếp nhận hồ sơ, đang chờ phân công người thẩm định.', CAST('47 hours' AS interval), CAST(NULL AS text), CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS text), - CAST('1 hour' AS interval), CAST(NULL AS interval))
            , ('review-hotline', '0919000091', 'nguyenvana@gmail.com', 'Hotline doanh nghiệp bị nhầm với số mạo danh.', 'IN_REVIEW', 'HIGH', 'Đang đối chiếu giấy phép kinh doanh và chứng từ sở hữu đầu số.', CAST('22 hours' AS interval), CAST(NULL AS text), CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS text), - CAST('6 hours' AS interval), CAST(NULL AS interval))
            , ('supplement-bank', 'MOCK-DSP-BANK-001', 'nguyenvana@gmail.com', 'Tài khoản ngân hàng của tôi bị báo cáo sai.', 'NEEDS_MORE_INFO', 'NORMAL', 'Hồ sơ cần bổ sung bằng chứng trước khi tiếp tục thẩm định.', CAST(NULL AS interval), 'Vui lòng bổ sung sao kê giao dịch và giấy xác nhận chủ tài khoản.', CAST('2 days' AS interval), CAST(NULL AS text), CAST(NULL AS text), - CAST('1 day' AS interval), CAST(NULL AS interval))
            , ('restored-domain', 'dispute-techcorp.example', 'nguyenvana@gmail.com', 'Tên miền doanh nghiệp bị giả mạo dẫn đến gắn nhãn sai.', 'APPROVED', 'HIGH', 'Đã hoàn tất thẩm định và thu hồi xác thực blacklist sai.', CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS interval), 'Đã xác minh quyền sở hữu tên miền và chấp nhận khiếu nại. Xác thực blacklist trong ScamShield đã được thu hồi.', 'https://files.example/disputes/restored-domain/quyet-dinh-giai-toa.pdf', - CAST('96 hours' AS interval), - CAST('84 hours' AS interval))
            , ('restored-phone', '0919000092', 'nguyenvana@gmail.com', 'Số điện thoại chính chủ bị gắn nhãn sai.', 'APPROVED', 'NORMAL', 'Đã hoàn tất thẩm định và giải tỏa chỉ số trong ScamShield.', CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS interval), 'Chứng từ thuê đầu số hợp lệ; chấp nhận khiếu nại và thu hồi xác thực blacklist.', 'https://files.example/disputes/restored-phone/bien-ban-giai-toa.pdf', - CAST('72 hours' AS interval), - CAST('54 hours' AS interval))
            , ('rejected-domain', 'dispute-rejected.example', 'nguyenvana@gmail.com', 'Đề nghị xem xét lại kết quả xác thực tên miền.', 'REJECTED', 'NORMAL', 'Đã hoàn tất thẩm định, giữ nguyên xác thực blacklist.', CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS interval), 'Bằng chứng chưa chứng minh quyền sở hữu hợp lệ; khiếu nại bị từ chối, xác thực blacklist vẫn còn hiệu lực.', CAST(NULL AS text), - CAST('48 hours' AS interval), - CAST('1368 minutes' AS interval))
            , ('partner-private', 'dispute-partner.example', 'partner@shopee.vn', 'Hồ sơ riêng của tài khoản đối tác để kiểm tra phân quyền.', 'PENDING', 'NORMAL', 'Đã tiếp nhận hồ sơ của đối tác.', CAST('47 hours' AS interval), CAST(NULL AS text), CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS text), - CAST('2 hours' AS interval), CAST(NULL AS interval))
            , ('pending-bank', 'MOCK-DSP-BANK-002', 'nguyenvana@gmail.com', 'Đề nghị xác minh lại tài khoản ngân hàng bị báo cáo nhầm.', 'PENDING', 'NORMAL', 'Đã tiếp nhận hồ sơ tài khoản ngân hàng, chờ phân công thẩm định.', CAST('46 hours' AS interval), CAST(NULL AS text), CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS text), - CAST('2 hours' AS interval), CAST(NULL AS interval))
            , ('pending-phone-empty', '0919000094', 'nguyenvana@gmail.com', 'Số điện thoại cá nhân bị nhầm là số mạo danh.', 'PENDING', 'NORMAL', 'Đã tiếp nhận hồ sơ; chưa có tệp đính kèm.', CAST('47 hours' AS interval), CAST(NULL AS text), CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS text), - CAST('30 minutes' AS interval), CAST(NULL AS interval))
            , ('review-shop', 'dispute-review-shop.example', 'nguyenvana@gmail.com', 'Website cửa hàng chính chủ bị gắn nhãn lừa đảo.', 'IN_REVIEW', 'HIGH', 'Đang kiểm tra quyền quản trị tên miền và đối chiếu chứng từ giao dịch của cửa hàng.', CAST('4 hours' AS interval), CAST(NULL AS text), CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS text), - CAST('12 hours' AS interval), CAST(NULL AS interval))
            , ('supplement-overdue', 'dispute-supplement-overdue.example', 'nguyenvana@gmail.com', 'Yêu cầu xác minh lại tên miền bị gắn nhãn sai.', 'NEEDS_MORE_INFO', 'NORMAL', 'Chưa nhận được tài liệu bổ sung; hạn bổ sung đã hết.', CAST(NULL AS interval), 'Bổ sung chứng nhận sở hữu tên miền và hóa đơn của nhà đăng ký.', - CAST('1 day' AS interval), CAST(NULL AS text), CAST(NULL AS text), - CAST('3 days' AS interval), CAST(NULL AS interval))
            , ('approved-awaiting-retraction', 'dispute-approved-active.example', 'nguyenvana@gmail.com', 'Đã cung cấp bằng chứng quyền sở hữu tên miền hợp lệ.', 'APPROVED', 'HIGH', 'Đã chấp nhận khiếu nại và thu hồi xác thực blacklist.', CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS interval), 'Chấp nhận khiếu nại và thu hồi xác thực blacklist sai sau khi xác minh quyền sở hữu tên miền.', 'https://files.example/disputes/approved-awaiting-retraction/quyet-dinh.pdf', - CAST('9 hours' AS interval), - CAST('3 hours' AS interval))
            , ('rejected-bank', 'MOCK-DSP-BANK-003', 'nguyenvana@gmail.com', 'Đề nghị giải tỏa tài khoản ngân hàng đang bị cảnh báo.', 'REJECTED', 'NORMAL', 'Đã hoàn tất kiểm tra hồ sơ; giữ nguyên xác thực blacklist.', CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS interval), 'Tài liệu không khớp thông tin chủ tài khoản; từ chối khiếu nại.', CAST(NULL AS text), - CAST('36 hours' AS interval), - CAST('26 hours' AS interval))
            , ('extra-khoi-pending-bank', 'MOCK-DSP-BANK-001', 'khoi.tran@gmail.com', 'Tài khoản nhận tiền bán hàng của tôi bị gắn cảnh báo nhầm.', 'PENDING', 'HIGH', 'Đã tiếp nhận hồ sơ ngân hàng, đang chờ phân công người đối chiếu.', CAST('46 hours' AS interval), CAST(NULL AS text), CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS text), - CAST('2 hours' AS interval), CAST(NULL AS interval))
            , ('extra-khoi-approved-domain', 'dispute-khoi-verified.example', 'khoi.tran@gmail.com', 'Tên miền tuyển dụng nội bộ bị nhầm với trang tuyển cộng tác viên giả.', 'APPROVED', 'HIGH', 'Đã xác minh quyền sở hữu tên miền và thu hồi xác thực blacklist sai.', CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS interval), 'Chứng nhận tên miền và thông tin doanh nghiệp trùng khớp; chấp nhận khiếu nại.', CAST(NULL AS text), - CAST('72 hours' AS interval), - CAST('24 hours' AS interval))
            , ('extra-ha-review-phone', '0919000091', 'ha.le@gmail.com', 'Hotline chăm sóc khách hàng bị báo cáo là số mạo danh.', 'IN_REVIEW', 'HIGH', 'Đang đối chiếu hợp đồng đầu số và gọi xác minh đơn vị cung cấp dịch vụ.', CAST('24 hours' AS interval), CAST(NULL AS text), CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS text), - CAST('6 hours' AS interval), CAST(NULL AS interval))
            , ('extra-ha-needs-more-bank', 'MOCK-DSP-BANK-002', 'ha.le@gmail.com', 'Đề nghị kiểm tra lại cảnh báo trên tài khoản ngân hàng cá nhân.', 'NEEDS_MORE_INFO', 'NORMAL', 'Cần sao kê và giấy xác nhận ngân hàng để tiếp tục xử lý.', CAST(NULL AS interval), 'Bổ sung sao kê giao dịch và xác nhận chủ tài khoản trong 48 giờ.', CAST('2 days' AS interval), CAST(NULL AS text), CAST(NULL AS text), - CAST('48 hours' AS interval), CAST(NULL AS interval))
            , ('extra-bao-rejected-domain', 'dispute-rejected.example', 'bao.nguyen@gmail.com', 'Yêu cầu gỡ cảnh báo trên tên miền do tôi quản lý.', 'REJECTED', 'NORMAL', 'Đã hoàn tất thẩm định, giữ nguyên cảnh báo vì chưa xác minh được quyền sở hữu.', CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS interval), 'Tài liệu cung cấp không khớp tên miền và thông tin nhà đăng ký; từ chối khiếu nại.', CAST(NULL AS text), - CAST('96 hours' AS interval), - CAST('72 hours' AS interval))
            , ('extra-bao-pending-store', 'dispute-review-shop.example', 'bao.nguyen@gmail.com', 'Cửa hàng trực tuyến bị nhầm với website thu thập thông tin thẻ.', 'PENDING', 'NORMAL', 'Hồ sơ mới tiếp nhận, người gửi chưa đính kèm tài liệu.', CAST('47 hours' AS interval), CAST(NULL AS text), CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS text), - CAST('30 minutes' AS interval), CAST(NULL AS interval))
            , ('extra-linh-review-domain', 'dispute-pending.example', 'linh.pham@gmail.com', 'Đề nghị xác minh website chính chủ đang bị gắn cảnh báo sai.', 'IN_REVIEW', 'HIGH', 'Đã xác nhận người gửi, đang rà soát giao dịch và cấu hình tên miền.', CAST('6 hours' AS interval), CAST(NULL AS text), CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS text), - CAST('18 hours' AS interval), CAST(NULL AS interval))
            , ('extra-linh-approved-bank', 'MOCK-DSP-LINH-VERIFIED', 'linh.pham@gmail.com', 'Tài khoản ngân hàng chính chủ bị gắn cảnh báo do nhầm số tài khoản.', 'APPROVED', 'HIGH', 'Ngân hàng đã xác nhận thông tin chính chủ; xác thực blacklist được thu hồi.', CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS interval), 'Đã đối chiếu xác nhận ngân hàng và sao kê, chấp nhận khiếu nại do nhầm đối tượng.', CAST(NULL AS text), - CAST('36 hours' AS interval), - CAST('12 hours' AS interval))
            , ('extra-vana-overdue-phone', '0912443882', 'nguyenvana@gmail.com', 'Đề nghị xem xét lại cảnh báo giả mạo nhà mạng trên số điện thoại.', 'NEEDS_MORE_INFO', 'HIGH', 'Chưa nhận được chứng từ thuê bao và nội dung cuộc gọi, đã quá hạn bổ sung.', CAST(NULL AS interval), 'Cung cấp hợp đồng thuê bao và nội dung cuộc gọi cần đối chiếu.', - CAST('12 hours' AS interval), CAST(NULL AS text), CAST(NULL AS text), - CAST('72 hours' AS interval), CAST(NULL AS interval))
            , ('extra-partner-rejected-forex', 'binance-vip-asia-trade.cc', 'partner@shopee.vn', 'Đối tác đề nghị kiểm tra lại cảnh báo trên tên miền dịch vụ đầu tư.', 'REJECTED', 'NORMAL', 'Đã thẩm định hồ sơ của đối tác, giữ nguyên cảnh báo rủi ro.', CAST(NULL AS interval), CAST(NULL AS text), CAST(NULL AS interval), 'Không có tài liệu chứng minh quyền sở hữu tên miền và giấy phép dịch vụ phù hợp.', CAST(NULL AS text), - CAST('120 hours' AS interval), - CAST('96 hours' AS interval)))) AS v (key, value, email, reason, status, priority, progress_message, estimated_offset, supplement_reason, supplement_offset, resolution_reason, resolution_document_url, created_offset, resolved_offset)
     INNER JOIN indicators AS i ON i.normalized_value = v.value
     INNER JOIN confirmed_indicators AS ci ON ci.indicator_id = i.id
     INNER JOIN users AS u ON u.email = v.email
     INNER JOIN users AS reviewer ON reviewer.email = 'admin@scamshield.vn'
WHERE NOT EXISTS (SELECT 1
                  FROM disputes AS d
                  WHERE d.reason LIKE 'DISPUTE-MOCK:' || v.key || ' — %');

-- 22. dispute_evidence
INSERT INTO dispute_evidence (dispute_id, evidence_type, verification_status, created_at, file_name, file_url, description)
VALUES ((SELECT id FROM disputes LIMIT 1), 'DOCUMENT', 'PENDING', now(), CAST(NULL AS text), CAST(NULL AS text), CAST(NULL AS text))

UNION ALL

SELECT d.id, 'DOCUMENT', v.verification_status, d.created_at + CAST('5 minutes' AS interval), v.file_name, v.file_url, v.description
FROM ((VALUES ('pending-domain', 'xac-nhan-ten-mien.pdf', 'https://files.example/disputes/pending-domain/xac-nhan-ten-mien.pdf', 'Giấy xác nhận đăng ký tên miền.', 'PENDING')
            , ('review-hotline', 'giay-phep-kinh-doanh.pdf', 'https://files.example/disputes/review-hotline/giay-phep-kinh-doanh.pdf', 'Giấy phép đăng ký kinh doanh của doanh nghiệp mẫu.', 'PENDING')
            , ('review-hotline', 'hop-dong-thue-dau-so.pdf', 'https://files.example/disputes/review-hotline/hop-dong-thue-dau-so.pdf', 'Hợp đồng thuê đầu số hotline.', 'PENDING')
            , ('supplement-bank', 'xac-nhan-chu-tai-khoan.pdf', 'https://files.example/disputes/supplement-bank/xac-nhan-chu-tai-khoan.pdf', 'Bản xác nhận tài khoản cần đối chiếu thêm sao kê.', 'PENDING')
            , ('restored-domain', 'chung-nhan-so-huu-domain.pdf', 'https://files.example/disputes/restored-domain/chung-nhan-so-huu-domain.pdf', 'Chứng nhận quyền sở hữu tên miền đã được đối chiếu.', 'VERIFIED')
            , ('restored-phone', 'hop-dong-vien-thong.pdf', 'https://files.example/disputes/restored-phone/hop-dong-vien-thong.pdf', 'Hợp đồng thuê đầu số chính chủ đã được đối chiếu.', 'VERIFIED')
            , ('rejected-domain', 'minh-chung-khieu-nai.pdf', 'https://files.example/disputes/rejected-domain/minh-chung-khieu-nai.pdf', 'Tài liệu không đủ cơ sở xác minh quyền sở hữu.', 'REJECTED')
            , ('partner-private', 'tai-lieu-doi-tac.pdf', 'https://files.example/disputes/partner-private/tai-lieu-doi-tac.pdf', 'Tài liệu riêng của tài khoản đối tác.', 'PENDING')
            , ('pending-bank', 'xac-nhan-tai-khoan.pdf', 'https://files.example/disputes/pending-bank/xac-nhan-tai-khoan.pdf', 'Thông tin tài khoản chờ đối chiếu.', 'PENDING')
            , ('review-shop', 'chung-nhan-ten-mien.pdf', 'https://files.example/disputes/review-shop/chung-nhan-ten-mien.pdf', 'Chứng nhận tên miền cửa hàng.', 'VERIFIED')
            , ('review-shop', 'hoa-don-giao-dich.pdf', 'https://files.example/disputes/review-shop/hoa-don-giao-dich.pdf', 'Hóa đơn đang được đối chiếu.', 'PENDING')
            , ('supplement-overdue', 'anh-website.png', 'https://files.example/disputes/supplement-overdue/anh-website.png', 'Ảnh website chưa đủ xác nhận quyền sở hữu.', 'PENDING')
            , ('approved-awaiting-retraction', 'chung-nhan-so-huu.pdf', 'https://files.example/disputes/approved-awaiting-retraction/chung-nhan-so-huu.pdf', 'Chứng nhận quyền sở hữu đã được xác minh.', 'VERIFIED')
            , ('rejected-bank', 'giay-xac-nhan.pdf', 'https://files.example/disputes/rejected-bank/giay-xac-nhan.pdf', 'Tài liệu không khớp chủ tài khoản.', 'REJECTED')
            , ('extra-khoi-pending-bank', 'giao-dich-ban-hang.pdf', 'https://files.example/disputes/extra-khoi-pending-bank/giao-dich-ban-hang.pdf', 'Giao dịch cần được đối chiếu với ngân hàng.', 'PENDING')
            , ('extra-khoi-approved-domain', 'chung-nhan-ten-mien.pdf', 'https://files.example/disputes/extra-khoi-approved-domain/chung-nhan-ten-mien.pdf', 'Quyền sở hữu tên miền đã được xác minh.', 'VERIFIED')
            , ('extra-ha-review-phone', 'hop-dong-dau-so.pdf', 'https://files.example/disputes/extra-ha-review-phone/hop-dong-dau-so.pdf', 'Hợp đồng thuê đầu số đang được đối chiếu.', 'PENDING')
            , ('extra-ha-review-phone', 'giay-phep-doanh-nghiep.pdf', 'https://files.example/disputes/extra-ha-review-phone/giay-phep-doanh-nghiep.pdf', 'Thông tin doanh nghiệp đã được đối chiếu.', 'VERIFIED')
            , ('extra-ha-needs-more-bank', 'anh-tai-khoan.png', 'https://files.example/disputes/extra-ha-needs-more-bank/anh-tai-khoan.png', 'Ảnh tài khoản chưa thay thế được giấy xác nhận ngân hàng.', 'PENDING')
            , ('extra-bao-rejected-domain', 'xac-nhan-ten-mien.pdf', 'https://files.example/disputes/extra-bao-rejected-domain/xac-nhan-ten-mien.pdf', 'Tên miền trong tài liệu không khớp hồ sơ.', 'REJECTED')
            , ('extra-linh-review-domain', 'hoa-don-giao-dich.pdf', 'https://files.example/disputes/extra-linh-review-domain/hoa-don-giao-dich.pdf', 'Hóa đơn đang được kiểm tra tính hợp lệ.', 'PENDING')
            , ('extra-linh-approved-bank', 'xac-nhan-ngan-hang.pdf', 'https://files.example/disputes/extra-linh-approved-bank/xac-nhan-ngan-hang.pdf', 'Ngân hàng xác nhận tài khoản chính chủ.', 'VERIFIED')
            , ('extra-linh-approved-bank', 'sao-ke.pdf', 'https://files.example/disputes/extra-linh-approved-bank/sao-ke.pdf', 'Sao kê phù hợp với thông tin khiếu nại.', 'VERIFIED')
            , ('extra-partner-rejected-forex', 'tai-lieu-doi-tac.pdf', 'https://files.example/disputes/extra-partner-rejected-forex/tai-lieu-doi-tac.pdf', 'Tài liệu chưa chứng minh quyền sở hữu tên miền đầu tư.', 'REJECTED'))) AS v (dispute_key, file_name, file_url, description, verification_status)
     INNER JOIN disputes AS d ON d.reason LIKE 'DISPUTE-MOCK:' || v.dispute_key || ' — %'
WHERE NOT EXISTS (SELECT 1
                  FROM dispute_evidence AS e
                  WHERE e.dispute_id = d.id AND e.file_url = v.file_url);

-- 23. abuse_flags
INSERT INTO abuse_flags (user_id, flag_type, severity, status, created_at, report_id, created_by_user_id, reason, evidence)
VALUES ((SELECT id FROM users WHERE email = 'nguyenvana@gmail.com'), 'SPAM', 'LOW', 'OPEN', now(), CAST(NULL AS bigint), CAST(NULL AS bigint), CAST(NULL AS text), CAST(NULL AS text))

UNION ALL

SELECT u.id, v.flag_type, v.severity, v.status, pg_catalog.timezone('Asia/Ho_Chi_Minh', CURRENT_TIMESTAMP) - v.hours_ago * CAST('1 hour' AS interval), r.id, moderator.id, 'ABUSE-MOCK:' || v.key || ' — ' || v.reason, v.evidence
FROM ((VALUES ('khoi-pending', 'khoi.tran@gmail.com', 'khoi-01', 'moderator.phuong@scamshield.vn', 'BULK_REPORTING', 'MEDIUM', 'PENDING', 1, 'Nhiều báo cáo trong ngày nhắm vào các đối tượng khác nhau, có nội dung lặp lại.', 'Đối chiếu report khoi-01 và lịch sử hoạt động trước khi kết luận.')
            , ('khoi-dismissed', 'khoi.tran@gmail.com', 'khoi-05', 'moderator@scamshield.vn', 'OTHER', 'LOW', 'DISMISSED', 216, 'Từng nghi ngờ gửi báo cáo bất thường, sau kiểm tra thấy nội dung có giá trị xác minh.', 'Báo cáo cũ được duyệt, không đủ căn cứ kết luận tài khoản lạm dụng.')
            , ('ha-pending', 'ha.le@gmail.com', 'ha-01', 'moderator@scamshield.vn', 'REPEATED_UNFOUNDED_REPORTING', 'MEDIUM', 'PENDING', 2, 'Liên tiếp gửi các cáo buộc chưa đủ căn cứ về website và SMS Brandname.', 'Báo cáo ha-01 đã bị từ chối; cần Admin đánh giá hành vi và bối cảnh.')
            , ('ha-open', 'ha.le@gmail.com', 'ha-05', 'moderator.phuong@scamshield.vn', 'BULK_REPORTING', 'HIGH', 'OPEN', 168, 'Đã xác nhận lặp lại cáo buộc thiếu căn cứ sau khi được hướng dẫn bổ sung.', 'Hồ sơ cũ ghi nhận report ha-05; gắn cờ theo dõi, tài khoản vẫn hoạt động.')
            , ('bao-pending', 'bao.nguyen@gmail.com', 'bao-01', 'moderator.phuong@scamshield.vn', 'OTHER', 'MEDIUM', 'PENDING', 3, 'Cần đối chiếu nguồn thông tin của các báo cáo đang chờ xử lý trước khi đánh giá.', 'Kiểm tra report bao-01; đây là nghi vấn, chưa xác nhận vi phạm.')
            , ('bao-dismissed', 'bao.nguyen@gmail.com', 'bao-05', 'moderator@scamshield.vn', 'REPEATED_UNFOUNDED_REPORTING', 'LOW', 'DISMISSED', 288, 'Báo cáo thiếu bằng chứng nhưng chưa đủ cơ sở xác định cố tình lạm dụng.', 'Report bao-05 bị từ chối không tự động chứng minh người gửi vi phạm.')
            , ('linh-pending', 'linh.pham@gmail.com', 'linh-01', 'moderator@scamshield.vn', 'BULK_REPORTING', 'MEDIUM', 'PENDING', 4, 'Gửi nhiều báo cáo mới trong thời gian ngắn, cần kiểm tra tính độc lập của nội dung.', 'Report linh-01 đang chờ thẩm định; chưa hạn chế tài khoản.')
            , ('linh-open', 'linh.pham@gmail.com', 'linh-05', 'moderator.phuong@scamshield.vn', 'REPEATED_UNFOUNDED_REPORTING', 'HIGH', 'OPEN', 168, 'Đã xác nhận gửi lặp lại cáo buộc nhắm vào đối tượng chính thức mà không bổ sung căn cứ.', 'Theo dõi hành vi dựa trên report linh-05; chưa áp dụng khóa tài khoản.')
            , ('vana-open', 'nguyenvana@gmail.com', 'vana-02', 'moderator.phuong@scamshield.vn', 'BULK_REPORTING', 'MEDIUM', 'OPEN', 192, 'Hồ sơ cũ xác nhận lặp lại báo cáo không có bằng chứng bổ sung về cùng đối tượng.', 'Đối chiếu report vana-02; cờ này độc lập với các hồ sơ khác của tài khoản.')
            , ('vana-dismissed', 'nguyenvana@gmail.com', 'vana-03', 'moderator@scamshield.vn', 'OTHER', 'LOW', 'DISMISSED', 24, 'Đã xem xét nghi vấn và không xác nhận hành vi lạm dụng khi gửi báo cáo mới.', 'Report vana-03 vẫn được thẩm định theo luồng báo cáo thông thường.'))) AS v (key, email, report_key, moderator_email, flag_type, severity, status, hours_ago, reason, evidence)
     INNER JOIN users AS u ON u.email = v.email
     INNER JOIN users AS moderator ON moderator.email = v.moderator_email
     INNER JOIN reports AS r ON r.reporter_user_id = u.id AND r.description LIKE 'REPORT-MOCK:' || v.report_key || ' — %'
WHERE NOT EXISTS (SELECT 1 FROM abuse_flags AS f WHERE f.user_id = u.id AND f.reason = 'ABUSE-MOCK:' || v.key || ' — ' || v.reason) AND (v.status <> 'PENDING' OR NOT EXISTS (SELECT 1 FROM abuse_flags AS pending WHERE pending.user_id = u.id AND pending.status = 'PENDING'));

-- 24. abuse_flag_reports
-- Mỗi hồ sơ lạm dụng liên kết với đúng báo cáo chính thuộc người gửi.
INSERT INTO abuse_flag_reports (abuse_flag_id, report_id)
SELECT f.id, r.id
FROM (VALUES
    ('khoi-pending', 'khoi-01'),
    ('khoi-dismissed', 'khoi-05'),
    ('ha-pending', 'ha-01'),
    ('ha-open', 'ha-05'),
    ('bao-pending', 'bao-01'),
    ('bao-dismissed', 'bao-05'),
    ('linh-pending', 'linh-01'),
    ('linh-open', 'linh-05'),
    ('vana-open', 'vana-02'),
    ('vana-dismissed', 'vana-03')
) AS v(flag_key, report_key)
JOIN abuse_flags f ON f.reason LIKE 'ABUSE-MOCK:' || v.flag_key || ' — %'
JOIN reports r ON r.reporter_user_id = f.user_id AND r.description LIKE 'REPORT-MOCK:' || v.report_key || ' — %'
WHERE NOT EXISTS (SELECT 1 FROM abuse_flag_reports link WHERE link.abuse_flag_id = f.id AND link.report_id = r.id);

-- 25. user_alert_subscriptions
INSERT INTO user_alert_subscriptions (user_id, category_id, subscribed_at) VALUES
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), (SELECT id FROM scam_categories WHERE code='GIA_DANH_CQCN'), NOW());

-- 26. notifications
INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id, is_read, created_at) VALUES
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'REPORT', 'Báo cáo #RPT-8492 đã được phê duyệt', 'Đã thẩm định và đưa số 089.842.XXXX vào Blacklist quốc gia (+50 điểm Sentinel).', 'REPORT', 8492, false, NOW() - INTERVAL '15 minutes'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'DISPUTE', 'Hồ sơ khiếu nại #DSP-3091 đã được thụ lý', 'Ban Thẩm định đang rà soát giải tỏa hotline 091.234.8899, tạm hạ 70% mức cảnh báo.', 'DISPUTE', 3091, false, NOW() - INTERVAL '1 hour'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'SYSTEM', 'Bạn đã đủ điều kiện nâng cấp Sentinel Lv.3', 'Đã tích lũy đủ 700/700 Điểm Sentinel. Mở rộng hạn mức tra cứu AI lên 100 lượt/ngày.', 'SENTINEL_RANK', 3, false, NOW() - INTERVAL '3 hours'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'REPORT', 'Báo cáo #RPT-8411 được gộp vào hồ sơ Forex', 'Ảnh chứng từ của bạn đã liên kết vào hồ sơ FX-VIETNAM-CRIME-2025 (+25 điểm đối soát).', 'REPORT', 8411, true, NOW() - INTERVAL '1 day'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'DISPUTE', 'Đã gỡ bỏ nhãn cảnh báo tên miền shop-chinhhang.vn', 'Hồ sơ khiếu nại #DSP-2814 giải tỏa thành công sau xác thực giấy phép TMĐT.', 'DISPUTE', 2814, true, NOW() - INTERVAL '3 days'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'SYSTEM', 'Cập nhật cơ sở dữ liệu phòng vệ ScamShield v4.8', 'Đã tự động cập nhật 1.420 chữ ký độc hại và danh sách số điện thoại lừa đảo mới.', 'SYSTEM_UPDATE', NULL, true, NOW() - INTERVAL '5 days'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'REPORT', 'Báo cáo #RPT-8390 đã được xác minh', 'Tài khoản ngân hàng 19036782910 đã được đối soát vào cơ sở dữ liệu cảnh báo.', 'REPORT', 8390, true, NOW() - INTERVAL '7 days'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'REPORT', 'Báo cáo #RPT-8355 được ghi nhận', 'Đã tiếp nhận bằng chứng bổ sung cho thủ đoạn mạo danh công an.', 'REPORT', 8355, true, NOW() - INTERVAL '10 days'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'REPORT', 'Báo cáo #RPT-8299 đã đóng hồ sơ', 'Hoàn tất phân tích rủi ro cho tên miền giả mạo dịch vụ công.', 'REPORT', 8299, true, NOW() - INTERVAL '14 days'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'REPORT', 'Báo cáo #RPT-8210 đã đưa vào giám sát', 'Số điện thoại phát tán tin nhắn mạo danh đang nằm trong danh sách theo dõi đặc biệt.', 'REPORT', 8210, true, NOW() - INTERVAL '20 days'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'SYSTEM', 'Chào mừng bạn đến với ScamShield', 'Hãy chung tay xây dựng không gian mạng an toàn cho cộng đồng!', 'SYSTEM', NULL, true, NOW() - INTERVAL '30 days'),
((SELECT id FROM users WHERE email='nguyenvana@gmail.com'), 'SYSTEM', 'Hoàn tất thiết lập bảo mật 2 lớp (2FA)', 'Tài khoản của bạn đã được bảo vệ nâng cao bằng mã OTP xác thực.', 'SYSTEM', NULL, true, NOW() - INTERVAL '35 days');

-- 27. partner_official_alerts
INSERT INTO partner_official_alerts (partner_id, submission_type, title, description, status, created_at) VALUES
((SELECT id FROM partner_profiles WHERE brand_name='Shopee'), 'OFFICIAL_ALERT', 'Cảnh báo mạo danh Shopee tuyển CTV', 'Hiện nay có nhiều trang web giả mạo Shopee để lừa đảo tuyển CTV.', 'PENDING', NOW());

-- 28. warning_cards
INSERT INTO warning_cards (created_by_user_id, check_verdict_id, created_at) VALUES
((SELECT id FROM users WHERE email='admin@scamshield.vn'), 1, NOW());

-- 29. education_articles
-- jsonb_populate_record lấy đúng các cột của bảng hiện tại.
-- Khóa content rỗng chỉ để tương thích database cũ còn cột content NOT NULL.
-- Bảng mới không có cột content thì PostgreSQL bỏ qua khóa đó; entity/API không sử dụng content.
INSERT INTO education_articles
SELECT populated.*
FROM (VALUES
    ('SMS Brandname trạm phát BTS', 'sms-brandname-tram-phat-bts', 'SCENARIO',
     'Phát sóng giả mạo chèn thẳng tin nhắn lừa đảo vào luồng tin cậy ngân hàng.', 'GIA_DANH_NGAN_HANG', 'GIẢ MẠO BRANDNAME', 'Cực đại',
     '{"example":{"channelType":"SMS","senderName":"VCB Digibank","displayTime":"14:32","message":"Tai khoan bi khoa sau 30 phut. Xac minh ngay tai: portal-vcb-digibanks[.]vn de huy.","highlightedText":"portal-vcb-digibanks[.]vn"},"recognitionSigns":["Tên miền giả kèm áp lực thời gian."],"scammerGoal":"Chiếm đoạt mật khẩu và mã OTP.","recommendedActions":["Không bấm link. Mở thẳng App gốc."]}'::jsonb,
     NULL::text, NULL::integer, NULL::integer, 1),
    ('Video Zalo giả Cảnh sát điều tra', 'video-zalo-gia-canh-sat-dieu-tra', 'SCENARIO',
     'Dùng Deepfake khuôn mặt cán bộ trong phòng hỏi cung để hăm dọa chuyển tiền.', 'GIA_DANH_CQCN', 'DEEPFAKE - GIẢ DANH CƠ QUAN', 'Nguy cấp',
     '{"example":{"channelType":"VIDEO","senderName":"Zalo Video: CQ Điều tra","displayTime":"00:43","message":"Chị liên quan đường dây rửa tiền. Khóa cửa phòng, chuyển số dư vào tài khoản thanh tra ngay."},"recognitionSigns":["Mặt mờ giật, ép bảo mật tuyệt đối."],"scammerGoal":"Thao túng nỗi sợ để tự chuyển tiền.","recommendedActions":["Cúp máy. Công an không làm việc qua mạng."]}'::jsonb,
     NULL::text, NULL::integer, NULL::integer, 2),
    ('Tuyển CTV đơn hàng hoa hồng 10–20%', 'tuyen-ctv-don-hang-hoa-hong', 'SCENARIO',
     'Nạp tiền chốt đơn nhận lãi nhỏ ban đầu trước khi giữ khoản tiền lớn.', 'VIEC_LAM', 'CỘNG TÁC VIÊN ẢO', 'Phổ biến',
     '{"example":{"channelType":"CHAT","senderName":"Telegram CSKH","displayTime":"10:15","message":"Nhiệm vụ cuối: Nạp 15.000.000đ để nhận về 19.500.000đ. Ưu đãi giữ trong 10 phút!"},"recognitionSigns":["Hoa hồng bất thường, nhóm kín Telegram."],"scammerGoal":"Chiếm đoạt toàn bộ tiền nạp tích lũy.","recommendedActions":["Chặn liên lạc. Sàn TMĐT không tuyển nạp tiền."]}'::jsonb,
     NULL::text, NULL::integer, NULL::integer, 3),
    ('Cuộc gọi hoàn vé & hủy chuyến khẩn', 'cuoc-goi-hoan-ve-huy-chuyen-khan', 'SCENARIO',
     'Gọi thông báo hủy chuyến bay rồi gửi link nhận bồi thường chứa mã độc.', 'VE_MAY_BAY_DU_LICH', 'VÉ MÁY BAY & DU LỊCH', 'Tăng vọt',
     '{"example":{"channelType":"CALL","senderName":"Tổng đài Hãng không","displayTime":"18:40","message":"Chuyến bay bị hoãn, nhận đền bù 800.000đ qua link xác thực gửi kèm Zalo."},"recognitionSigns":["Yêu cầu cài tệp lạ hoặc truy cập link lạ."],"scammerGoal":"Đánh cắp OTP hoặc chiếm quyền điện thoại.","recommendedActions":["Chỉ tra cứu qua ứng dụng chính hãng."]}'::jsonb,
     NULL::text, NULL::integer, NULL::integer, 4),
    ('Quy tắc vàng 3 KHÔNG', 'quy-tac-vang-3-khong', 'POCKET_CARD',
     'Nguyên tắc cốt lõi trước mọi cuộc gọi và tin nhắn lạ.', NULL, 'THẺ #01', NULL,
     '{"tips":["1. KHÔNG hoảng sợ, hối thúc","2. KHÔNG bấm link lạ","3. KHÔNG chuyển tiền"]}'::jsonb,
     'Khổ thẻ A6', 1200, 800, 1),
    ('Bảo vệ người cao tuổi', 'bao-ve-nguoi-cao-tuoi', 'POCKET_CARD',
     'Nhận diện khi có số lạ xưng công an hù dọa.', 'GIA_DANH_CQCN', 'THẺ #02', NULL,
     '{"tips":["Công an chỉ gửi giấy mời trực tiếp.","Không có tài khoản tạm giữ cá nhân.","Cúp máy, gọi ngay đường dây 069.234.3640."]}'::jsonb,
     'Khổ in dán tường · Khổ dọc', NULL::integer, NULL::integer, 2),
    ('An toàn OTP & Mã PIN', 'an-toan-otp-ma-pin', 'POCKET_CARD',
     'Tấm khiên bảo vệ tài khoản ngân hàng và ví số.', 'DANH_CAP_OTP', 'THẺ #03', NULL,
     '{"tips":["Ngân hàng không bao giờ hỏi OTP.","Luôn đọc kỹ nội dung SMS giao dịch.","Không cấp quyền Trợ năng (Accessibility)."]}'::jsonb,
     'Hình nền điện thoại', 1080, 1920, 3)
) AS v(title, slug, content_type, summary, category_code, tag, badge_label, structured_content, format_label, image_width, image_height, display_order)
JOIN users u ON u.email = 'admin@scamshield.vn'
LEFT JOIN scam_categories c ON c.code = v.category_code
CROSS JOIN LATERAL jsonb_populate_record(NULL::education_articles, jsonb_build_object(
    'id', nextval(pg_get_serial_sequence('education_articles', 'id')),
    'title', v.title, 'slug', v.slug, 'content', '', 'content_type', v.content_type,
    'summary', v.summary, 'structured_content', v.structured_content, 'category_id', c.id,
    'tag', v.tag, 'badge_label', v.badge_label, 'image_url', NULL, 'pdf_url', NULL,
    'format_label', v.format_label, 'image_width', v.image_width, 'image_height', v.image_height,
    'display_order', v.display_order, 'status', 'PUBLISHED', 'created_by', u.id,
    'published_at', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '1 minute',
    'created_at', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '1 minute',
    'updated_at', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh'
)) AS populated
WHERE NOT EXISTS (SELECT 1 FROM education_articles a WHERE a.slug = v.slug);

-- 30. official_scam_warnings
INSERT INTO official_scam_warnings (title, content, status, created_at) VALUES
('Cảnh báo khẩn: Làn sóng lừa đảo mùa Tết', 'Nhiều đối tượng lợi dụng dịp lễ để giả danh tổ chức từ thiện...', 'PUBLISHED', NOW());

-- 31. audit_logs
INSERT INTO audit_logs (actor_user_id, action, entity_type, reason, created_at, entity_id, new_value, previous_value)
(VALUES ((SELECT id FROM users WHERE email = 'admin@scamshield.vn'), 'CREATE', 'USER', 'Tạo tài khoản quản trị hệ thống', now(), CAST(NULL AS bigint), CAST(NULL AS text), CAST(NULL AS text))

 UNION ALL

 SELECT f.created_by_user_id, 'CREATE_ABUSE_ESCALATION', 'ABUSE_FLAG', f.reason, f.created_at, f.id, 'PENDING', CAST(NULL AS text)
 FROM abuse_flags AS f
 WHERE f.reason LIKE 'ABUSE-MOCK:%' AND NOT EXISTS (SELECT 1 FROM audit_logs AS a WHERE a.entity_type = 'ABUSE_FLAG' AND a.entity_id = f.id AND a.action = 'CREATE_ABUSE_ESCALATION'))

UNION ALL

SELECT admin.id, 'REVIEW_ABUSE_ESCALATION', 'ABUSE_FLAG', CASE WHEN f.status = 'OPEN' THEN 'Dữ liệu mẫu: xác nhận hành vi lạm dụng và gắn cờ theo dõi; tài khoản vẫn ACTIVE.' ELSE 'Dữ liệu mẫu: bác bỏ nghi vấn vì chưa đủ căn cứ xác định hành vi lạm dụng.' END, f.created_at + CAST('30 minutes' AS interval), f.id, f.status, 'PENDING'
FROM abuse_flags AS f INNER JOIN users AS admin ON admin.email = 'admin@scamshield.vn'
WHERE f.reason LIKE 'ABUSE-MOCK:%' AND f.status IN ('OPEN', 'DISMISSED') AND NOT EXISTS (SELECT 1 FROM audit_logs AS a WHERE a.entity_type = 'ABUSE_FLAG' AND a.entity_id = f.id AND a.action = 'REVIEW_ABUSE_ESCALATION');
