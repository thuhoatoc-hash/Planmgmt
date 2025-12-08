# PM Quản lý dự án kinh doanh - Viettel Hà Nội

## Hướng dẫn Deploy lên Internet (Vercel)

Bạn đã có mã nguồn trên GitHub. Để đưa website này lên mạng (Public), cách đơn giản và nhanh nhất là sử dụng **Vercel**.

### Bước 1: Chuẩn bị
1. Đảm bảo bạn đã **Commit** và **Push** tất cả các file mới (package.json, vite.config.ts,...) lên GitHub repository của bạn.

### Bước 2: Kết nối Vercel
1. Truy cập [https://vercel.com/](https://vercel.com/).
2. Đăng ký/Đăng nhập bằng tài khoản **GitHub**.
3. Tại giao diện Dashboard, bấm nút **"Add New..."** -> **"Project"**.
4. Danh sách repository của bạn sẽ hiện ra. Tìm repo dự án này và bấm nút **"Import"**.

### Bước 3: Cấu hình & Deploy
1. Ở màn hình "Configure Project":
   - **Framework Preset**: Vercel thường tự nhận diện là `Vite`. Nếu không, hãy chọn `Vite`.
   - **Root Directory**: Để mặc định (`./`).
   - **Build Command**: Để mặc định (`npm run build` hoặc `vite build`).
   - **Output Directory**: Để mặc định (`dist`).
2. Bấm nút **"Deploy"**.

### Bước 4: Hoàn tất
- Vercel sẽ chạy quá trình build trong khoảng 1-2 phút.
- Khi hoàn tất, bạn sẽ nhận được một đường link (ví dụ: `pm-viettel.vercel.app`) để truy cập website của mình từ bất kỳ đâu.

---

## Cài đặt và chạy thử trên máy cá nhân (Local)

Nếu bạn muốn chạy thử trên máy tính của mình:

1. Cài đặt [Node.js](https://nodejs.org/).
2. Mở terminal tại thư mục dự án.
3. Chạy lệnh:
   ```bash
   npm install
   npm run dev
   ```
4. Truy cập đường link hiện ra trong terminal (thường là `http://localhost:5173`).
