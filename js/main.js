/*
 * main.js - Trang cửa hàng (index.html)
 *   Câu 2: nạp dữ liệu cho Search Form ở aside, xử lý tìm kiếm nâng cao
 *   Câu 3: Skeleton Loading trước khi dữ liệu được tải về, render lưới sản phẩm
 *   Câu 4: Event Delegation - chỉ 1 Event Listener trên container cha #productGrid
 * Sinh viên: Vương Anh Kiệt - MSSV: K244161793 - Lớp: K24416
 */

var products = [];            // mảng sản phẩm đọc từ datasets/products.xml
var categories = [];          // mảng danh mục [{id, name}]
var customers = [];           // mảng khách hàng đọc từ datasets/customers.json
var selectedOptions = {};     // màu/size đang chọn của từng sản phẩm: { "1": {color: "Trắng", size: "Free size"} }
var SKELETON_DELAY = 1200;    // giả lập mạng chậm 1.2 giây để thấy rõ hiệu ứng Skeleton Loading
var SKELETON_COUNT = 8;       // số khối skeleton hiển thị

/**
 * Đây là hàm init_shop: khởi tạo trang cửa hàng
 * 1) Hiển thị Skeleton  2) Gắn DUY NHẤT 1 listener lên container  3) Đọc products.xml, customers.json, reviews.xml
 * @param {*} productgrid - id của container cha chứa toàn bộ sản phẩm
 */
function init_shop(productgrid)
{
    var grid = document.getElementById(productgrid);
    render_skeleton(grid, SKELETON_COUNT);

    // ===== CÂU 4: gắn 1 Event Listener duy nhất trên phần tử cha =====
    // Mọi nút "Thêm vào giỏ hàng", "Xem nhanh", chọn màu, chọn size, "Rating Detail" của tất cả sản phẩm
    // đều được xử lý tại đây nhờ cơ chế nổi bọt sự kiện (event bubbling).
    grid.addEventListener("click", handle_product_click);

    init_search_form("frmSearch");
    init_modals();
    cart.load();
    render_mini_cart();
    show_customer_box();

    var startTime = Date.now();
    var done = 0;
    // Hàm finish chỉ render khi cả 3 nguồn dữ liệu đã đọc xong
    var finish = function()
    {
        done++;
        if (done < 3) return;
        var wait = Math.max(0, SKELETON_DELAY - (Date.now() - startTime));
        setTimeout(function() {
            fill_categories("cboCategory");
            fill_colors("colorOptions");
            apply_filters();
        }, wait);
    };

    load_file("datasets/products.xml", function(xhr) {
        var xmlDoc = xhr.responseXML;
        products = parse_products(xmlDoc);
        var catNodes = xmlDoc.getElementsByTagName("category");
        for (var i = 0; i < catNodes.length; i++)
            categories.push({ id: catNodes[i].getAttribute("id"), name: catNodes[i].getAttribute("name") });
        finish();
    }, function() {
        grid.innerHTML = "<p class='empty-state'>Không đọc được datasets/products.xml. Hãy mở website bằng Live Server hoặc GitHub Pages (không mở trực tiếp file://).</p>";
    });

    load_json("datasets/customers.json", function(data) {
        customers = data;
        finish();
    });

    // Câu 5: đọc reviews.xml bằng DOMParser và tính điểm trung bình theo product_id
    load_reviews("datasets/reviews.xml", function() {
        finish();
    });
}

/**
 * Đây là hàm render_skeleton: CÂU 3 - tạo các khối "khung xương" có hiệu ứng shimmer (CSS3 animation)
 * hiển thị trong lúc chờ dữ liệu được tải về
 * @param {*} grid - phần tử container
 * @param {*} count - số khối skeleton
 */
