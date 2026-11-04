# Chạy ScamShield Backend

Hướng dẫn kiểm thử: [UNIT_TEST_GUIDE.md](UNIT_TEST_GUIDE.md).

**Database chạy bằng Docker, API chạy bằng IntelliJ IDEA.** Cần JDK 21 và Docker Desktop đang mở.

## 1. Tạo `.env`

File `.env` nằm trong **`Server/scamshield-backend`**, cùng cấp với `pom.xml` và `docker-compose.yml`.

Trong terminal IntelliJ, chuyển đến thư mục backend rồi tạo file nếu chưa có:

```powershell
cd D:\Huy-D\FPTU\Semester9\ScamShield_App\Server\scamshield-backend
if (-not (Test-Path .\.env)) {
    Copy-Item .\.env.example .\.env
}
```

Điền các giá trị trong `.env`:

- `JWT_SECRET`: khóa riêng cho JWT, bắt buộc.
- `FIREBASE_WEB_API_KEY`: API key của Firebase project dùng gửi OTP điện thoại.
- `MAIL_USERNAME`, `MAIL_PASSWORD`: Gmail và App Password, nếu dùng API OTP email.
- Các biến hết hạn `*_EXPIRATION_MS`: giữ giá trị mẫu hoặc đổi theo nhu cầu; đơn vị **mili giây**.

Nếu chưa có `JWT_SECRET`, chạy lệnh sau rồi dán kết quả vào `.env`:

```powershell
$jwtBytes = New-Object byte[] 32
$jwtRandom = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$jwtRandom.GetBytes($jwtBytes)
$jwtRandom.Dispose()
[Convert]::ToBase64String($jwtBytes)
```

## 2. Cấu hình IntelliJ để đọc `.env`

1. Mở project, import Maven từ `Server/scamshield-backend/pom.xml`, chọn **JDK 21**.
2. Vào **Run → Edit Configurations**. Chọn cấu hình `ScamshieldBackendApplication`; nếu chưa có, tạo cấu hình **Application**.
3. Đặt các trường sau:

| Trường                  | Giá trị                                                            |
| ----------------------- | ------------------------------------------------------------------ |
| Main class              | `com.be.scamshield.ScamshieldBackendApplication`                   |
| Use classpath of module | Module `scamshield-backend`                                        |
| JDK / JRE               | Java 21                                                            |
| Working directory       | `D:\Huy-D\FPTU\Semester9\ScamShield_App\Server\scamshield-backend` |
| Program arguments       | `--spring.profiles.active=dev`                                     |

Nếu trường bị ẩn, mở **Modify options** để hiện **Working directory** hoặc **Program arguments**. Xem [hướng dẫn IntelliJ](https://www.jetbrains.com/help/idea/run-debug-configuration-java-application.html).

4. Bấm **Apply → OK**.

Code đã tự đọc `.env` từ **Working directory**. Không cần plugin EnvFile hoặc nhập từng biến vào ô **Environment variables**. Nếu ô này có biến trùng với `.env`, bỏ giá trị cũ để tránh ghi đè. Sửa `.env` xong cần **Stop rồi Run lại API**.

## 3. Chạy Docker Compose trước

Mở Docker Desktop. Trong terminal ở **thư mục backend có `docker-compose.yml`**, chạy:

```powershell
cd D:\Huy-D\FPTU\Semester9\ScamShield_App\Server\scamshield-backend
docker compose up -d scamshield-db
docker compose exec -T scamshield-db pg_isready -U postgres -d scamshield-db
```

Đợi PostgreSQL báo **`accepting connections`**. Database local dùng `localhost:5432`, database `scamshield-db`, username/password `postgres`.

Lệnh trên chạy database; API sẽ chạy từ IntelliJ ở bước tiếp theo.

## 4. Khi nào chạy API?

**Chạy API sau khi `.env` đã điền, IntelliJ cấu hình xong và PostgreSQL đã sẵn sàng.**

Trong IntelliJ, chọn `ScamshieldBackendApplication` rồi bấm **Run ▶**. Đợi log `Started ScamshieldBackendApplication`; API chạy ở cổng **8080** và Hibernate tạo/cập nhật bảng khi khởi động.

- Swagger: <http://localhost:8080/swagger-ui/index.html>.
- UI test OTP/partner: <http://localhost:8080/firebase-otp-test.html>.

UI test dùng profile `dev`. Luồng đăng ký: **gửi SMS → `verify-contacts` với số điện thoại và OTP → gửi form kèm `verificationToken`**. Không cần OTP email.

## 5. Lần đầu: chạy script dữ liệu mẫu

Sau khi API đã chạy và tạo bảng, dùng file [script/mock_data_vi.sql](script/mock_data_vi.sql) đã có sẵn:

1. Mở file trong công cụ SQL bạn đang dùng (pgAdmin hoặc Database của IntelliJ nếu có).
2. Chọn kết nối đến database **`scamshield-db`** ở `localhost:5432`.
3. Chạy toàn bộ script để thêm role và dữ liệu mẫu, rồi thử đăng ký.

Không cần nhập lại các câu INSERT trong terminal. Chỉ nạp lần đầu khi database chưa có dữ liệu mẫu; script chỉ INSERT, không xóa dữ liệu cũ.

Nếu container **`mock-data-seeder`** đã được tạo, có thể bấm **Start** trong Docker Desktop sau khi API tạo bảng; container sẽ tự chạy cùng file script. Chọn một cách nạp dữ liệu để tránh chạy script hai lần.

## Nếu gặp lỗi

- **Không đọc `.env`**: kiểm tra tên file, file cạnh `pom.xml`, Working directory trong IntelliJ và restart API.
- **Connection refused ở 5432**: mở Docker Desktop, chạy lại bước 3.
- **Cổng 8080 đã bị dùng**: dừng API cũ. Nếu từng chạy API bằng Docker, chạy `docker compose stop scamshield-api` rồi Run trong IntelliJ.
- **SMS thật bị từ chối**: kiểm tra Phone Authentication, billing và SMS region của Firebase. Xem [hướng dẫn Firebase](https://firebase.google.com/docs/auth/web/phone-auth).
