# Gia Phả cá nhân

Bản fork từ [Gia Phả OS](https://github.com/homielab/giapha-os), dùng để phát triển ứng dụng phả hệ cho gia đình.

## Chạy local

Yêu cầu Bun và Node.js. Chuẩn bị workbook riêng tại `data/Family_Genealogy.xlsx` theo cấu trúc bên dưới rồi khởi động:

```sh
bun install
bun run dev
```

Mở http://localhost:3000/dashboard. Khi thiết lập lần đầu, sao chép `.env.example` thành `.env.local` và tự đặt `ADMIN_USERNAME`, `ADMIN_PASSWORD` để bật đăng nhập. Các cấu hình khác là tuỳ chọn. Không có tài khoản hay mật khẩu mặc định trong code; khi thiếu cấu hình, web chỉ cho xem.

## Trạng thái hiện tại

- Khách xem các trang phả hệ; admin đăng nhập bằng tài khoản được cấu hình riêng để thêm/sửa/xoá và lưu dữ liệu vào Excel.
- Dữ liệu thành viên và quan hệ được đọc/ghi trong `data/Family_Genealogy.xlsx`. Repo không chứa file dữ liệu Excel.
- Có thể sửa trên web hoặc trực tiếp trong Excel. Khi sửa trực tiếp, lưu file rồi tải lại trang web; đóng Excel trước khi lưu từ web để tránh ghi đè dữ liệu chưa lưu.
- Điểm đọc dữ liệu nằm trong `lib/data.ts`; đăng nhập local nằm trong `app/actions/auth.ts` và `lib/auth.ts`.
- Giữ các component vẽ cây, thuật toán vai vế, ngày âm lịch và bộ nhập/xuất JSON/CSV/GEDCOM của repo gốc.
- Ảnh upload được lưu trong thư mục `uploads/` bên cạnh file dữ liệu và được phục vụ qua route `/uploads/`.

## Dữ liệu Excel

Mở `data/Family_Genealogy.xlsx` để sửa dữ liệu. File có hai sheet bắt buộc, hàng đầu tiên là tên cột:

- `persons`: mỗi hàng là một người; bắt buộc có `id`, `full_name`, `gender` (`male`, `female`, `other`). Các cột ngày sinh tách thành `birth_year`, `birth_month`, `birth_day` để hỗ trợ người chỉ biết năm sinh.
- `relationships`: bắt buộc có `id`, `type`, `person_a`, `person_b`. Với `biological_child` hoặc `adopted_child`, `person_a` là cha/mẹ và `person_b` là con. Với `marriage`, mỗi cặp vợ chồng chỉ có một hàng.

ID phải là UUID duy nhất, giữ ổn định khi đổi tên người. Cột trống được coi là chưa biết; `is_in_law`, `is_deceased` nhận `TRUE`/`FALSE`, mặc định là `FALSE`. Các cột thông tin công khai khác dùng tên trường trong `types/index.ts`. Dữ liệu sai ID, ngày tháng hoặc quan hệ sẽ báo lỗi thay vì bị bỏ qua.

Toàn bộ file trong `data/`, bao gồm workbook, bản `.bak` và ảnh, đều được Git bỏ qua. Nếu muốn dùng đường dẫn khác, đặt trong `.env.local`:

```dotenv
FAMILY_DATA_FILE=data/Family_Genealogy.xlsx
```

Khởi động lại server sau khi đổi cấu hình đường dẫn. Sau đó chỉ cần lưu file và tải lại trang. File Excel được đọc ở server, nằm ngoài `public/`. Khi đưa lên server khác, chép workbook cùng thư mục `uploads/` lên máy đó và cấu hình đường dẫn tương ứng.

Docker Compose dùng volume `family-data` tại `/app/data` và giữ dữ liệu khi tạo lại container. Image không chứa workbook; cần chép workbook riêng và ảnh vào volume trước khi sử dụng. Volume này tách biệt với thư mục `data/` trên máy host. Compose đặt `FAMILY_DATA_FILE` theo đường dẫn bên trong container. Lệnh `docker compose down -v` sẽ xoá volume cùng dữ liệu trong đó.

Khi cần, ứng dụng tự thêm các sheet `person_details_private`, `custom_events`, `gallery`. Thông tin riêng chỉ được trả về cho admin. Các sheet và cột tự thêm khác được giữ lại khi lưu; đây là workbook dữ liệu, không hỗ trợ các tính năng Excel phức tạp như macro.

Mỗi lần lưu từ web sẽ khoá các thao tác ghi đồng thời, kiểm tra dữ liệu mới nhất, giữ bản trước đó trong file `.bak` rồi thay file theo cách nguyên tử. Nếu file đang mở trong Excel, hoặc đã được sửa sau khi mở form, thao tác lưu bị từ chối với thông báo cụ thể. Thư mục dữ liệu cần quyền `Modify`; khi triển khai nhiều tiến trình, chúng phải dùng chung file và thư mục khoá.

Giữ `.env.local`, workbook, bản sao lưu và ảnh ngoài Git và thư mục `public/`. Mật khẩu chỉ được đọc ở server; đổi thông tin đăng nhập sẽ vô hiệu hoá phiên cũ. Khi triển khai, đặt biến môi trường riêng trên server và sao lưu workbook cùng thư mục `uploads/`; bản xuất JSON/CSV/GEDCOM không chứa file ảnh.

Sự kiện sinh nhật được tính từ ngày sinh của thành viên. Chưa hỗ trợ định dạng `.xls` cũ hoặc dùng CSV làm nguồn dữ liệu trực tiếp.

## Kiểm tra

```sh
bun run lint
bun run typecheck
bun test
bun run build
```

Quy ước giao diện ở [DESIGN.md](DESIGN.md). Xem [LICENSE](LICENSE) cho giấy phép MIT và thông tin tác giả gốc.
