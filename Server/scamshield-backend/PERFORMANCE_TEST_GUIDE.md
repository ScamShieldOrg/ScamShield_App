# Hướng dẫn chạy test hiệu năng Scam check

Mục tiêu: ít nhất **95% lượt kiểm tra hợp lệ hoàn thành trong 3 giây**.
File này hướng dẫn test gọi dịch vụ thật; lệnh `mvn test` mặc định không chạy nhóm này.

## 1. Chuẩn bị

- Khởi động database, Redis và các thành phần theo cấu hình chạy ứng dụng.
- Khởi động Core tại `http://localhost:8080` và AI tại `http://localhost:8000`.
- Core chạy profile phát triển, không dùng profile `test` vì profile này tắt AI.
- Bật `app.scam-check.ai.enabled` và cấu hình AI base URL đúng trong Core.
- AI cần model và các API key của nhà cung cấp nếu chạy phân tích Tier 2.
- Benchmark Python cần thư viện `requests`; có thể dùng môi trường `.venv` của repo AI.

Kiểm tra AI trong PowerShell:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Kiểm tra `tier1_ready`, `tier2_ready` và `database_ready` trước khi chạy.
Phép đo sử dụng database của dịch vụ đang chạy, không sử dụng PostgreSQL Testcontainers của bộ integration test.
Mỗi lượt benchmark tạo lịch sử kiểm tra và tiêu thụ quota. Nên dùng môi trường phát triển/kiểm thử.

## 2. Chạy benchmark bằng CSV

Đây là cách dùng để tái lập phép đo 100 mẫu từ `vietnamese_sms_test.csv`.

```powershell
cd G:\Subjects\2026\Fall26\ScamShield_App\Server\scamshield-backend

$benchmarkPython = "G:\Subjects\2026\Fall26\Scamshield-AI-Pipeline\.venv\Scripts\python.exe"
$testCsv = "G:\Subjects\2026\Fall26\Scamshield-AI-Pipeline\data\raw\vietnamese_sms_test.csv"

& $benchmarkPython script\benchmark_scam_check.py --csv $testCsv `
    2>&1 | Tee-Object -FilePath performance-run.log
```

Nếu báo thiếu thư viện `requests`:

```powershell
& $benchmarkPython -m pip install requests
```

CSV cần có cột `message` và `label`, đủ dữ liệu để chọn 100 mẫu.
Script chọn mẫu phân tầng theo tỷ lệ nhãn, dùng seed `42`, rồi gửi tuần tự 100 request đến Core.
Nó tự tạo **20 phiên khách, mỗi phiên 5 lượt**; không cần JWT.
Quota khách phải cho phép ít nhất 5 lượt mỗi phiên.

Thời gian đo bắt đầu ngay trước HTTP request Scam check và kết thúc khi nhận phản hồi.
Thời gian tạo phiên khách không được tính. Không loại bỏ lượt đầu hoặc lượt bị lỗi khỏi mẫu đã đo.

## 3. Đọc log và kết quả CSV

Trong lúc chạy, mỗi dòng log chứa số thứ tự, dòng nguồn CSV, HTTP status,
verdict, tầng quyết định, thời gian `latency_ms` và cờ `within_3s`.
Theo dõi log từ PowerShell thứ hai tại thư mục backend:

```powershell
Get-Content .\performance-run.log -Tail 30 -Wait
```

Khi hoàn tất, kết quả nằm trong `script/benchmark_results/`:

- `<run_id>.csv`: chi tiết từng lượt đo.
- `<run_id>.json`: dữ liệu từng lượt; được lưu trong quá trình chạy.
- `<run_id>_summary.json`: kết quả tổng hợp của lần chạy hoàn tất.

Đọc summary mới nhất:

```powershell
Get-ChildItem .\script\benchmark_results\*_summary.json |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 |
    Get-Content
