/*
 * review.js - CÂU 5: Xử lý và phân tích dữ liệu XML đánh giá sản phẩm (datasets/reviews.xml)
 *   - Đọc file XML (giả định đây là API trả về XML) rồi dùng DOMParser chuyển chuỗi thành XML Document
 *   - Duyệt các node <review>, tính điểm trung bình cho từng product_id
 *   - Tạo thẻ <span> chèn số sao trung bình lên ảnh của từng sản phẩm trên DOM
 *   - Bấm "Rating Detail" để xem danh sách khách hàng đã đánh giá sản phẩm
 * Quan hệ nhiều - nhiều: 1 sản phẩm được nhiều khách hàng đánh giá, 1 khách hàng đánh giá nhiều sản phẩm.
 * Sinh viên: Vương Anh Kiệt - MSSV: K244161793 - Lớp: K24416
 */

/* Kết quả thống kê: { "1": {sum: 7, count: 2, average: 3.5, reviews: [ {...}, {...} ]}, ... } */
var reviewStats = {};

/**
 * Đây là hàm load_reviews: đọc reviews.xml dạng CHUỖI (responseText) rồi tự phân tích bằng DOMParser
 * @param {*} url - đường dẫn file reviews.xml
 * @param {*} callback - hàm được gọi sau khi tính xong điểm trung bình
 */
function load_reviews(url, callback)
{
    load_file(url, function(xhr) {
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(xhr.responseText, "text/xml");
        // Kiểm tra XML có bị lỗi cú pháp không
        if (xmlDoc.getElementsByTagName("parsererror").length > 0)
        {
            console.log("reviews.xml bị lỗi cú pháp");
            callback();
            return;
        }
        reviewStats = calculate_review_stats(xmlDoc);
        callback();
    }, function() {
        callback();
    });
}

/**
 * Đây là hàm calculate_review_stats: duyệt qua các node <review>, cộng dồn điểm và đếm số lượt cho từng product_id
 * @param {*} xmlDoc - XML Document của reviews.xml
 * @returns đối tượng thống kê theo product_id
 */
function calculate_review_stats(xmlDoc)
{
    var stats = {};
    var reviews = xmlDoc.getElementsByTagName("review");
    for (var i = 0; i < reviews.length; i++)
    {
        var r = reviews[i];
        var productId = r.getAttribute("product_id");
        var rating = parseInt(r.getAttribute("rating"));
        if (!stats[productId])
            stats[productId] = { sum: 0, count: 0, average: 0, reviews: [] };
        stats[productId].sum += rating;
        stats[productId].count++;
        stats[productId].reviews.push({
            id: r.getAttribute("id"),
            customerId: r.getAttribute("customer_id"),
            rating: rating,
            date: r.getAttribute("date"),
            comment: get_text(r, "comment")
        });
    }
    // Tính điểm trung bình, làm tròn 1 chữ số thập phân
    for (var id in stats)
        stats[id].average = Math.round(stats[id].sum / stats[id].count * 10) / 10;
    return stats;
}

/**
 * Đây là hàm get_review_stats: lấy thống kê đánh giá của 1 sản phẩm
 * @param {*} productId - mã sản phẩm
 */
function get_review_stats(productId)
{
    return reviewStats[productId] || { sum: 0, count: 0, average: 0, reviews: [] };
}

/**
 * Đây là hàm get_average_rating: điểm trung bình tính lại từ reviews.xml (dùng cho bộ lọc rating, sắp xếp)
 * @param {*} p - sản phẩm
 */
function get_average_rating(p)
{
    return get_review_stats(p.id).average;
}

/**
 * Đây là hàm star_text: đổi số điểm thành chuỗi ngôi sao, ví dụ 3 => "★★★☆☆"
 * @param {*} rating - số điểm (1-5)
 */
function star_text(rating)
{
    var full = Math.round(rating);
    return "★★★★★".substring(0, full) + "☆☆☆☆☆".substring(0, 5 - full);
}

