# Hướng dẫn chạy Unit test và Integration test

## Chạy kiểm thử tự động

Yêu cầu **JDK 21** và **Docker Desktop với Linux containers** đang chạy.
Không cần tự khởi động Core, AI, Redis hoặc database phát triển.

```powershell
cd G:\Subjects\2026\Fall26\ScamShield_App\Server\scamshield-backend
mvn clean test 2>&1 | Tee-Object -FilePath test-run.log
```

- Unit test dùng Mockito hoặc đối tượng Java thông thường, không tạo container.
- Integration test kế thừa `PostgresIntegrationTest`: Testcontainers tạo PostgreSQL
  `postgres:16-alpine` với cổng ngẫu nhiên; mỗi Spring context dùng schema riêng.
  Container không tái sử dụng giữa các lần chạy và được Testcontainers dọn tự động.
- Maven tắt `springdotenv.enabled`, dùng profile `test` và nạp Mockito Java agent.
  URL/credentials database do container cấp bằng `DynamicPropertySource`, không lấy từ `.env`.
- Nếu chạy JUnit trực tiếp từ IDE, thêm VM option `-Dspringdotenv.enabled=false`.
  Test integration đã có `@ActiveProfiles("test")`.
- Docker không khả dụng sẽ làm integration test báo lỗi, không âm thầm bỏ qua.
- Xem báo cáo từng lớp tại `target/surefire-reports/*.txt` và `*.xml`.

Test HTTP/hiệu năng với Core và AI thật được tách khỏi lệnh mặc định:

```powershell
$env:SCAM_CHECK_ACCEPTANCE_URL = "http://localhost:8080"
$env:SCAM_CHECK_ACCEPTANCE_TOKEN = "<JWT tài khoản test có ít nhất 100 lượt>"
mvn -Plive-acceptance test
```

Lệnh này tạo lịch sử kiểm tra và tiêu thụ quota trên dịch vụ được chỉ định.
Test latency sẽ bị skipped nếu thiếu biến URL; kiểm tra số `Skipped` trong báo cáo.
Không dùng database phát triển/sản xuất thay cho PostgreSQL do Testcontainers tạo.

Tham khảo cơ chế [singleton container](https://java.testcontainers.org/test_framework_integration/manual_lifecycle_control/)
và [tắt dotenv](https://github.com/paulschwarz/spring-dotenv#configuration-optional).

## Chỉ chạy Unit test Scam check

Các lớp sau không cần Docker, Core, AI hoặc database đang chạy:

```powershell
mvn "-Dtest=ScamCheckMatrixTest,ScamCheckDecisionServiceTest,ScamCheckInputProcessorTest,ScamCheckQuotaServiceTest,ScamCheckFailureQuotaTest" test
```

Maven đã cấu hình Mockito agent trong `pom.xml`, không cần truyền `-javaagent` thủ công.

## Xem log và kết quả

Khi dùng `Tee-Object` như lệnh ở trên, log vừa hiện trên terminal vừa lưu vào `test-run.log`.
Mở PowerShell thứ hai tại cùng thư mục để theo dõi:

```powershell
Get-Content .\test-run.log -Tail 50 -Wait
```

Xem lại log hoặc báo cáo từng lớp:

```powershell
Get-Content .\test-run.log -Tail 100
Get-Content .\target\surefire-reports\*.txt
```

Cuối log, kiểm tra `Tests run`, `Failures`, `Errors`, `Skipped` và `BUILD SUCCESS`.
`Skipped` là test chưa được thực thi, không phải test passed.