```

Đối chiếu `run_id` và thời gian trong summary với lần vừa chạy; nếu tiến trình bị lỗi hoặc bị dừng,
summary mới có thể chưa được tạo và file mới nhất vẫn thuộc lần chạy cũ.

| Trường | Ý nghĩa |
| --- | --- |
| `total` | Tổng lượt đo; phải bằng 100 |
| `valid_results` | HTTP 200, trạng thái COMPLETED, verdict hợp lệ và lý do không rỗng |
| `within_3s` | Số lượt có kết quả hợp lệ và thời gian không quá 3000 ms |
| `within_3s_percent` | Tỷ lệ trên toàn bộ lượt đo |
| `passed` | `true` khi đủ 100 lượt và ít nhất 95 lượt đạt |
| `mean_ms`, `p50_ms`, `p95_ms`, `max_ms` | Thống kê độ trễ, đơn vị mili giây |
| `stages`, `unknown_reasons` | Phân bố tầng xử lý và lý do UNKNOWN |
| `dataset_sha256`, `selected_labels`, `seed` | Bằng chứng dữ liệu và cách chọn mẫu |

Một lượt lỗi HTTP, timeout, thiếu lý do hoặc verdict ngoài `SCAM_RISK`, `LOW_RISK`, `UNKNOWN`
không được tính vào `within_3s`, kể cả khi trả về nhanh.
Nếu có nhiều kết quả UNKNOWN do AI không khả dụng, cần kiểm tra dịch vụ AI trước khi diễn giải hiệu năng.

## 4. Chạy test hiệu năng bằng JUnit

Cần **JDK 21, Maven**, Core và AI thật đang chạy, cùng JWT của tài khoản test
còn ít nhất **100 lượt quota**. Giá trị mặc định của tài khoản có thể thấp hơn 100;
cần chuẩn bị policy test phù hợp trước khi chạy.

```powershell
cd G:\Subjects\2026\Fall26\ScamShield_App\Server\scamshield-backend

$env:SCAM_CHECK_ACCEPTANCE_URL = "http://localhost:8080"
$env:SCAM_CHECK_ACCEPTANCE_TOKEN = "<JWT tài khoản test>"

mvn -Plive-acceptance test 2>&1 | Tee-Object -FilePath performance-junit.log
```

Không ghi JWT thật vào file mã nguồn, tài liệu hoặc Git.
Test nằm tại `src/test/java/com/be/scamshield/controller/ScamCheckLatencyAcceptanceTest.java`.
Test này lặp lại **5 câu cố định** qua 100 request; không đọc CSV và không tương đương mẫu CSV ở mục 2.
Nó kiểm tra kết quả hợp lệ từng request và yêu cầu ít nhất 95 lượt hoàn thành trong 3 giây.

Đọc báo cáo:

```powershell
Get-Content .\target\surefire-reports\com.be.scamshield.controller.ScamCheckLatencyAcceptanceTest.txt
```

Phải kiểm tra cả `Failures`, `Errors` và `Skipped`.
Nếu thiếu `SCAM_CHECK_ACCEPTANCE_URL`, test bị skipped; điều đó không chứng minh đạt hiệu năng.
Nếu có URL nhưng thiếu JWT hợp lệ/đủ quota, test sẽ thất bại.
Sau khi chạy, xóa JWT khỏi biến môi trường của terminal nếu không còn dùng:

```powershell
Remove-Item Env:SCAM_CHECK_ACCEPTANCE_TOKEN -ErrorAction SilentlyContinue
```

## 5. Phạm vi kết luận và xử lý lỗi

- Hai cách trên đo request **tuần tự**, không đánh giá tải đồng thời.
- Ghi nhận model, cấu hình và trạng thái dịch vụ đã được làm nóng/cache khi so sánh các lần chạy.
- Kết quả nhanh không tự chứng minh phân loại đúng nhãn CSV; đánh giá độ chính xác là phép đo riêng.
- `Connection refused`: kiểm tra Core/AI và cổng đang chạy.
- HTTP `401` ở JUnit: kiểm tra JWT và trạng thái tài khoản.
- HTTP `429`: kiểm tra quota; không loại bỏ các lượt này để làm tăng tỷ lệ đạt.
- HTTP `5xx`, `AI_UNAVAILABLE`, `AI_INVALID_RESPONSE`: kiểm tra log Core và AI.
- Thiếu `_summary.json` của lần chạy mới: kiểm tra lỗi tạo phiên, file CSV hoặc tiến trình bị dừng.

Hướng dẫn unit/integration test: [UNIT_TEST_GUIDE.md](UNIT_TEST_GUIDE.md).
