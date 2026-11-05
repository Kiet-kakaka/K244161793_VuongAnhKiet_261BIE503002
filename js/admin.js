/*
 * admin.js - CÂU 8: Giao diện quản lý đơn hàng trong ADMIN, thống kê đơn hàng và các sản phẩm được bán
 *   Nguồn dữ liệu: carts.xml (hóa đơn giả lập) + đơn thanh toán online lưu trong localStorage (Câu 7)
 *                  products.xml, customers.json, employees.json để tra cứu tên
 * Sinh viên: Vương Anh Kiệt - MSSV: K244161793 - Lớp: K24416
 */

var adminData = {
    products: [],
    customers: [],
    employees: [],
    orders: []        // gộp đơn từ carts.xml và localStorage
};

var STATUS_NAMES = {
    pending: "Chờ xử lý",
    shipping: "Đang giao",
    completed: "Hoàn thành",
    cancelled: "Đã hủy"
};

/**
 * Đây là hàm init_admin: kiểm tra đăng nhập, đọc toàn bộ dữ liệu rồi hiển thị Dashboard
 */
function init_admin()
{
    var admin = read_storage(STORAGE_KEYS.admin, null);
    if (!admin)
    {
        // Chưa đăng nhập => quay về màn hình đăng nhập
        location.href = "login.html";
        return;
    }
    document.getElementById("adminName").innerHTML = "👤 " + escape_html(admin.fullName) + " <small>(" + admin.position + ")</small>";
    init_admin_menu();

    var done = 0;
    var cartsXml = null;
    var finish = function()
    {
        done++;
        if (done < 4) return;
        adminData.orders = build_orders(cartsXml);
        fill_category_filter("cboProductCategory");
        render_all();
    };
    load_file("datasets/products.xml", function(xhr) { adminData.products = parse_products(xhr.responseXML); finish(); });
    load_file("datasets/carts.xml", function(xhr) { cartsXml = xhr.responseXML; finish(); });
    load_json("datasets/customers.json", function(data) { adminData.customers = data; finish(); });
    load_json("datasets/employees.json", function(data) { adminData.employees = data; finish(); });
}

/**
 * Đây là hàm init_admin_menu: chuyển qua lại giữa các mục Tổng quan / Đơn hàng / Sản phẩm
 */
function init_admin_menu()
{
    var links = document.querySelectorAll(".admin-menu a");
    for (var i = 0; i < links.length; i++)
    {
        links[i].onclick = function(e) {
            e.preventDefault();
            show_section(this.getAttribute("data-section"));
            history.replaceState(null, "", "#" + this.getAttribute("data-section"));
        };
    }
    var hash = location.hash.replace("#", "");
    if (hash) show_section(hash);
}

/**
 * Đây là hàm show_section: hiện 1 mục quản trị, ẩn các mục còn lại
 * @param {*} name - id của section
 */
function show_section(name)
{
    var sections = document.querySelectorAll(".admin-section");
    for (var i = 0; i < sections.length; i++)
        sections[i].classList.toggle("active", sections[i].id == name);
    var links = document.querySelectorAll(".admin-menu a");
    for (var j = 0; j < links.length; j++)
        links[j].classList.toggle("active", links[j].getAttribute("data-section") == name);
}

/**
 * Đây là hàm build_orders: đọc các node <cart> trong carts.xml (DOM) và gộp với đơn online trong localStorage
 * @param {*} xmlDoc - XML Document của carts.xml
 * @returns mảng đơn hàng đã chuẩn hóa
 */