function render_skeleton(grid, count)
{
    var html = "";
    for (var i = 0; i < count; i++)
    {
        html += "<article class='product-card skeleton-card' aria-hidden='true'>"
            + "<div class='skeleton sk-thumb'></div>"
            + "<div class='card-body'>"
            + "<div class='skeleton sk-line sk-w90'></div>"
            + "<div class='skeleton sk-line sk-w60'></div>"
            + "<div class='skeleton sk-line sk-w40'></div>"
            + "<div class='skeleton sk-btn'></div>"
            + "</div></article>";
    }
    grid.innerHTML = html;
    grid.setAttribute("aria-busy", "true");
    document.getElementById("resultInfo").innerHTML = "Đang tải dữ liệu...";
}

/**
 * Đây là hàm fill_categories: nạp danh mục từ products.xml vào dropdown của Search Form
 * @param {*} cbocategory - id của thẻ select danh mục
 */
function fill_categories(cbocategory)
{
    cbocategory = document.getElementById(cbocategory);
    for (var i = 0; i < categories.length; i++)
    {
        var count = products.filter(function(p) { return p.category == categories[i].id; }).length;
        cbocategory.innerHTML += "<option value=\"" + escape_html(categories[i].id) + "\">"
            + categories[i].name + " (" + count + ")</option>";
    }
}

/**
 * Đây là hàm fill_colors: gom nhóm các màu không trùng nhau của tất cả sản phẩm và tạo radio chọn màu
 * @param {*} coloroptions - id của khung chứa các radio màu
 */
function fill_colors(coloroptions)
{
    coloroptions = document.getElementById(coloroptions);
    var names = [];
    for (var i = 0; i < products.length; i++)
    {
        for (var c = 0; c < products[i].colors.length; c++)
        {
            var color = products[i].colors[c];
            // màu chưa có trong mảng names thì mới thêm => không bị trùng
            if (names.indexOf(color.name) == -1)
            {
                names.push(color.name);
                coloroptions.innerHTML += "<label class='color-option' title='" + color.name + "'>"
                    + "<input type='radio' name='color' value='" + color.name + "'>"
                    + "<span><i class='dot' style='background:" + color.hex + "'></i>" + color.name + "</span></label>";
            }
        }
    }
}

/**
 * Đây là hàm init_search_form: xử lý sự kiện submit/reset và kiểm tra hợp lệ (HTML5 Constraint Validation API)
 * @param {*} frmsearch - id của form tìm kiếm
 */
function init_search_form(frmsearch)
{
    var form = document.getElementById(frmsearch);
    var priceMin = document.getElementById("numPriceMin");
    var priceMax = document.getElementById("numPriceMax");

    // Kiểm tra thêm điều kiện "Giá đến >= Giá từ" bằng setCustomValidity
    var checkPrice = function()
    {
        var msg = "";
        if (priceMin.value !== "" && priceMax.value !== "" && parseFloat(priceMax.value) < parseFloat(priceMin.value))
            msg = "Giá đến phải lớn hơn hoặc bằng giá từ";
        priceMax.setCustomValidity(msg);
        document.getElementById("priceError").innerHTML = msg;
    };
    priceMin.oninput = checkPrice;
    priceMax.oninput = checkPrice;

    form.onsubmit = function(e)
    {
        e.preventDefault();
        checkPrice();
        var keyword = document.getElementById("txtKeyword");
        var keywordMsg = "";
        if (keyword.validity.tooShort) keywordMsg = "Từ khóa phải có ít nhất " + keyword.minLength + " ký tự";
        else if (keyword.validity.patternMismatch) keywordMsg = "Từ khóa chứa ký tự không hợp lệ (" + keyword.title + ")";
        document.getElementById("keywordError").innerHTML = keywordMsg;
        if (priceMin.validity.rangeUnderflow || priceMax.validity.rangeOverflow || priceMin.validity.rangeOverflow)
            document.getElementById("priceError").innerHTML = "Giá phải nằm trong khoảng 0 – 10000";
        if (!form.checkValidity())
        {
            form.reportValidity();   // hiển thị bong bóng lỗi chuẩn của HTML5 (Constraint Validation API)
            return;
        }
        apply_filters();
        document.getElementById("products").scrollIntoView({ behavior: "smooth" });
    };
    form.onreset = function()
    {
        // Đợi form reset xong giá trị rồi mới lọc lại
        setTimeout(function() {
            document.getElementById("outRating").value = 0;
            priceMax.setCustomValidity("");
            document.getElementById("priceError").innerHTML = "";
            document.getElementById("keywordError").innerHTML = "";
            apply_filters();
        }, 0);
    };
}

