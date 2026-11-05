/*
 * common.js - Các hàm dùng chung cho toàn bộ website (trang cửa hàng, trang Admin, trang công cụ)
 * Sinh viên: Vương Anh Kiệt - MSSV: K244161793 - Lớp: K24416
 */

/* Tên các khóa lưu trong localStorage (đặt tiền tố k24416_ để không trùng với web khác) */
var STORAGE_KEYS = {
    cart: "k24416_cart",                 // giỏ hàng (Câu 6)
    orders: "k24416_orders",             // đơn hàng thanh toán online (Câu 7)
    customer: "k24416_customer",         // khách hàng đang đăng nhập (Câu 1, Câu 7)
    admin: "k24416_admin",               // nhân viên/Admin đang đăng nhập (Câu 8)
    orderStatus: "k24416_order_status"   // trạng thái đơn hàng Admin đã cập nhật (Câu 8)
};

/**
 * Đây là hàm load_file: đọc 1 file (XML/JSON) bằng AJAX - XMLHttpRequest (theo slide bài 10)
 * @param {*} url - đường dẫn file cần đọc, ví dụ "datasets/products.xml"
 * @param {*} callback - hàm được gọi khi đọc thành công, nhận vào đối tượng xhr
 * @param {*} onerror - (không bắt buộc) hàm được gọi khi đọc thất bại
 */
function load_file(url, callback, onerror)
{
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function()
    {
        if (xhr.readyState == 4)
        {
            if (xhr.status == 200)
                callback(xhr);
            else if (onerror)
                onerror(xhr);
        }
    };
    xhr.send();
}

/**
 * Đây là hàm load_json: đọc file JSON bằng AJAX rồi chuyển chuỗi thành đối tượng JavaScript
 * @param {*} url - đường dẫn file JSON
 * @param {*} callback - hàm nhận dữ liệu JSON (mảng/đối tượng) sau khi đọc xong
 */
function load_json(url, callback)
{
    load_file(url, function(xhr) {
        callback(JSON.parse(xhr.responseText));
    }, function() {
        alert("Không đọc được file " + url + ". Hãy chạy website bằng Live Server hoặc GitHub Pages.");
    });
}

/**
 * Đây là hàm get_text: lấy nội dung text của thẻ con đầu tiên có tên tagName trong node XML
 * @param {*} node - node XML cha
 * @param {*} tagName - tên thẻ con cần lấy
 * @returns chuỗi nội dung, hoặc "" nếu không có
 */
function get_text(node, tagName)
{
    var list = node.getElementsByTagName(tagName);
    if (list.length == 0 || list[0].childNodes.length == 0)
        return "";
    return list[0].childNodes[0].nodeValue;
}

/**
 * Đây là hàm parse_products: chuyển XML Document của products.xml thành mảng đối tượng sản phẩm
 * @param {*} xmlDoc - XML Document đọc được từ datasets/products.xml
 * @returns mảng sản phẩm [{id, title, price, category, ..., variants: [...]}]
 */
function parse_products(xmlDoc)
{
    var result = [];
    var nodes = xmlDoc.getElementsByTagName("product");
    for (var i = 0; i < nodes.length; i++)
    {
        var p = nodes[i];
        var product = {
            id: p.getAttribute("id"),
            category: p.getAttribute("category"),
            categoryName: p.getAttribute("categoryName"),
            status: p.getAttribute("status"),
            title: get_text(p, "title"),
            price: parseFloat(get_text(p, "price")),
            description: get_text(p, "description"),
            image: get_text(p, "image"),
            localImage: get_text(p, "localImage"),
            apiRate: parseFloat(p.getElementsByTagName("rating")[0].getAttribute("rate")),
            apiCount: parseInt(p.getElementsByTagName("rating")[0].getAttribute("count")),
            totalStock: parseInt(get_text(p, "totalStock")),
            colors: [],
            sizes: [],
            variants: []
        };
        var colorNodes = p.getElementsByTagName("color");
        for (var c = 0; c < colorNodes.length; c++)
            product.colors.push({
                name: colorNodes[c].getAttribute("name"),
                code: colorNodes[c].getAttribute("code"),
                hex: colorNodes[c].getAttribute("hex")
            });
        var sizeNodes = p.getElementsByTagName("size");
        for (var s = 0; s < sizeNodes.length; s++)
            product.sizes.push(sizeNodes[s].childNodes[0].nodeValue);
        var variantNodes = p.getElementsByTagName("variant");
        for (var v = 0; v < variantNodes.length; v++)
            product.variants.push({
                sku: variantNodes[v].getAttribute("sku"),
                color: variantNodes[v].getAttribute("color"),
                size: variantNodes[v].getAttribute("size"),
                stock: parseInt(variantNodes[v].getAttribute("stock"))
            });
        result.push(product);
    }
    return result;
}

