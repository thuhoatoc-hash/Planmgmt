
# PM Quản lý dự án kinh doanh - Viettel Hà Nội

Hệ thống quản lý phương án kinh doanh, theo dõi hợp đồng, doanh thu, chi phí và báo cáo KPI.

## 1. Cài đặt và Kết nối Database (Supabase)

### Bước 1: Setup Supabase
1. Tạo project mới trên [Supabase](https://supabase.com).
2. Vào **SQL Editor**, copy nội dung từ file `SUPABASE_SETUP.sql` (nếu có) hoặc chạy các lệnh tạo bảng cơ bản.
3. **QUAN TRỌNG:** Để tính năng **Lưu Báo Cáo** hoạt động, hãy mở file `SUPABASE_UPDATE_REPORTS.sql`, copy toàn bộ nội dung và dán vào SQL Editor trên Supabase, sau đó nhấn **Run**.
4. Vào **Project Settings -> API**, copy `Project URL` và `anon public key`.

### Bước 2: Cấu hình biến môi trường
Tạo file `.env` ở thư mục gốc (không commit file này lên GitHub):
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 2. Chạy ứng dụng (Local)

1. Cài đặt thư viện: `npm install`
2. Chạy server phát triển: `npm run dev`
3. Truy cập: `http://localhost:5173`
   - **User:** `admin` / **Pass:** `123`

## 3. Deploy lên Internet (Hosting)

### Cách 1: Deploy lên Vercel (Khuyên dùng - Nhanh & Ổn định nhất)
Vercel hỗ trợ cực tốt cho Vite và React.

1. **Đẩy code lên GitHub:**
   - Tạo một repository mới trên GitHub.
   - Chạy lệnh tại thư mục dự án:
     ```bash
     git init
     git add .
     git commit -m "First commit"
     git branch -M main
     git remote add origin https://github.com/<username>/<repo-name>.git
     git push -u origin main
     ```

2. **Kết nối Vercel:**
   - Truy cập [Vercel.com](https://vercel.com) và đăng nhập bằng GitHub.
   - Bấm **"Add New..."** -> **"Project"**.
   - Chọn repository bạn vừa đẩy lên.

3. **Cấu hình Environment Variables (Quan trọng):**
   - Tại màn hình "Configure Project" trên Vercel, phần **Environment Variables**, thêm 2 biến từ Supabase của bạn:
     - `VITE_SUPABASE_URL`: (URL của Supabase)
     - `VITE_SUPABASE_ANON_KEY`: (Key anon public)
   - Bấm **Deploy**.

4. **Hoàn tất:**
   - Sau khi deploy xong, Vercel sẽ cấp cho bạn một tên miền (ví dụ: `pm-viettel.vercel.app`). Bạn có thể dùng link này để truy cập từ mọi nơi.

### Cách 2: Deploy lên GitHub Pages
Nếu bạn muốn dùng GitHub Pages (miễn phí hoàn toàn nhưng cấu hình phức tạp hơn chút).

1. Trong file `vite.config.ts`, đảm bảo `base` được cấu hình đúng.
2. Thêm biến `VITE_BASE_PATH=/ten-repo/` vào file `.env` (thay `ten-repo` bằng tên repository của bạn).
3. Chạy lệnh build:
   ```bash
   npm run build
   ```
4. Đẩy thư mục `dist` lên nhánh `gh-pages` của GitHub.

## 4. Cập nhật Code (Redeploy)

Khi bạn có chỉnh sửa mới và muốn cập nhật lên trang web đã deploy trên Vercel:

1. Mở terminal tại thư mục dự án.
2. Chạy các lệnh sau để đẩy code mới lên GitHub:
   ```bash
   git add .
   git commit -m "Mô tả những thay đổi của bạn"
   git push
   ```
3. Vercel sẽ **tự động** phát hiện code mới trên GitHub và tiến hành Build lại (Redeploy). Quá trình này mất khoảng 1-2 phút.
