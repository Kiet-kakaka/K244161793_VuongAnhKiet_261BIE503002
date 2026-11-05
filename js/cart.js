/*
 * cart.js - CÂU 6: Quản lý State Giỏ hàng bằng Đối tượng (Object) JavaScript
 *   - Khi bắt được sự kiện "Thêm vào giỏ hàng" (từ Câu 4): thêm mới nếu chưa có,
 *     hoặc tăng số lượng nếu sản phẩm CÙNG MÀU/SIZE (cùng SKU) đã tồn tại
 *   - Tự động tính lại tổng tiền và render bảng Mini-cart đè lên màn hình (position: absolute + z-index)
 *   - Lưu trạng thái giỏ hàng vào localStorage để tải lại trang không bị mất
 * Sinh viên: Vương Anh Kiệt - MSSV: K244161793 - Lớp: K24416
 */

var FREE_SHIP_FROM = 100;   // miễn phí giao hàng cho đơn từ $100
var SHIPPING_FEE = 5;       // phí giao hàng $5

/* ===== ĐỐI TƯỢNG GIỎ HÀNG (STATE) ===== */
var cart = {
    /* items lưu theo khóa "productId|sku" => mỗi biến thể màu/size là 1 dòng riêng */
    items: {},

    /**
     * Đây là phương thức add: thêm sản phẩm vào giỏ (thêm mới hoặc tăng số lượng)
     * @param {*} product - sản phẩm
     * @param {*} variant - biến thể (màu + size) đang chọn
     * @param {*} quantity - số lượng thêm
     */
    add: function(product, variant, quantity)
    {
        if (!product || !variant) return;
        var key = product.id + "|" + variant.sku;
        var current = this.items[key] ? this.items[key].quantity : 0;

        if (current + quantity > variant.stock)
        {
            show_toast("Biến thể <b>" + variant.color + " / " + variant.size + "</b> chỉ còn " + variant.stock + " sản phẩm trong kho.", "error");
            return;
        }

        if (this.items[key])
        {
            // Đã có cùng sản phẩm + cùng màu/size => tăng số lượng
            this.items[key].quantity += quantity;
            show_toast("Đã tăng số lượng <b>" + escape_html(short_title(product.title)) + "</b> (" + variant.color + " / " + variant.size + ") lên " + this.items[key].quantity, "success");
        }
        else
        {
            // Chưa có => thêm mới
            this.items[key] = {
                key: key,
                productId: product.id,
                sku: variant.sku,
                title: product.title,
                image: product.image,
                localImage: product.localImage,
                color: variant.color,
                size: variant.size,
                price: product.price,
                stock: variant.stock,
                quantity: quantity
            };
            show_toast("Đã thêm <b>" + escape_html(short_title(product.title)) + "</b> (" + variant.color + " / " + variant.size + ") vào giỏ hàng", "success");
        }
        this.save();
        render_mini_cart();
        show_mini_cart();
    },

    /**
     * Đây là phương thức change_quantity: tăng/giảm số lượng 1 dòng; nếu giảm về 0 thì xóa dòng
     * @param {*} key - khóa dòng giỏ hàng
     * @param {*} delta - +1 hoặc -1
     */
    change_quantity: function(key, delta)
    {
        var item = this.items[key];
        if (!item) return;
        var newQty = item.quantity + delta;
        if (newQty > item.stock)
        {
            show_toast("Không đủ hàng trong kho (tối đa " + item.stock + ").", "error");
            return;
        }
        if (newQty <= 0)
            delete this.items[key];
        else
            item.quantity = newQty;
        this.save();
        render_mini_cart();
    },

    /**
     * Đây là phương thức remove: xóa 1 dòng khỏi giỏ hàng
     * @param {*} key - khóa dòng giỏ hàng
     */
    remove: function(key)
    {
        delete this.items[key];
        this.save();
        render_mini_cart();
    },

    /** Đây là phương thức clear: xóa toàn bộ giỏ hàng (sau khi thanh toán thành công) */
    clear: function()
    {
        this.items = {};
        this.save();
        render_mini_cart();
    },

    /** Đây là phương thức get_list: trả về mảng các dòng trong giỏ */
    get_list: function()
    {
        var list = [];
        for (var key in this.items) list.push(this.items[key]);
        return list;
    },

    /** Đây là phương thức get_count: tổng số lượng sản phẩm trong giỏ */
    get_count: function()
    {
        var count = 0;
        for (var key in this.items) count += this.items[key].quantity;
        return count;
    },

    /** Đây là phương thức get_subtotal: tổng tiền hàng = Σ (đơn giá x số lượng) */
    get_subtotal: function()
    {
        var sum = 0;
        for (var key in this.items) sum += this.items[key].price * this.items[key].quantity;
        return Math.round(sum * 100) / 100;
    },

    /** Đây là phương thức get_shipping: phí giao hàng (miễn phí nếu tiền hàng >= $100) */
    get_shipping: function()
    {
        var subtotal = this.get_subtotal();
        return subtotal == 0 || subtotal >= FREE_SHIP_FROM ? 0 : SHIPPING_FEE;
    },

    /** Đây là phương thức get_total: tổng thanh toán = tiền hàng + phí giao hàng */
    get_total: function()
    {
        return Math.round((this.get_subtotal() + this.get_shipping()) * 100) / 100;
    },

    /** Đây là phương thức save: lưu state giỏ hàng vào localStorage */
    save: function()
    {
        write_storage(STORAGE_KEYS.cart, this.items);
    },

    /** Đây là phương thức load: đọc lại state giỏ hàng từ localStorage khi mở trang */
    load: function()
    {
        this.items = read_storage(STORAGE_KEYS.cart, {});
    }
};