/**
 * Đây là hàm get_filters: đọc các giá trị đang nhập trên Search Form
 * @returns đối tượng điều kiện lọc
 */
function get_filters()
{
    var color = "all";
    var radios = document.getElementsByName("color");
    for (var i = 0; i < radios.length; i++)
        if (radios[i].checked) color = radios[i].value;
    return {
        keyword: document.getElementById("txtKeyword").value.trim().toLowerCase(),
        category: document.getElementById("cboCategory").value,
        priceMin: document.getElementById("numPriceMin").value === "" ? 0 : parseFloat(document.getElementById("numPriceMin").value),
        priceMax: document.getElementById("numPriceMax").value === "" ? Infinity : parseFloat(document.getElementById("numPriceMax").value),
        color: color,
        rating: parseFloat(document.getElementById("rngRating").value),
        inStock: document.getElementById("chkInStock").checked,
        sort: document.getElementById("cboSort").value
    };
}

/**
 * Đây là hàm apply_filters: lọc + sắp xếp danh sách sản phẩm theo Search Form rồi render lại lưới
 */
function apply_filters()
{
    if (products.length == 0) return;
    var f = get_filters();
    var list = products.filter(function(p) {
        if (f.keyword && p.title.toLowerCase().indexOf(f.keyword) == -1 && p.description.toLowerCase().indexOf(f.keyword) == -1)
            return false;
        if (f.category != "all" && p.category != f.category) return false;
        if (p.price < f.priceMin || p.price > f.priceMax) return false;
        if (f.color != "all" && !p.colors.some(function(c) { return c.name == f.color; })) return false;
        if (get_average_rating(p) < f.rating) return false;
        if (f.inStock && p.totalStock == 0) return false;
        return true;
    });

    if (f.sort == "price-asc") list.sort(function(a, b) { return a.price - b.price; });
    else if (f.sort == "price-desc") list.sort(function(a, b) { return b.price - a.price; });
    else if (f.sort == "rating-desc") list.sort(function(a, b) { return get_average_rating(b) - get_average_rating(a); });
    else if (f.sort == "name-asc") list.sort(function(a, b) { return a.title.localeCompare(b.title); });

    // Nếu đang lọc theo màu thì chọn sẵn màu đó trên thẻ sản phẩm
    if (f.color != "all")
    {
        for (var i = 0; i < list.length; i++)
            get_selected(list[i]).color = f.color;
    }
    render_products("productGrid", list);
}

/**
 * Đây là hàm get_product: tìm sản phẩm theo id
 * @param {*} id - mã sản phẩm
 */
function get_product(id)
{
    for (var i = 0; i < products.length; i++)
        if (products[i].id == id) return products[i];
    return null;
}

/**
 * Đây là hàm get_selected: lấy màu/size đang chọn của sản phẩm (mặc định chọn biến thể đầu tiên còn hàng)
 * @param {*} p - sản phẩm
 */
function get_selected(p)
{
    if (!selectedOptions[p.id])
    {
        var first = p.variants[0];
        for (var i = 0; i < p.variants.length; i++)
            if (p.variants[i].stock > 0) { first = p.variants[i]; break; }
        selectedOptions[p.id] = { color: first.color, size: first.size };
    }
    return selectedOptions[p.id];
}

/**
 * Đây là hàm find_variant: tìm biến thể theo màu + size
 * @param {*} p - sản phẩm
 * @param {*} color - tên màu
 * @param {*} size - tên size
 */
function find_variant(p, color, size)
{
    for (var i = 0; i < p.variants.length; i++)
        if (p.variants[i].color == color && p.variants[i].size == size) return p.variants[i];
    return p.variants[0];
}

