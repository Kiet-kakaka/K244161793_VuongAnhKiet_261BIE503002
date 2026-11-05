/*
 * checkout.js - CÂU 7: Form Validation nội tuyến và Gửi API thanh toán (giả lập)
 *   - Bấm "Thanh toán" => hiện form nhập thông tin giao hàng
 *   - Regex tự định nghĩa kiểm tra NGAY LẬP TỨC (sự kiện keyup và blur) số điện thoại Việt Nam và email
 *   - Hợp lệ => gọi API thanh toán giả lập, lưu đơn hàng vào localStorage
 *   + Đăng nhập khách hàng bằng customers.json (Câu 1) để tự điền thông tin giao hàng
 * Sinh viên: Vương Anh Kiệt - MSSV: K244161793 - Lớp: K24416
 */

/*
 * Số di động Việt Nam: bắt đầu bằng 0 hoặc +84, tiếp theo là đầu số nhà mạng, sau đó 7 chữ số
 *   03[2-9]  : Viettel        05[2,5,6,8,9] : Vietnamobile, Gmobile, Reddi
 *   07[0,6-9]: MobiFone       08[1-9]       : VinaPhone, Viettel, MobiFone, iTel
 *   09[0-9]  : các nhà mạng   => tổng cộng 10 chữ số (khi bắt đầu bằng 0)
 */
var PHONE_REGEX = /^(0|\+84)(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
/* Email: phần tên (chữ, số, . _ % + -) @ tên miền (có ít nhất 1 dấu chấm) . đuôi từ 2 chữ cái */
var EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
/* Họ tên: 2 - 50 ký tự, chỉ gồm chữ cái (có dấu tiếng Việt) và khoảng trắng, ít nhất 2 từ */
var NAME_REGEX = /^[A-Za-zÀ-ỹ]+(\s[A-Za-zÀ-ỹ]+)+$/;
/* Địa chỉ: tối thiểu 10 ký tự */
var ADDRESS_REGEX = /^.{10,200}$/;

/* Bảng quy tắc kiểm tra cho từng ô nhập (thuộc tính data-rule trên input) */
var CHECKOUT_RULES = {
    fullName: { regex: NAME_REGEX, empty: "Vui lòng nhập họ và tên", invalid: "Họ tên chỉ gồm chữ cái, ít nhất 2 từ (VD: Nguyễn Văn A)" },
    phone:    { regex: PHONE_REGEX, empty: "Vui lòng nhập số điện thoại", invalid: "Số điện thoại Việt Nam không hợp lệ (VD: 0912345678 hoặc +84912345678)" },
    email:    { regex: EMAIL_REGEX, empty: "Vui lòng nhập email", invalid: "Email không đúng định dạng (VD: ten@gmail.com)" },
    address:  { regex: ADDRESS_REGEX, empty: "Vui lòng nhập địa chỉ giao hàng", invalid: "Địa chỉ phải có ít nhất 10 ký tự" }
};

/**
 * Đây là hàm normalize_value: chuẩn hóa giá trị trước khi kiểm tra (bỏ khoảng trắng thừa, bỏ dấu chấm/khoảng trắng trong SĐT)
 * @param {*} rule - tên quy tắc
 * @param {*} value - giá trị đang nhập
 */
function normalize_value(rule, value)
{
    value = value.trim();
    if (rule == "phone") value = value.replace(/[\s.\-]/g, "");
    if (rule == "fullName") value = value.replace(/\s+/g, " ");
    return value;
}

/**
 * Đây là hàm validate_field: kiểm tra 1 ô nhập theo Regex và hiển thị thông báo lỗi nội tuyến ngay bên dưới ô
 * @param {*} input - thẻ input cần kiểm tra
 * @returns true nếu hợp lệ
 */
function validate_field(input)
{
    var ruleName = input.getAttribute("data-rule");
    var rule = CHECKOUT_RULES[ruleName];
    var value = normalize_value(ruleName, input.value);
    var message = "";
    if (value == "") message = rule.empty;
    else if (!rule.regex.test(value)) message = rule.invalid;

    var errorBox = input.parentElement.querySelector(".field-error");
    errorBox.innerHTML = message;
    input.classList.toggle("invalid", message != "");
    input.classList.toggle("valid", message == "");
    input.setAttribute("aria-invalid", message != "");
    return message == "";
}

/**
 * Đây là hàm init_checkout_form: gắn sự kiện keyup + blur cho các ô có data-rule và sự kiện submit cho form
 * @param {*} frmcheckout - id của form thanh toán
 */
function init_checkout_form(frmcheckout)
{
    var form = document.getElementById(frmcheckout);
    var inputs = form.querySelectorAll("[data-rule]");
    for (var i = 0; i < inputs.length; i++)
    {
        // keyup: kiểm tra ngay lập tức mỗi khi người dùng gõ phím
        inputs[i].addEventListener("keyup", function(e) {
            if (e.key == "Tab" || e.key == "Shift") return;   // phím Tab chỉ để chuyển ô, chưa kiểm tra
            validate_field(this);
        });
        // blur: kiểm tra khi rời khỏi ô
        inputs[i].addEventListener("blur", function() {
            validate_field(this);
        });
    }
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        submit_checkout(form);
    });
}