/**
 * Đây là hàm short_title: rút gọn tên sản phẩm dài để hiển thị trong thông báo/mini-cart
 * @param {*} title - tên sản phẩm
 */
function short_title(title)
{
    return title.length > 38 ? title.substring(0, 38) + "…" : title;
}

/**
 * Đây là hàm render_mini_cart: vẽ lại bảng Mini-cart và số lượng trên nút giỏ hàng.
 * Hàm này được gọi lại mỗi khi state giỏ hàng thay đổi => tổng tiền luôn được tính lại tự động.
 */
function render_mini_cart()
{
    var box = document.getElementById("miniCart");
    document.getElementById("cartCount").innerHTML = cart.get_count();
    var list = cart.get_list();

    if (list.length == 0)
    {
        box.innerHTML = "<div class='mini-cart-head'><b>Giỏ hàng</b><button type='button' class='modal-close' data-cart-action='close' aria-label='Đóng'>×</button></div>"
            + "<p class='empty-state small'>Giỏ hàng đang trống.</p>";
        return;
    }

    var rows = "";
    for (var i = 0; i < list.length; i++)
    {
        var item = list[i];
        rows += "<tr>"
            + "<td>" + product_image({ id: item.productId, title: "", image: item.image, localImage: item.localImage }) + "</td>"
            + "<td><span class='mc-title'>" + escape_html(short_title(item.title)) + "</span>"
            + "<span class='mc-variant'>" + item.color + " / " + item.size + " · " + item.sku + "</span></td>"
            + "<td class='nowrap'>" + format_money(item.price) + "</td>"
            + "<td class='nowrap qty'>"
            +   "<button type='button' data-cart-action='dec' data-key='" + item.key + "' aria-label='Giảm'>−</button>"
            +   "<span>" + item.quantity + "</span>"
            +   "<button type='button' data-cart-action='inc' data-key='" + item.key + "' aria-label='Tăng'>+</button></td>"
            + "<td class='nowrap'><b>" + format_money(item.price * item.quantity) + "</b></td>"
            + "<td><button type='button' class='mc-remove' data-cart-action='remove' data-key='" + item.key + "' title='Xóa'>🗑</button></td>"
            + "</tr>";
    }

    var shipping = cart.get_shipping();
    box.innerHTML =
        "<div class='mini-cart-head'><b>Giỏ hàng (" + cart.get_count() + ")</b><button type='button' class='modal-close' data-cart-action='close' aria-label='Đóng'>×</button></div>"
        + "<div class='mini-cart-body'><table class='mini-cart-table'>"
        + "<thead><tr><th></th><th>Sản phẩm</th><th>Đơn giá</th><th>SL</th><th>Thành tiền</th><th></th></tr></thead>"
        + "<tbody>" + rows + "</tbody></table></div>"
        + "<div class='mini-cart-total'>"
        +   "<p><span>Tạm tính</span><span>" + format_money(cart.get_subtotal()) + "</span></p>"
        +   "<p><span>Phí giao hàng</span><span>" + (shipping == 0 ? "Miễn phí" : format_money(shipping)) + "</span></p>"
        +   (shipping > 0 ? "<p class='muted small'>Mua thêm " + format_money(FREE_SHIP_FROM - cart.get_subtotal()) + " để được miễn phí giao hàng</p>" : "")
        +   "<p class='grand'><span>Tổng cộng</span><span>" + format_money(cart.get_total()) + "</span></p>"
        + "</div>"
        + "<div class='mini-cart-actions'>"
        +   "<button type='button' class='btn btn-ghost' data-cart-action='close'>Mua tiếp</button>"
        +   "<button type='button' class='btn btn-accent' data-cart-action='checkout'>Thanh toán</button>"
        + "</div>";
}

/**
 * Đây là hàm init_mini_cart_events: xử lý các nút trong mini-cart (cũng dùng event delegation trên khung #miniCart)
 */
function init_mini_cart_events()
{
    var box = document.getElementById("miniCart");
    box.addEventListener("click", function(e) {
        e.stopPropagation();   // không để click trong mini-cart bị hiểu là click ra ngoài
        var btn = e.target.closest("[data-cart-action]");
        if (!btn) return;
        var action = btn.getAttribute("data-cart-action");
        var key = btn.getAttribute("data-key");
        if (action == "inc") cart.change_quantity(key, 1);
        else if (action == "dec") cart.change_quantity(key, -1);
        else if (action == "remove") cart.remove(key);
        else if (action == "close") hide_mini_cart();
        else if (action == "checkout") { hide_mini_cart(); open_checkout(); }
    });
    // Bấm ra ngoài mini-cart thì ẩn đi
    document.addEventListener("click", function(e) {
        if (!e.target.closest(".cart-wrapper") && !e.target.closest("[data-action='add-to-cart']") && !e.target.closest(".keep-cart"))
            hide_mini_cart();
    });
}

/** Đây là hàm show_mini_cart: hiện mini-cart */
function show_mini_cart()
{
    document.getElementById("miniCart").classList.add("open");
}

/** Đây là hàm hide_mini_cart: ẩn mini-cart */
function hide_mini_cart()
{
    var box = document.getElementById("miniCart");
    if (box) box.classList.remove("open");
}

/** Đây là hàm toggle_mini_cart: bấm nút giỏ hàng để bật/tắt mini-cart */
function toggle_mini_cart()
{
    document.getElementById("miniCart").classList.toggle("open");
}

document.addEventListener("DOMContentLoaded", init_mini_cart_events);