/**
 * Đây là hàm find_variant_by_sku: tìm biến thể theo mã SKU (giá trị data-variant)
 * @param {*} p - sản phẩm
 * @param {*} sku - mã SKU
 */
function find_variant_by_sku(p, sku)
{
    for (var i = 0; i < p.variants.length; i++)
        if (p.variants[i].sku == sku) return p.variants[i];
    return null;
}

/**
 * Đây là hàm stock_text: tạo dòng chữ tình trạng tồn kho của biến thể
 * @param {*} variant - biến thể
 */
function stock_text(variant)
{
    if (variant.stock == 0) return "<span class='out'>Hết hàng</span>";
    if (variant.stock <= 5) return "<span class='low'>Chỉ còn " + variant.stock + " sản phẩm</span>";
    return "Còn " + variant.stock + " sản phẩm";
}

/**
 * Đây là hàm card_html: tạo mã HTML cho 1 thẻ <article> sản phẩm.
 * Các nút KHÔNG gắn onclick riêng, chỉ mang data-action, data-id, data-variant để xử lý tập trung (Câu 4).
 * @param {*} p - sản phẩm
 */
function card_html(p)
{
    var sel = get_selected(p);
    var variant = find_variant(p, sel.color, sel.size);

    var swatches = "";
    for (var c = 0; c < p.colors.length; c++)
    {
        var color = p.colors[c];
        swatches += "<button type='button' class='swatch" + (color.name == sel.color ? " active" : "") + "'"
            + " data-action='pick-color' data-id='" + p.id + "' data-color='" + color.name + "'"
            + " style='background:" + color.hex + "' title='" + color.name + "' aria-label='Màu " + color.name + "'></button>";
    }
    var sizes = "";
    for (var s = 0; s < p.sizes.length; s++)
    {
        sizes += "<button type='button' class='chip" + (p.sizes[s] == sel.size ? " active" : "") + "'"
            + " data-action='pick-size' data-id='" + p.id + "' data-size='" + p.sizes[s] + "'>" + p.sizes[s] + "</button>";
    }

    return "<article class='product-card' data-id='" + p.id + "'>"
        + "<div class='thumb'>"
        +   product_image(p, "loading='lazy'")
        +   "<span class='badge-cat'>" + p.categoryName + "</span>"
        +   "<!-- Câu 5: span điểm sao trung bình sẽ được chèn vào đây -->"
        + "</div>"
        + "<div class='card-body'>"
        +   "<h3 class='card-title' title='" + escape_html(p.title) + "'>" + escape_html(p.title) + "</h3>"
        +   "<p class='price'>" + format_money(p.price) + "</p>"
        +   "<div class='option-row'><span class='option-label'>Màu: <b class='sel-color'>" + sel.color + "</b></span><div class='swatches'>" + swatches + "</div></div>"
        +   "<div class='option-row'><span class='option-label'>Size:</span><div class='chips'>" + sizes + "</div></div>"
        +   "<p class='stock'>" + stock_text(variant) + "</p>"
        +   "<div class='card-actions'>"
        +     "<button type='button' class='btn btn-primary btn-add' data-action='add-to-cart' data-id='" + p.id + "' data-variant='" + variant.sku + "'"
        +       (variant.stock == 0 ? " disabled" : "") + ">Thêm vào giỏ hàng</button>"
        +     "<button type='button' class='btn btn-ghost btn-quick' data-action='quick-view' data-id='" + p.id + "' data-variant='" + variant.sku + "'>Xem nhanh</button>"
        +   "</div>"
        +   "<button type='button' class='link-btn' data-action='rating-detail' data-id='" + p.id + "'>Rating Detail ›</button>"
        + "</div>"
        + "</article>";
}

/**
 * Đây là hàm render_products: render danh sách sản phẩm lên lưới, sau đó chèn điểm sao trung bình (Câu 5)
 * @param {*} productgrid - id của container
 * @param {*} list - mảng sản phẩm cần hiển thị
 */