function build_orders(xmlDoc)
{
    var orders = [];
    var statusOverrides = read_storage(STORAGE_KEYS.orderStatus, {});
    var carts = xmlDoc.getElementsByTagName("cart");
    for (var i = 0; i < carts.length; i++)
    {
        var c = carts[i];
        var details = [];
        var detailNodes = c.getElementsByTagName("detail");
        for (var d = 0; d < detailNodes.length; d++)
        {
            var dn = detailNodes[d];
            var product = find_admin_product(dn.getAttribute("productId"));
            details.push({
                productId: dn.getAttribute("productId"),
                sku: dn.getAttribute("sku"),
                title: product ? product.title : "SP " + dn.getAttribute("productId"),
                color: dn.getAttribute("color"),
                size: dn.getAttribute("size"),
                quantity: parseInt(dn.getAttribute("quantity")),
                unitPrice: parseFloat(dn.getAttribute("unitPrice"))
            });
        }
        var id = c.getAttribute("id");
        var customerId = get_text(c, "customerId");
        orders.push({
            id: id,
            source: "carts.xml",
            createdDate: c.getAttribute("createdDate"),
            status: statusOverrides[id] || c.getAttribute("status"),
            paymentMethod: c.getAttribute("paymentMethod"),
            channel: c.getAttribute("channel"),
            employeeId: get_text(c, "employeeId"),
            customerId: customerId,
            customerName: find_customer_name(customerId),
            phone: "",
            address: "",
            note: get_text(c, "note"),
            details: details,
            shippingFee: parseFloat(get_text(c, "shippingFee")),
            total: parseFloat(get_text(c, "total"))
        });
    }

    var onlineOrders = read_storage(STORAGE_KEYS.orders, []);
    for (var j = 0; j < onlineOrders.length; j++)
    {
        var o = onlineOrders[j];
        o.source = "online";
        o.status = statusOverrides[o.id] || o.status;
        orders.push(o);
    }
    // Đơn mới nhất lên đầu
    orders.sort(function(a, b) { return b.createdDate.localeCompare(a.createdDate); });
    return orders;
}

/** Đây là hàm find_admin_product: tìm sản phẩm theo id */
function find_admin_product(id)
{
    for (var i = 0; i < adminData.products.length; i++)
        if (adminData.products[i].id == id) return adminData.products[i];
    return null;
}

/** Đây là hàm find_customer_name: tra cứu tên khách hàng theo mã */
function find_customer_name(id)
{
    for (var i = 0; i < adminData.customers.length; i++)
        if (adminData.customers[i].id == id) return adminData.customers[i].fullName;
    return id == "GUEST" ? "Khách vãng lai" : id;
}

/** Đây là hàm find_employee_name: tra cứu tên nhân viên theo mã */
function find_employee_name(id)
{
    for (var i = 0; i < adminData.employees.length; i++)
        if (adminData.employees[i].id == id) return adminData.employees[i].fullName;
    return id == "ONLINE" ? "Đặt online" : id;
}

/** Đây là hàm count_items: tổng số lượng sản phẩm trong 1 đơn */
function count_items(order)
{
    var n = 0;
    for (var i = 0; i < order.details.length; i++) n += order.details[i].quantity;
    return n;
}

/** Đây là hàm is_revenue: đơn được tính doanh thu (không tính đơn đã hủy) */
function is_revenue(order)
{
    return order.status != "cancelled";
}

/** Đây là hàm render_all: vẽ lại toàn bộ Dashboard */
function render_all()
{
    render_overview();
    render_orders();
    render_products_sold();
}

/**
 * Đây là hàm render_overview: các thẻ KPI + biểu đồ doanh thu theo tháng, theo trạng thái, top sản phẩm, theo nhân viên
 */