/**
 * Đây là hàm render_rating_badges: tạo mới thẻ <span> hiển thị số sao trung bình
 * và chèn lên ảnh (khung .thumb) của từng sản phẩm tương ứng trên DOM
 * @param {*} grid - container chứa các thẻ sản phẩm
 */
function render_rating_badges(grid)
{
    var cards = grid.querySelectorAll(".product-card[data-id]");
    for (var i = 0; i < cards.length; i++)
    {
        var productId = cards[i].getAttribute("data-id");
        var stats = get_review_stats(productId);
        var thumb = cards[i].querySelector(".thumb");

        var old = thumb.querySelector(".rating-badge");
        if (old) thumb.removeChild(old);

        var span = document.createElement("span");
        span.className = "rating-badge";
        span.setAttribute("data-product-id", productId);
        span.title = stats.count + " lượt đánh giá trong reviews.xml";
        span.innerHTML = stats.count ? "★ " + stats.average.toFixed(1) + " <small>(" + stats.count + ")</small>" : "Chưa có đánh giá";
        thumb.appendChild(span);
    }
}

/**
 * Đây là hàm get_customer_name: tra cứu tên khách hàng theo mã (từ customers.json)
 * @param {*} customerId - mã khách hàng
 */
function get_customer_name(customerId)
{
    for (var i = 0; i < customers.length; i++)
        if (customers[i].id == customerId) return customers[i].fullName;
    return customerId;
}

/**
 * Đây là hàm show_rating_detail: hiển thị popup danh sách khách hàng đã rating cho sản phẩm
 * kèm biểu đồ phân bố số sao (5★ ... 1★)
 * @param {*} product - sản phẩm
 */
function show_rating_detail(product)
{
    var stats = get_review_stats(product.id);
    var distribution = [0, 0, 0, 0, 0, 0];   // vị trí 1..5 là số lượt của từng mức sao
    for (var i = 0; i < stats.reviews.length; i++)
        distribution[stats.reviews[i].rating]++;

    var bars = "";
    for (var star = 5; star >= 1; star--)
    {
        var percent = stats.count ? Math.round(distribution[star] / stats.count * 100) : 0;
        bars += "<div class='dist-row'><span>" + star + " ★</span><div class='dist-bar'><i style='width:" + percent + "%'></i></div><span>" + distribution[star] + "</span></div>";
    }

    var rows = "";
    var sorted = stats.reviews.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
    for (var j = 0; j < sorted.length; j++)
    {
        var r = sorted[j];
        rows += "<tr><td>" + (j + 1) + "</td><td>" + r.customerId + "</td><td>" + get_customer_name(r.customerId) + "</td>"
            + "<td class='stars'>" + star_text(r.rating) + " (" + r.rating + ")</td><td>" + r.date.split("-").reverse().join("/") + "</td>"
            + "<td>" + escape_html(r.comment) + "</td></tr>";
    }
    if (rows == "")
        rows = "<tr><td colspan='6'>Sản phẩm chưa có đánh giá nào.</td></tr>";

    document.getElementById("reviewBody").innerHTML =
        "<h2 id='rvTitle'>Rating Detail – " + escape_html(product.title) + "</h2>"
        + "<div class='review-summary'>"
        +   "<div class='review-score'><b>" + (stats.count ? stats.average.toFixed(1) : "–") + "</b><span class='stars'>" + star_text(stats.average) + "</span>"
        +   "<span class='muted'>" + stats.count + " lượt đánh giá (tính từ reviews.xml)</span>"
        +   "<span class='muted small'>Rating gốc của API: " + product.apiRate + " (" + product.apiCount + ")</span></div>"
        +   "<div class='review-dist'>" + bars + "</div>"
        + "</div>"
        + "<div class='table-wrap'><table class='data-table'><thead><tr><th>#</th><th>Mã KH</th><th>Khách hàng</th><th>Số sao</th><th>Ngày</th><th>Nhận xét</th></tr></thead>"
        + "<tbody>" + rows + "</tbody></table></div>";
    open_modal("reviewModal");
}
