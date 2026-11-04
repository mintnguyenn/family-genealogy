# Gia Phả cá nhân

Bản fork từ [Gia Phả OS](https://github.com/homielab/giapha-os), dùng để phát triển ứng dụng phả hệ cho gia đình.

## Chạy local

Yêu cầu Bun và Node.js. Cài dependencies rồi khởi động:

```sh
bun install
bun run dev
```

Mở http://localhost:3000/dashboard. Cấu hình tuỳ chọn nằm trong `.env.example`; sao chép thành `.env.local` khi cần đổi tên ứng dụng hoặc tài khoản admin.

## Trạng thái hiện tại

- Khách xem các trang phả hệ; admin đăng nhập bằng `admin/admin` để mở form thêm/sửa.
- Chưa có backend lưu trữ. Các trang đọc dữ liệu rỗng; thao tác lưu, nhập dữ liệu và upload ảnh báo chưa kết nối DB.
- Điểm đọc dữ liệu nằm trong `lib/data.ts`; đăng nhập local nằm trong `app/actions/auth.ts` và `lib/auth.ts`.
- Giữ các component vẽ cây, thuật toán vai vế, ngày âm lịch và bộ xử lý JSON/CSV/GEDCOM để dùng tiếp khi chọn DB.
- Ảnh sử dụng đường dẫn file local; chưa có cơ chế upload/lưu file.

## Kiểm tra

```sh
bun run lint
bun run typecheck
bun test
bun run build
```

Quy ước giao diện ở [DESIGN.md](DESIGN.md). Xem [LICENSE](LICENSE) cho giấy phép MIT và thông tin tác giả gốc.