function render_overview()
{
    var orders = adminData.orders;
    var revenue = 0, itemsSold = 0, customersSet = [], pending = 0, online = 0;
    var byMonth = {}, byStatus = { pending: 0, shipping: 0, completed: 0, cancelled: 0 }, byEmployee = {};

    for (var i = 0; i < orders.length; i++)
    {
        var o = orders[i];
        byStatus[o.status] = (byStatus[o.status] || 0) + 1;
        if (o.status == "pending") pending++;
        if (o.source == "online") online++;
        if (customersSet.indexOf(o.customerId) == -1) customersSet.push(o.customerId);
        if (!is_revenue(o)) continue;
        revenue += o.total;
        itemsSold += count_items(o);
        var month = o.createdDate.substring(0, 7);         // "2026-09"
        byMonth[month] = (byMonth[month] || 0) + o.total;
        if (!byEmployee[o.employeeId]) byEmployee[o.employeeId] = { count: 0, revenue: 0 };
        byEmployee[o.employeeId].count++;
        byEmployee[o.employeeId].revenue += o.total;
    }

    var kpis = [
        { label: "Tổng đơn hàng", value: orders.length, note: online + " đơn online" },
        { label: "Doanh thu", value: format_money(revenue), note: "Không tính đơn đã hủy" },
        { label: "Sản phẩm đã bán", value: itemsSold, note: "Tổng số lượng" },
        { label: "Đơn chờ xử lý", value: pending, note: "Cần xác nhận" },
        { label: "Khách hàng mua", value: customersSet.length, note: "Khách hàng khác nhau" },
        { label: "Giá trị TB/đơn", value: format_money(orders.length ? revenue / Math.max(1, orders.length - byStatus.cancelled) : 0), note: "Đơn hợp lệ" }
    ];
    var html = "";
    for (var k = 0; k < kpis.length; k++)
        html += "<div class='kpi'><span>" + kpis[k].label + "</span><b>" + kpis[k].value + "</b><small>" + kpis[k].note + "</small></div>";
    document.getElementById("kpiCards").innerHTML = html;

    // Biểu đồ cột doanh thu theo tháng (vẽ bằng CSS)
    var months = Object.keys(byMonth).sort();
    var max = 0;
    for (var m = 0; m < months.length; m++) max = Math.max(max, byMonth[months[m]]);
    var bars = "";
    for (var m2 = 0; m2 < months.length; m2++)
    {
        var h = max ? Math.round(byMonth[months[m2]] / max * 100) : 0;
        var parts = months[m2].split("-");
        bars += "<div class='bar-col'><span class='bar-value'>" + format_money(byMonth[months[m2]]) + "</span>"
            + "<div class='bar' style='height:" + h + "%'></div><span class='bar-label'>T" + parseInt(parts[1]) + "/" + parts[0] + "</span></div>";
    }
    document.getElementById("chartMonth").innerHTML = bars || "<p class='muted'>Chưa có dữ liệu</p>";

    // Trạng thái đơn hàng
    var statusHtml = "";
    for (var s in STATUS_NAMES)
    {
        var percent = orders.length ? Math.round(byStatus[s] / orders.length * 100) : 0;
        statusHtml += "<div class='status-row'><span class='status status-" + s + "'>" + STATUS_NAMES[s] + "</span>"
            + "<div class='dist-bar'><i class='fill-" + s + "' style='width:" + percent + "%'></i></div><b>" + byStatus[s] + "</b></div>";
    }
    document.getElementById("chartStatus").innerHTML = statusHtml;

    // Top 5 sản phẩm bán chạy
    var sold = get_products_sold().slice(0, 5);
    var top = "<ol class='top-list'>";
    for (var t = 0; t < sold.length; t++)
        top += "<li><span>" + escape_html(sold[t].title) + "</span><b>" + sold[t].qty + " sp · " + format_money(sold[t].revenue) + "</b></li>";
    document.getElementById("topProducts").innerHTML = top + "</ol>";

    // Doanh thu theo nhân viên
    var rows = "";
    var empIds = Object.keys(byEmployee).sort(function(a, b) { return byEmployee[b].revenue - byEmployee[a].revenue; });
    for (var e = 0; e < empIds.length; e++)
        rows += "<tr><td>" + find_employee_name(empIds[e]) + " <small class='muted'>(" + empIds[e] + ")</small></td><td>"
            + byEmployee[empIds[e]].count + "</td><td>" + format_money(byEmployee[empIds[e]].revenue) + "</td></tr>";
    document.getElementById("tbEmployeeStats").innerHTML = rows;
}

/**
 * Đây là hàm render_orders: hiển thị bảng đơn hàng theo bộ lọc (tìm kiếm, trạng thái, nguồn, khoảng ngày)
 */
function render_orders()
{
    var keyword = document.getElementById("txtOrderSearch").value.trim().toLowerCase();
    var status = document.getElementById("cboOrderStatus").value;
    var source = document.getElementById("cboOrderSource").value;
    var from = document.getElementById("dtFrom").value;
    var to = document.getElementById("dtTo").value;

    var list = adminData.orders.filter(function(o) {
        if (keyword && o.id.toLowerCase().indexOf(keyword) == -1 && o.customerName.toLowerCase().indexOf(keyword) == -1) return false;
        if (status != "all" && o.status != status) return false;
        if (source != "all" && o.source != source) return false;
        var day = o.createdDate.substring(0, 10);
        if (from && day < from) return false;
        if (to && day > to) return false;
        return true;
    });

    var html = "";
    var total = 0;
    for (var i = 0; i < list.length; i++)
    {
        var o = list[i];
        if (is_revenue(o)) total += o.total;
        var options = "";
        for (var s in STATUS_NAMES)
            options += "<option value='" + s + "'" + (o.status == s ? " selected" : "") + ">" + STATUS_NAMES[s] + "</option>";
        html += "<tr>"
            + "<td><b>" + o.id + "</b><br><small class='muted'>" + (o.source == "online" ? "Online" : "carts.xml") + "</small></td>"
            + "<td class='nowrap'>" + format_date(o.createdDate) + "</td>"
            + "<td>" + escape_html(o.customerName) + "<br><small class='muted'>" + o.customerId + "</small></td>"
            + "<td>" + find_employee_name(o.employeeId) + "</td>"
            + "<td>" + count_items(o) + "</td>"
            + "<td class='nowrap'><b>" + format_money(o.total) + "</b></td>"
            + "<td>" + o.paymentMethod + "</td>"
            + "<td><select class='status-select status-" + o.status + "' onchange=\"update_status('" + o.id + "', this.value)\">" + options + "</select></td>"
            + "<td><button type='button' class='btn btn-ghost btn-sm' onclick=\"show_order_detail('" + o.id + "')\">Chi tiết</button></td>"
            + "</tr>";
    }
    document.getElementById("tbOrders").innerHTML = html || "<tr><td colspan='9'>Không có đơn hàng phù hợp.</td></tr>";
    document.getElementById("orderInfo").innerHTML = "Hiển thị <b>" + list.length + "</b> / " + adminData.orders.length
        + " đơn – Doanh thu (không tính đơn hủy): <b>" + format_money(total) + "</b>";
}

