/*
 * build-products.js - CÂU 1: Dùng mô hình DOM đọc dữ liệu https://fakestoreapi.com/products,
 * bổ sung MÀU SẮC + SIZE + TỒN KHO (theo từng biến thể/variant) rồi lưu thành file products.xml
 * Sinh viên: Vương Anh Kiệt - MSSV: K244161793 - Lớp: K24416
 */

var API_URL = "https://fakestoreapi.com/products";

/* Dữ liệu JSON đọc được từ API (mảng 20 sản phẩm) */
var apiProducts = [];
/* XML Document được tạo bằng DOM */
var productsXmlDoc = null;

/* Bảng màu cho quần áo / điện tử (code dùng để tạo mã SKU) */
var COLOR_PALETTE = [
    { name: "Đen",       code: "BLK", hex: "#1f2937" },
    { name: "Trắng",     code: "WHT", hex: "#f8fafc" },
    { name: "Xanh navy", code: "NVY", hex: "#1e3a8a" },
    { name: "Đỏ",        code: "RED", hex: "#dc2626" },
    { name: "Be",        code: "BEI", hex: "#d6c4a8" },
    { name: "Xanh rêu",  code: "OLV", hex: "#4d7c0f" },
    { name: "Hồng",      code: "PNK", hex: "#ec4899" },
    { name: "Xám",       code: "GRY", hex: "#6b7280" }
];
/* Bảng màu riêng cho trang sức */
var JEWELRY_COLORS = [
    { name: "Vàng",      code: "GLD", hex: "#d4af37" },
    { name: "Bạc",       code: "SLV", hex: "#c0c0c0" },
    { name: "Vàng hồng", code: "RGD", hex: "#e8b4a0" }
];
/* Tên tiếng Việt của danh mục */
var CATEGORY_NAMES = {
    "men's clothing": "Thời trang nam",
    "women's clothing": "Thời trang nữ",
    "jewelery": "Trang sức",
    "electronics": "Điện tử"
};

/**
 * Đây là hàm load_api: dùng AJAX (XMLHttpRequest) đọc dữ liệu JSON từ fakestoreapi
 * @param {*} tbpreview - id của tbody hiển thị bảng xem trước dữ liệu API
 * @param {*} pstatus - id của thẻ hiển thị trạng thái
 */
function load_api(tbpreview, pstatus)
{
    pstatus = document.getElementById(pstatus);
    pstatus.innerHTML = "Đang đọc dữ liệu từ " + API_URL + " ...";
    var xhr = new XMLHttpRequest();
    xhr.open("GET", API_URL, true);
    xhr.onreadystatechange = function()
    {
        if (xhr.readyState == 4)
        {
            if (xhr.status == 200)
            {
                apiProducts = JSON.parse(xhr.responseText);
                pstatus.innerHTML = "✔ Đọc thành công <b>" + apiProducts.length + "</b> sản phẩm từ API.";
                show_api_preview(tbpreview);
                document.getElementById("btnBuild").disabled = false;
            }
            else
            {
                pstatus.innerHTML = "✘ Không đọc được API (mã lỗi " + xhr.status + "). Kiểm tra kết nối mạng.";
            }
        }
    };
    xhr.send();
}

/**
 * Đây là hàm show_api_preview: hiển thị dữ liệu gốc của API lên bảng để đối chiếu
 * @param {*} tbpreview - id của tbody
 */
function show_api_preview(tbpreview)
{
    tbpreview = document.getElementById(tbpreview);
    tbpreview.innerHTML = "";
    for (var i = 0; i < apiProducts.length; i++)
    {
        var p = apiProducts[i];
        tbpreview.innerHTML += "<tr><td>" + p.id + "</td><td>" + escape_html(p.title) + "</td><td>"
            + p.category + "</td><td>" + p.price + "</td><td>" + p.rating.rate + " (" + p.rating.count + ")</td></tr>";
    }
}

/**
 * Đây là hàm get_colors: quy tắc bổ sung màu sắc cho sản phẩm theo danh mục
 * - Quần áo: 3 màu lấy trong COLOR_PALETTE theo vị trí (id, id+2, id+5) => không trùng nhau
 * - Trang sức: Vàng, Bạc, Vàng hồng
 * - Điện tử: Đen và (Trắng hoặc Xám)
 * @param {*} p - sản phẩm JSON từ API
 */