function render_products(productgrid, list)
{
    var grid = document.getElementById(productgrid);
    grid.setAttribute("aria-busy", "false");
    if (list.length == 0)
    {
        grid.innerHTML = "<p class='empty-state'>Không tìm thấy sản phẩm phù hợp. Hãy thử thay đổi điều kiện tìm kiếm.</p>";
    }
    else
    {
        var html = "";
        for (var i = 0; i < list.length; i++)
            html += card_html(list[i]);
        // Render lại toàn bộ lưới nhưng KHÔNG cần gắn lại listener vì listener nằm ở container cha
        grid.innerHTML = html;
        render_rating_badges(grid);
    }
    document.getElementById("resultInfo").innerHTML = "Tìm thấy <b>" + list.length + "</b> / " + products.length + " sản phẩm";
}

/**
 * Đây là hàm handle_product_click: CÂU 4 - hàm xử lý DUY NHẤT cho mọi click trong #productGrid.
 * Dùng event.target.closest("[data-action]") để biết người dùng bấm vào nút nào,
 * sau đó trích xuất data-id và data-variant của sản phẩm tương ứng.
 * @param {*} event - đối tượng sự kiện click
 */
function handle_product_click(event)
{
    var button = event.target.closest("[data-action]");
    if (!button || !event.currentTarget.contains(button)) return;   // click vào vùng trống thì bỏ qua

    var action = button.getAttribute("data-action");
    var card = button.closest(".product-card");
    var id = button.getAttribute("data-id") || card.getAttribute("data-id");
    var variantSku = button.getAttribute("data-variant");
    var product = get_product(id);

    if (action == "pick-color" || action == "pick-size")
    {
        var sel = get_selected(product);
        if (action == "pick-color") sel.color = button.getAttribute("data-color");
        else sel.size = button.getAttribute("data-size");
        update_card_variant(card, product);
        variantSku = find_variant(product, sel.color, sel.size).sku;
    }
    else if (action == "add-to-cart")
    {
        var variant = find_variant_by_sku(product, variantSku);
        cart.add(product, variant, 1);            // Câu 6
    }
    else if (action == "quick-view")
    {
        show_quick_view(product, variantSku);
    }
    else if (action == "rating-detail")
    {
        show_rating_detail(product);              // Câu 5
    }

    log_event(action, id, variantSku);
}

/**
 * Đây là hàm update_card_variant: khi đổi màu/size thì cập nhật lại data-variant của 2 nút, tồn kho, trạng thái nút
 * @param {*} card - thẻ article của sản phẩm
 * @param {*} product - sản phẩm
 */
function update_card_variant(card, product)
{
    var sel = get_selected(product);
    var variant = find_variant(product, sel.color, sel.size);

    var swatches = card.querySelectorAll(".swatch");
    for (var i = 0; i < swatches.length; i++)
        swatches[i].classList.toggle("active", swatches[i].getAttribute("data-color") == sel.color);
    var chips = card.querySelectorAll(".chip");
    for (var j = 0; j < chips.length; j++)
        chips[j].classList.toggle("active", chips[j].getAttribute("data-size") == sel.size);

    card.querySelector(".sel-color").innerHTML = sel.color;
    card.querySelector(".stock").innerHTML = stock_text(variant);
    var btnAdd = card.querySelector(".btn-add");
    btnAdd.setAttribute("data-variant", variant.sku);
    btnAdd.disabled = variant.stock == 0;
    card.querySelector(".btn-quick").setAttribute("data-variant", variant.sku);
}

/**
 * Đây là hàm log_event: hiển thị kết quả trích xuất data-id, data-variant lên khung "Event Delegation" và console
 * @param {*} action - tên hành động (data-action)
 * @param {*} id - data-id
 * @param {*} variant - data-variant
 */