/**
 * Đây là hàm update_status: Admin đổi trạng thái đơn hàng, lưu vào localStorage và cập nhật lại thống kê
 * @param {*} orderId - mã đơn
 * @param {*} status - trạng thái mới
 */
function update_status(orderId, status)
{
    var overrides = read_storage(STORAGE_KEYS.orderStatus, {});
    overrides[orderId] = status;
    write_storage(STORAGE_KEYS.orderStatus, overrides);
    for (var i = 0; i < adminData.orders.length; i++)
        if (adminData.orders[i].id == orderId) adminData.orders[i].status = status;
    render_all();
    show_toast("Đơn <b>" + orderId + "</b> chuyển sang trạng thái <b>" + STATUS_NAMES[status] + "</b>", "success");
}

/**
 * Đây là hàm show_order_detail: popup chi tiết hóa đơn (mã HĐ, ngày tạo, nhân viên, khách hàng, chi tiết)
 * @param {*} orderId - mã đơn
 */
function show_order_detail(orderId)
{
    var o = null;
    for (var i = 0; i < adminData.orders.length; i++)
        if (adminData.orders[i].id == orderId) o = adminData.orders[i];
    if (!o) return;

    var rows = "", subtotal = 0;
    for (var j = 0; j < o.details.length; j++)
    {
        var d = o.details[j];
        var line = d.quantity * d.unitPrice;
        subtotal += line;
        rows += "<tr><td>" + (j + 1) + "</td><td>" + escape_html(d.title) + "</td><td><code>" + d.sku + "</code></td><td>" + d.color + " / " + d.size
            + "</td><td>" + d.quantity + "</td><td>" + format_money(d.unitPrice) + "</td><td>" + format_money(line) + "</td></tr>";
    }
    document.getElementById("orderDetail").innerHTML =
        "<h2>Chi tiết hóa đơn " + o.id + " <span class='status status-" + o.status + "'>" + STATUS_NAMES[o.status] + "</span></h2>"
        + "<div class='info-grid'>"
        + "<p><span>Ngày tạo</span><b>" + format_date(o.createdDate) + "</b></p>"
        + "<p><span>Nguồn</span><b>" + (o.source == "online" ? "Đặt online (localStorage)" : "carts.xml – kênh " + o.channel) + "</b></p>"
        + "<p><span>Nhân viên</span><b>" + find_employee_name(o.employeeId) + " (" + o.employeeId + ")</b></p>"
        + "<p><span>Khách hàng</span><b>" + escape_html(o.customerName) + " (" + o.customerId + ")</b></p>"
        + (o.phone ? "<p><span>Điện thoại</span><b>" + o.phone + "</b></p>" : "")
        + (o.address ? "<p><span>Địa chỉ</span><b>" + escape_html(o.address) + "</b></p>" : "")
        + "<p><span>Thanh toán</span><b>" + o.paymentMethod + "</b></p>"
        + "<p><span>Ghi chú</span><b>" + escape_html(o.note || "Không có") + "</b></p>"
        + "</div>"
        + "<div class='table-wrap'><table class='data-table'><thead><tr><th>#</th><th>Sản phẩm</th><th>SKU</th><th>Màu / Size</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>"
        + "<tbody>" + rows + "</tbody>"
        + "<tfoot><tr><td colspan='6'>Tạm tính</td><td>" + format_money(subtotal) + "</td></tr>"
        + "<tr><td colspan='6'>Phí giao hàng</td><td>" + format_money(o.shippingFee) + "</td></tr>"
        + "<tr class='grand'><td colspan='6'>Tổng cộng</td><td>" + format_money(o.total) + "</td></tr></tfoot></table></div>";
    open_modal("orderModal");
}