function get_colors(p)
{
    if (p.category == "jewelery")
        return JEWELRY_COLORS;
    if (p.category == "electronics")
        return [COLOR_PALETTE[0], p.id % 2 == 0 ? COLOR_PALETTE[1] : COLOR_PALETTE[7]];
    return [
        COLOR_PALETTE[p.id % 8],
        COLOR_PALETTE[(p.id + 2) % 8],
        COLOR_PALETTE[(p.id + 5) % 8]
    ];
}

/**
 * Đây là hàm get_sizes: quy tắc bổ sung size
 * - Quần áo: S, M, L, XL (riêng balo là Free size)
 * - Trang sức: Free size
 * - Điện tử: Tiêu chuẩn
 * @param {*} p - sản phẩm JSON từ API
 */
function get_sizes(p)
{
    if (p.category == "electronics")
        return ["Tiêu chuẩn"];
    if (p.category == "jewelery" || p.title.toLowerCase().indexOf("backpack") != -1)
        return ["Free size"];
    return ["S", "M", "L", "XL"];
}

/**
 * Đây là hàm get_size_code: đổi tên size thành mã ngắn để ghép SKU
 * @param {*} size - tên size
 */
function get_size_code(size)
{
    if (size == "Free size") return "FS";
    if (size == "Tiêu chuẩn") return "STD";
    return size;
}

/**
 * Đây là hàm get_stock: quy tắc giả lập tồn kho cho từng biến thể (màu + size).
 * Có cố ý tạo một số biến thể hết hàng (stock = 0) để kiểm thử chức năng giỏ hàng.
 * @param {*} id - mã sản phẩm
 * @param {*} colorIndex - vị trí màu
 * @param {*} sizeIndex - vị trí size
 */
function get_stock(id, colorIndex, sizeIndex)
{
    var s = (id * 7 + colorIndex * 11 + sizeIndex * 5) % 23;
    return s < 3 ? 0 : s;
}

/**
 * Đây là hàm add_text_element: tạo thẻ con có nội dung text và gắn vào thẻ cha (thao tác DOM)
 * @param {*} doc - XML Document
 * @param {*} parent - thẻ cha
 * @param {*} tagName - tên thẻ con
 * @param {*} text - nội dung
 */
function add_text_element(doc, parent, tagName, text)
{
    var el = doc.createElement(tagName);
    el.appendChild(doc.createTextNode(text));
    parent.appendChild(el);
    return el;
}

/**
 * Đây là hàm build_products_xml: dùng mô hình DOM (createDocument, createElement, setAttribute,
 * appendChild) để chuyển mảng JSON của API thành XML Document có bổ sung màu sắc, size và tồn kho
 * @returns XML Document
 */