function log_event(action, id, variant)
{
    var names = {
        "add-to-cart": "Thêm vào giỏ hàng",
        "quick-view": "Xem nhanh",
        "pick-color": "Chọn màu",
        "pick-size": "Chọn size",
        "rating-detail": "Rating Detail"
    };
    document.getElementById("eventLog").innerHTML =
        "<dt>Hành động</dt><dd>" + (names[action] || action) + "</dd>"
        + "<dt>data-id</dt><dd>" + id + "</dd>"
        + "<dt>data-variant</dt><dd>" + (variant || "–") + "</dd>";
    console.log("[Event Delegation] action=" + action + " | data-id=" + id + " | data-variant=" + variant);
}

/**
 * Đây là hàm show_quick_view: hiển thị popup "Xem nhanh" với thông tin chi tiết của biến thể đang chọn
 * @param {*} product - sản phẩm
 * @param {*} sku - mã biến thể (data-variant)
 */
function show_quick_view(product, sku)
{
    var variant = find_variant_by_sku(product, sku);
    var stats = get_review_stats(product.id);
    var rows = "";
    for (var i = 0; i < product.variants.length; i++)
    {
        var v = product.variants[i];
        rows += "<tr" + (v.sku == sku ? " class='row-active'" : "") + "><td>" + v.sku + "</td><td>" + v.color
            + "</td><td>" + v.size + "</td><td>" + v.stock + "</td></tr>";
    }
    document.getElementById("quickViewBody").innerHTML =
        "<div class='qv-layout'>"
        + "<div class='qv-image'>" + product_image(product) + "</div>"
        + "<div class='qv-info'>"
        +   "<p class='muted'>" + product.categoryName + " · Mã SP: " + product.id + "</p>"
        +   "<h2 id='qvTitle'>" + escape_html(product.title) + "</h2>"
        +   "<p class='price big'>" + format_money(product.price) + "</p>"
        +   "<p>★ " + (stats.count ? stats.average.toFixed(1) + " (" + stats.count + " đánh giá)" : "Chưa có đánh giá") + "</p>"
        +   "<p class='qv-desc'>" + escape_html(product.description) + "</p>"
        +   "<p><b>Biến thể đang chọn:</b> " + variant.color + " / " + variant.size + " – SKU <code>" + variant.sku + "</code> – " + stock_text(variant) + "</p>"
        +   "<div class='table-wrap'><table class='data-table small'><thead><tr><th>SKU</th><th>Màu</th><th>Size</th><th>Tồn kho</th></tr></thead><tbody>" + rows + "</tbody></table></div>"
        +   "<button type='button' class='btn btn-primary keep-cart' " + (variant.stock == 0 ? "disabled" : "")
        +   " onclick=\"cart.add(get_product('" + product.id + "'), find_variant_by_sku(get_product('" + product.id + "'), '" + variant.sku + "'), 1); close_modal('quickViewModal')\">Thêm vào giỏ hàng</button>"
        + "</div></div>";
    open_modal("quickViewModal");
}

/**
 * Đây là hàm open_modal: mở cửa sổ popup
 * @param {*} modalid - id của modal
 */
function open_modal(modalid)
{
    document.getElementById(modalid).classList.add("open");
    document.body.classList.add("no-scroll");
}

/**
 * Đây là hàm close_modal: đóng cửa sổ popup
 * @param {*} modalid - id của modal
 */
function close_modal(modalid)
{
    document.getElementById(modalid).classList.remove("open");
    if (!document.querySelector(".modal.open"))
        document.body.classList.remove("no-scroll");
}

/**
 * Đây là hàm init_modals: đóng modal khi bấm ra vùng nền tối hoặc nhấn phím Esc
 */
function init_modals()
{
    var modals = document.querySelectorAll(".modal");
    for (var i = 0; i < modals.length; i++)
    {
        modals[i].onclick = function(e) {
            if (e.target == this) close_modal(this.id);
        };
    }
    document.onkeydown = function(e) {
        if (e.key == "Escape")
        {
            var opened = document.querySelectorAll(".modal.open");
            for (var j = 0; j < opened.length; j++) close_modal(opened[j].id);
            hide_mini_cart();
        }
    };
}