/**
 * Đây là hàm open_checkout: bấm "Thanh toán" => mở form nhập thông tin giao hàng (tự điền nếu đã đăng nhập)
 */
function open_checkout()
{
    if (cart.get_count() == 0)
    {
        show_toast("Giỏ hàng đang trống, hãy chọn sản phẩm trước khi thanh toán.", "error");
        return;
    }
    var form = document.getElementById("frmCheckout");
    form.style.display = "";
    document.querySelector("#checkoutModal .checkout-layout").style.display = "";
    document.getElementById("checkoutResult").innerHTML = "";
    document.getElementById("btnPay").disabled = false;
    document.getElementById("btnPay").innerHTML = "Xác nhận thanh toán";

    // Khách hàng đã đăng nhập => tự điền thông tin từ customers.json
    var customer = read_storage(STORAGE_KEYS.customer, null);
    if (customer)
    {
        document.getElementById("txtFullName").value = customer.fullName;
        document.getElementById("txtPhone").value = customer.phone;
        document.getElementById("txtEmail").value = customer.email;
        document.getElementById("txtAddress").value = customer.address;
    }
    render_checkout_summary("checkoutSummary");
    open_modal("checkoutModal");
}

/**
 * Đây là hàm render_checkout_summary: hiển thị tóm tắt đơn hàng bên phải form
 * @param {*} checkoutsummary - id của khung tóm tắt
 */
function render_checkout_summary(checkoutsummary)
{
    var list = cart.get_list();
    var html = "<ul class='summary-list'>";
    for (var i = 0; i < list.length; i++)
    {
        html += "<li><span>" + escape_html(short_title(list[i].title)) + "<small>" + list[i].color + " / " + list[i].size
            + " × " + list[i].quantity + "</small></span><b>" + format_money(list[i].price * list[i].quantity) + "</b></li>";
    }
    html += "</ul>"
        + "<p class='summary-line'><span>Tạm tính</span><span>" + format_money(cart.get_subtotal()) + "</span></p>"
        + "<p class='summary-line'><span>Phí giao hàng</span><span>" + (cart.get_shipping() == 0 ? "Miễn phí" : format_money(cart.get_shipping())) + "</span></p>"
        + "<p class='summary-line grand'><span>Tổng thanh toán</span><span>" + format_money(cart.get_total()) + "</span></p>";
    document.getElementById(checkoutsummary).innerHTML = html;
}

/**
 * Đây là hàm submit_checkout: kiểm tra toàn bộ form, hợp lệ thì gọi API thanh toán giả lập
 * @param {*} form - form thanh toán
 */
function submit_checkout(form)
{
    var inputs = form.querySelectorAll("[data-rule]");
    var allValid = true;
    var firstInvalid = null;
    for (var i = 0; i < inputs.length; i++)
    {
        if (!validate_field(inputs[i]))
        {
            allValid = false;
            if (!firstInvalid) firstInvalid = inputs[i];
        }
    }
    if (!allValid)
    {
        firstInvalid.focus();
        show_toast("Vui lòng sửa các ô đang báo lỗi trước khi thanh toán.", "error");
        return;
    }

    var customer = read_storage(STORAGE_KEYS.customer, null);
    var paymentMethod = form.querySelector("input[name='paymentMethod']:checked").value;
    var now = new Date();
    var order = {
        id: "OL" + now.getTime(),                 // mã hóa đơn online (OL + thời gian)
        createdDate: now.toISOString(),
        status: "pending",
        paymentMethod: paymentMethod,
        channel: "online",
        employeeId: "ONLINE",                     // đơn online chưa có nhân viên xử lý
        customerId: customer ? customer.id : "GUEST",
        customerName: normalize_value("fullName", document.getElementById("txtFullName").value),
        phone: normalize_value("phone", document.getElementById("txtPhone").value),
        email: document.getElementById("txtEmail").value.trim(),
        address: document.getElementById("txtAddress").value.trim(),
        note: document.getElementById("txtNote").value.trim(),
        details: cart.get_list().map(function(item) {
            return { productId: item.productId, sku: item.sku, title: item.title, color: item.color, size: item.size,
                     quantity: item.quantity, unitPrice: item.price };
        }),
        shippingFee: cart.get_shipping(),
        total: cart.get_total()
    };

    var btn = document.getElementById("btnPay");
    btn.disabled = true;
    btn.innerHTML = "<span class='spinner'></span> Đang xử lý thanh toán...";

    fake_payment_api(order, function(response) {
        if (response.success)
        {
            // Lưu đơn hàng vào localStorage (Admin sẽ đọc lại ở Câu 8)
            var orders = read_storage(STORAGE_KEYS.orders, []);
            orders.push(order);
            write_storage(STORAGE_KEYS.orders, orders);
            cart.clear();
            form.reset();
            var fields = form.querySelectorAll("[data-rule]");
            for (var j = 0; j < fields.length; j++) fields[j].classList.remove("valid", "invalid");
            show_checkout_success(order, response);
        }
    });
}

