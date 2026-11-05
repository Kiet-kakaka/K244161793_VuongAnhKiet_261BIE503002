# KShop – Website bán hàng giả lập

Bài giữa kỳ học phần **Phát triển Web kinh doanh** (261BIE503002) – Trường Đại học Kinh tế - Luật, ĐHQG-HCM
Sinh viên: **Vương Anh Kiệt** – MSSV: **K244161793** – Lớp: K24416

Trang chủ GitHub Pages: https://kiet-kakaka.github.io/K244161793_VuongAnhKiet_261BIE503002/

## Cấu trúc thư mục

```
K244161793_VuongAnhKiet_261BIE503002/
├── index.html                 Trang cửa hàng (Câu 2, 3, 4, 5, 6, 7)
├── login.html                 Đăng nhập Admin (Câu 8)
├── admin.html                 Dashboard quản lý đơn hàng, thống kê (Câu 8)
├── tools/
│   └── build-products.html    Đọc FakeStoreAPI bằng DOM → products.xml (Câu 1)
├── css/
│   ├── main.css               Layout, Grid responsive, Skeleton, Mini-cart
│   └── admin.css              Giao diện đăng nhập + Dashboard
├── js/
│   ├── common.js              Hàm dùng chung: AJAX, localStorage, định dạng
│   ├── build-products.js      Câu 1
│   ├── main.js                Câu 2, 3, 4 (Search Form, render, Event Delegation)
│   ├── review.js              Câu 5 (DOMParser reviews.xml)
│   ├── cart.js                Câu 6 (đối tượng giỏ hàng, mini-cart)
│   ├── checkout.js            Câu 7 (Regex keyup/blur, API giả lập, localStorage)
│   ├── login.js, admin.js     Câu 8
├── datasets/
│   ├── products.xml           20 sản phẩm + màu, size, tồn kho theo biến thể
│   ├── employees.json         Nhân viên / Admin (đăng nhập Dashboard)
│   ├── customers.json         Khách hàng (đăng nhập hỗ trợ thanh toán)
│   ├── carts.xml              16 hóa đơn giả lập
│   └── reviews.xml            65 lượt đánh giá (nhiều - nhiều)
└── images/products/           Ảnh sản phẩm lưu cục bộ
```

## Cách chạy

Website đọc dữ liệu bằng AJAX nên phải chạy qua web server: mở thư mục bằng VS Code → **Live Server**, hoặc truy cập link GitHub Pages ở trên. Mở trực tiếp file (`file://`) thì trình duyệt sẽ chặn việc đọc XML/JSON.

## Tài khoản thử

| Vai trò | Tên đăng nhập | Mật khẩu |
|---|---|---|
| Admin | `admin` | `admin123` |
| Nhân viên | `nv.lan` | `lan123` |
| Nhân viên bị khóa | `nv.tuan` | `tuan123` |
| Khách hàng | `kh.an` | `123456` |