/**
 * Đây là hàm format_money: định dạng số tiền theo đơn vị USD của fakestoreapi, ví dụ 109.95 => "$109.95"
 * @param {*} value - số tiền
 */
function format_money(value)
{
    return "$" + Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Đây là hàm format_date: định dạng chuỗi ngày ISO thành dd/mm/yyyy hh:mm
 * @param {*} isoString - chuỗi ngày, ví dụ "2026-10-05T09:30:00"
 */
function format_date(isoString)
{
    var d = new Date(isoString);
    if (isNaN(d.getTime()))
        return isoString;
    var two = function(n) { return n < 10 ? "0" + n : "" + n; };
    return two(d.getDate()) + "/" + two(d.getMonth() + 1) + "/" + d.getFullYear()
        + " " + two(d.getHours()) + ":" + two(d.getMinutes());
}

/**
 * Đây là hàm read_storage: đọc dữ liệu JSON từ localStorage (có try/catch phòng trình duyệt chặn localStorage)
 * @param {*} key - khóa cần đọc
 * @param {*} defaultValue - giá trị trả về nếu chưa có dữ liệu
 */
function read_storage(key, defaultValue)
{
    try
    {
        var text = localStorage.getItem(key);
        return text ? JSON.parse(text) : defaultValue;
    }
    catch (e)
    {
        return defaultValue;
    }
}

/**
 * Đây là hàm write_storage: ghi dữ liệu (đối tượng/mảng) vào localStorage dưới dạng chuỗi JSON
 * @param {*} key - khóa cần ghi
 * @param {*} value - dữ liệu cần ghi
 */
function write_storage(key, value)
{
    try
    {
        localStorage.setItem(key, JSON.stringify(value));
    }
    catch (e)
    {
        console.log("Không ghi được localStorage: " + e);
    }
}

/**
 * Đây là hàm escape_html: chống chèn mã HTML khi hiển thị dữ liệu người dùng nhập bằng innerHTML
 * @param {*} text - chuỗi cần xử lý
 */
function escape_html(text)
{
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Đây là hàm show_toast: hiển thị thông báo nhỏ ở góc màn hình rồi tự ẩn sau 3 giây
 * @param {*} message - nội dung thông báo (cho phép HTML đơn giản)
 * @param {*} type - "success" | "error" | "info"
 */
function show_toast(message, type)
{
    var box = document.getElementById("toastBox");
    if (!box)
    {
        box = document.createElement("div");
        box.id = "toastBox";
        box.className = "toast-box";
        document.body.appendChild(box);
    }
    var toast = document.createElement("div");
    toast.className = "toast toast-" + (type || "info");
    toast.innerHTML = message;
    box.appendChild(toast);
    setTimeout(function() {
        toast.classList.add("hide");
        setTimeout(function() { toast.remove(); }, 400);
    }, 3000);
}

/**
 * Đây là hàm product_image: tạo thẻ <img> cho sản phẩm. Ưu tiên ảnh lưu cục bộ (localImage),
 * lỗi thì chuyển sang ảnh gốc của fakestoreapi, lỗi nữa thì dùng ảnh thay thế
 * @param {*} p - đối tượng có localImage, image, id, title
 * @param {*} extra - thuộc tính thêm cho thẻ img (ví dụ loading='lazy')
 */
function product_image(p, extra)
{
    return "<img src='" + (p.localImage || p.image) + "' alt='" + escape_html(p.title || "") + "' " + (extra || "")
        + " data-api-src='" + p.image + "' data-label='KShop #" + p.id + "' onerror='image_fallback(this)'>";
}

/**
 * Đây là hàm image_fallback: xử lý khi ảnh không tải được
 * @param {*} img - thẻ img bị lỗi
 */
function image_fallback(img)
{
    var apiSrc = img.getAttribute("data-api-src");
    if (apiSrc && img.getAttribute("src") != apiSrc)
        img.src = apiSrc;
    else
    {
        img.onerror = null;
        img.src = make_placeholder(img.getAttribute("data-label") || "KShop");
    }
}

/**
 * Đây là hàm make_placeholder: tạo ảnh thay thế (SVG) khi ảnh sản phẩm từ fakestoreapi không tải được
 * @param {*} text - chữ hiển thị trên ảnh
 */
function make_placeholder(text)
{
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>"
        + "<rect width='100%' height='100%' fill='#eef2f7'/>"
        + "<text x='50%' y='50%' font-family='Arial' font-size='22' fill='#94a3b8' text-anchor='middle' dominant-baseline='middle'>"
        + escape_html(text) + "</text></svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