/**
 * Đây là hàm fake_payment_api: GIẢ LẬP gọi API thanh toán (POST /api/payments), phản hồi sau 1.5 giây
 * @param {*} order - dữ liệu đơn hàng gửi lên
 * @param {*} callback - hàm nhận kết quả phản hồi
 */
function fake_payment_api(order, callback)
{
    console.log("POST /api/payments", JSON.stringify(order));
    setTimeout(function() {
        callback({
            success: true,
            status: 200,
            transactionId: "TXN" + Math.floor(Math.random() * 900000 + 100000),
            message: "Thanh toán thành công"
        });
    }, 1500);
}

/**
 * Đây là hàm show_checkout_success: hiển thị kết quả thanh toán thành công
 * @param {*} order - đơn hàng vừa tạo
 * @param {*} response - phản hồi của API giả lập
 */
function show_checkout_success(order, response)
{
    document.querySelector("#checkoutModal .checkout-layout").style.display = "none";
    document.getElementById("checkoutResult").innerHTML =
        "<div class='success-box'>"
        + "<div class='success-icon'>✔</div>"
        + "<h3>Thanh toán thành công!</h3>"
        + "<p>Mã đơn hàng: <b>" + order.id + "</b> – Mã giao dịch: <b>" + response.transactionId + "</b></p>"
        + "<p>Tổng thanh toán: <b>" + format_money(order.total) + "</b> (" + order.paymentMethod + ")</p>"
        + "<p>Giao đến: " + escape_html(order.customerName) + " – " + order.phone + " – " + escape_html(order.address) + "</p>"
        + "<p class='muted small'>Đơn hàng đã được lưu vào localStorage với khóa <code>" + STORAGE_KEYS.orders + "</code>.</p>"
        + "<button type='button' class='btn btn-primary' onclick=\"close_modal('checkoutModal')\">Tiếp tục mua sắm</button>"
        + "</div>";
    show_toast("Đặt hàng thành công: " + order.id, "success");
}

/**
 * Đây là hàm customer_login: đăng nhập khách hàng bằng dữ liệu customers.json
 * @param {*} event - sự kiện submit form
 */
function customer_login(event)
{
    event.preventDefault();
    var username = document.getElementById("txtCusUser").value.trim();
    var password = document.getElementById("txtCusPass").value;
    var found = null;
    for (var i = 0; i < customers.length; i++)
        if (customers[i].username == username && customers[i].password == password) found = customers[i];

    if (!found)
    {
        document.getElementById("pLoginMsg").innerHTML = "Sai tên đăng nhập hoặc mật khẩu.";
        return;
    }
    // Không lưu mật khẩu vào localStorage
    write_storage(STORAGE_KEYS.customer, {
        id: found.id, fullName: found.fullName, email: found.email, phone: found.phone, address: found.address
    });
    document.getElementById("pLoginMsg").innerHTML = "";
    document.getElementById("frmCustomerLogin").reset();
    close_modal("loginModal");
    show_customer_box();
    show_toast("Xin chào <b>" + found.fullName + "</b>!", "success");
}

/** Đây là hàm customer_logout: đăng xuất khách hàng */
function customer_logout()
{
    try { localStorage.removeItem(STORAGE_KEYS.customer); } catch (e) {}
    show_customer_box();
    show_toast("Đã đăng xuất.", "info");
}

/** Đây là hàm show_customer_box: hiển thị nút Đăng nhập hoặc tên khách hàng trên header */
function show_customer_box()
{
    var box = document.getElementById("accountBox");
    var customer = read_storage(STORAGE_KEYS.customer, null);
    if (customer)
        box.innerHTML = "<span class='hello'>👤 " + escape_html(customer.fullName) + "</span>"
            + "<button type='button' class='btn btn-ghost btn-sm' onclick='customer_logout()'>Đăng xuất</button>";
    else
        box.innerHTML = "<button type='button' class='btn btn-ghost' onclick=\"open_modal('loginModal')\">Đăng nhập</button>";
}

document.addEventListener("DOMContentLoaded", function() {
    init_checkout_form("frmCheckout");
});