function build_products_xml()
{
    var doc = document.implementation.createDocument(null, "products", null);
    var root = doc.documentElement;
    root.setAttribute("source", API_URL);
    root.setAttribute("currency", "USD");
    root.setAttribute("generatedBy", "Vuong Anh Kiet - K244161793");

    // Danh sách danh mục (dùng cho dropdown tìm kiếm)
    var categoriesNode = doc.createElement("categories");
    for (var key in CATEGORY_NAMES)
    {
        var cat = doc.createElement("category");
        cat.setAttribute("id", key);
        cat.setAttribute("name", CATEGORY_NAMES[key]);
        categoriesNode.appendChild(cat);
    }
    root.appendChild(categoriesNode);

    for (var i = 0; i < apiProducts.length; i++)
    {
        var p = apiProducts[i];
        var productNode = doc.createElement("product");
        productNode.setAttribute("id", p.id);
        productNode.setAttribute("category", p.category);
        productNode.setAttribute("categoryName", CATEGORY_NAMES[p.category] || p.category);

        add_text_element(doc, productNode, "title", p.title.trim());
        var priceNode = add_text_element(doc, productNode, "price", Number(p.price).toFixed(2));
        priceNode.setAttribute("currency", "USD");
        add_text_element(doc, productNode, "description", p.description);
        add_text_element(doc, productNode, "image", p.image);
        // Bổ sung ảnh lưu cục bộ (thư mục images/products) để website vẫn hiển thị ảnh khi API chậm/không truy cập được
        add_text_element(doc, productNode, "localImage", "images/products/" + p.image.split("/").pop());

        // Rating gốc của API (Câu 5 sẽ tính lại từ reviews.xml)
        var ratingNode = doc.createElement("rating");
        ratingNode.setAttribute("rate", p.rating.rate);
        ratingNode.setAttribute("count", parseInt(p.rating.count));
        productNode.appendChild(ratingNode);

        // ===== BỔ SUNG MÀU SẮC =====
        var colors = get_colors(p);
        var colorsNode = doc.createElement("colors");
        for (var c = 0; c < colors.length; c++)
        {
            var colorNode = doc.createElement("color");
            colorNode.setAttribute("name", colors[c].name);
            colorNode.setAttribute("code", colors[c].code);
            colorNode.setAttribute("hex", colors[c].hex);
            colorsNode.appendChild(colorNode);
        }
        productNode.appendChild(colorsNode);

        // ===== BỔ SUNG SIZE =====
        var sizes = get_sizes(p);
        var sizesNode = doc.createElement("sizes");
        for (var s = 0; s < sizes.length; s++)
            add_text_element(doc, sizesNode, "size", sizes[s]);
        productNode.appendChild(sizesNode);

        // ===== BỔ SUNG TỒN KHO THEO BIẾN THỂ (màu x size) =====
        var variantsNode = doc.createElement("variants");
        var totalStock = 0;
        for (var c2 = 0; c2 < colors.length; c2++)
        {
            for (var s2 = 0; s2 < sizes.length; s2++)
            {
                var stock = get_stock(p.id, c2, s2);
                totalStock += stock;
                var variantNode = doc.createElement("variant");
                variantNode.setAttribute("sku", "P" + (p.id < 10 ? "0" + p.id : p.id) + "-" + colors[c2].code + "-" + get_size_code(sizes[s2]));
                variantNode.setAttribute("color", colors[c2].name);
                variantNode.setAttribute("size", sizes[s2]);
                variantNode.setAttribute("stock", stock);
                variantsNode.appendChild(variantNode);
            }
        }
        productNode.appendChild(variantsNode);
        add_text_element(doc, productNode, "totalStock", totalStock);
        productNode.setAttribute("status", totalStock > 0 ? "in-stock" : "out-of-stock");

        root.appendChild(productNode);
    }
    return doc;
}

/**
 * Đây là hàm pretty_xml: chuyển XML Document thành chuỗi có xuống dòng, thụt lề để dễ đọc
 * @param {*} doc - XML Document
 */
function pretty_xml(doc)
{
    var xml = new XMLSerializer().serializeToString(doc);
    var result = "";
    var indent = 0;
    // Tách chuỗi tại vị trí giữa 2 thẻ: "><"
    var parts = xml.replace(/>\s*</g, ">\n<").split("\n");
    for (var i = 0; i < parts.length; i++)
    {
        var line = parts[i];
        if (line.match(/^<\/\w/)) indent--;                       // thẻ đóng => lùi vào
        result += "    ".repeat(Math.max(indent, 0)) + line + "\n";
        if (line.match(/^<\w[^>]*[^\/]>.*$/) && !line.match(/<\/\w+>$/)) indent++; // thẻ mở chưa đóng => thụt vào
    }
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + result.trim() + "\n";
}

/**
 * Đây là hàm show_xml: tạo XML bằng DOM rồi hiển thị nội dung lên thẻ <pre>
 * @param {*} prexml - id của thẻ pre
 * @param {*} pstatus - id của thẻ trạng thái
 */
function show_xml(prexml, pstatus)
{
    productsXmlDoc = build_products_xml();
    var text = pretty_xml(productsXmlDoc);
    document.getElementById(prexml).textContent = text;
    var variantCount = productsXmlDoc.getElementsByTagName("variant").length;
    document.getElementById(pstatus).innerHTML = "✔ Đã tạo XML bằng DOM: <b>" + apiProducts.length + "</b> sản phẩm, <b>"
        + variantCount + "</b> biến thể (màu + size + tồn kho).";
    document.getElementById("btnDownload").disabled = false;
}

/**
 * Đây là hàm download_xml: lưu chuỗi XML thành file local products.xml (dùng Blob)
 */
function download_xml()
{
    var text = pretty_xml(productsXmlDoc);
    var blob = new Blob([text], { type: "application/xml;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "products.xml";
    document.body.appendChild(a);
    a.click();
    a.remove();
}
