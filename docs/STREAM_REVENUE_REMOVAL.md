# Gỡ báo cáo doanh thu Content Lead — 11/11/2026

Đã gỡ thẻ mở báo cáo trong Content Lead Studio, drawer báo cáo, biểu đồ thu nhập/chia 75/25, bảng tiền và hoàn vốn theo bài hát; gỡ type/hàm gọi API, khóa dịch và các thẻ cũ hứa chia tiền/rút tiền từ lượt nghe.

Giữ telemetry của player và Studio preview để backend ghi lịch sử/recommendation. Backend dùng `ListeningPlaybackService`, không quy đổi lượt nghe thành tiền; contract phiên nghe giữ nguyên và `qualified` luôn `false` cho client cũ.

Đã gỡ hai khối mẫu “Quyền lợi & Chính sách Phụ trách nội dung” và “Next best moves”. Studio giữ chân trang thương hiệu và thẻ kênh tiếp cận dùng API thật.

Upload/OCR vẫn lưu chi phí mua quyền theo hồ sơ bản quyền, không dẫn tới báo cáo hoàn vốn. Hợp đồng phân phối, thanh toán, gói Premium và báo cáo doanh thu bán gói của Admin vẫn theo nghiệp vụ hiện có.

Backend ngừng API báo cáo và duyệt lượt nghe tính tiền bằng `410 Gone`; xem `E:/moodify-backend/docs/STREAM_REVENUE_REMOVAL.md`. Phát hành backend trước và web ngay sau đó. Không đổi schema hoặc xóa dữ liệu lịch sử trong đợt này.

Kiểm chứng cục bộ: TypeScript đạt, build Webpack đạt, 24/24 test player đạt. Smoke bản build với API giả lập ở 1440 px và 390 px: danh mục và kênh tiếp cận hiển thị, mở được hộp tải bài, không còn hai khối mẫu hay UI/request doanh thu. ESLint trên các file sửa không phát sinh lỗi mới so với Git HEAD.