/**
 * Đây là hàm get_products_sold: gom nhóm chi tiết hóa đơn theo sản phẩm (không tính đơn đã hủy)
 * @returns mảng [{id, title, category, price, qty, revenue, variants: {sku: qty}, stock}]
 */
function get_products_sold()
{
    var map = {};
    for (var p = 0; p < adminData.products.length; p++)
    {
        var pr = adminData.products[p];
        map[pr.id] = { id: pr.id, title: pr.title, image: pr.image, localImage: pr.localImage, category: pr.category, categoryName: pr.categoryName,
                       price: pr.price, qty: 0, revenue: 0, variants: {}, stock: pr.totalStock };
    }
    for (var i = 0; i < adminData.orders.length; i++)
    {
        var o = adminData.orders[i];
        if (!is_revenue(o)) continue;
        for (var j = 0; j < o.details.length; j++)
        {
            var d = o.details[j];
            if (!map[d.productId]) continue;
            map[d.productId].qty += d.quantity;
            map[d.productId].revenue += d.quantity * d.unitPrice;
            var label = d.color + " / " + d.size;
            map[d.productId].variants[label] = (map[d.productId].variants[label] || 0) + d.quantity;
        }
    }
    var list = [];
    for (var id in map) list.push(map[id]);
    list.sort(function(a, b) { return b.qty - a.qty || b.revenue - a.revenue; });
    return list;
}

/** Đây là hàm fill_category_filter: nạp danh mục vào dropdown lọc sản phẩm */
function fill_category_filter(cbo)
{
    cbo = document.getElementById(cbo);
    var names = [];
    for (var i = 0; i < adminData.products.length; i++)
    {
        var p = adminData.products[i];
        if (names.indexOf(p.category) == -1)
        {
            names.push(p.category);
            cbo.innerHTML += "<option value=\"" + escape_html(p.category) + "\">" + p.categoryName + "</option>";
        }
    }
}

/**
 * Đây là hàm render_products_sold: bảng thống kê các sản phẩm được bán
 */
function render_products_sold()
{
    var category = document.getElementById("cboProductCategory").value;
    var sortBy = document.getElementById("cboProductSort").value;
    var onlySold = document.getElementById("chkOnlySold").checked;
    var list = get_products_sold().filter(function(p) {
        if (category != "all" && p.category != category) return false;
        if (onlySold && p.qty == 0) return false;
        return true;
    });
    if (sortBy == "revenue") list.sort(function(a, b) { return b.revenue - a.revenue; });

    var totalRevenue = 0;
    for (var t = 0; t < list.length; t++) totalRevenue += list[t].revenue;

    var html = "";
    for (var i = 0; i < list.length; i++)
    {
        var p = list[i];
        var share = totalRevenue ? Math.round(p.revenue / totalRevenue * 1000) / 10 : 0;
        var bestVariant = "–", bestQty = 0;
        for (var v in p.variants)
            if (p.variants[v] > bestQty) { bestQty = p.variants[v]; bestVariant = v + " (" + p.variants[v] + ")"; }
        html += "<tr><td>" + (i + 1) + "</td>"
            + "<td class='prod-cell'>" + product_image(p) + "<span>" + escape_html(p.title) + "</span></td>"
            + "<td>" + p.categoryName + "</td><td>" + format_money(p.price) + "</td>"
            + "<td><b>" + p.qty + "</b></td><td><b>" + format_money(p.revenue) + "</b></td>"
            + "<td><div class='share'><div class='dist-bar'><i style='width:" + share + "%'></i></div><span>" + share + "%</span></div></td>"
            + "<td>" + bestVariant + "</td><td>" + p.stock + "</td></tr>";
    }
    document.getElementById("tbProductsSold").innerHTML = html || "<tr><td colspan='9'>Không có dữ liệu.</td></tr>";
}

/** Đây là hàm open_modal / close_modal: mở/đóng popup trên trang Admin */
function open_modal(id) { document.getElementById(id).classList.add("open"); }
function close_modal(id) { document.getElementById(id).classList.remove("open"); }

/** Đây là hàm admin_logout: đăng xuất khỏi trang quản trị */
function admin_logout()
{
    try { localStorage.removeItem(STORAGE_KEYS.admin); } catch (e) {}
    location.href = "login.html";
}

document.addEventListener("click", function(e) {
    if (e.target.classList && e.target.classList.contains("modal")) close_modal(e.target.id);
});
