/*
 * login.js - CÂU 8: Màn hình đăng nhập Admin, kiểm tra tài khoản trong datasets/employees.json
 * Sinh viên: Vương Anh Kiệt - MSSV: K244161793 - Lớp: K24416
 */

var employees = [];

/**
 * Đây là hàm init_login: đọc employees.json và xử lý submit form đăng nhập
 * @param {*} frmlogin - id của form đăng nhập
 */
function init_login(frmlogin)
{
    // Đã đăng nhập rồi thì vào thẳng Dashboard
    if (read_storage(STORAGE_KEYS.admin, null))
    {
        location.href = "admin.html";
        return;
    }

    var form = document.getElementById(frmlogin);
    load_json("datasets/employees.json", function(data) {
        employees = data;
    });

    document.getElementById("chkShowPass").onchange = function() {
        document.getElementById("txtPassword").type = this.checked ? "text" : "password";
    };

    var inputs = form.querySelectorAll("input[required]");
    for (var i = 0; i < inputs.length; i++)
        inputs[i].addEventListener("blur", function() { show_input_error(this); });

    form.onsubmit = function(e)
    {
        e.preventDefault();
        var ok = true;
        for (var i = 0; i < inputs.length; i++)
            if (!show_input_error(inputs[i])) ok = false;
        if (!ok) return;
        do_login(document.getElementById("txtUsername").value.trim(), document.getElementById("txtPassword").value);
    };
}

/**
 * Đây là hàm show_input_error: hiển thị lỗi HTML5 validation (validationMessage) ngay dưới ô nhập
 * @param {*} input - ô nhập
 * @returns true nếu hợp lệ
 */
function show_input_error(input)
{
    var box = input.parentElement.querySelector(".field-error");
    var msg = "";
    if (input.validity.valueMissing) msg = "Vui lòng nhập " + input.previousElementSibling.innerText.toLowerCase();
    else if (input.validity.tooShort) msg = "Tối thiểu " + input.minLength + " ký tự";
    else if (input.validity.patternMismatch) msg = input.title;
    box.innerHTML = msg;
    input.classList.toggle("invalid", msg != "");
    return msg == "";
}

/**
 * Đây là hàm do_login: so khớp tên đăng nhập + mật khẩu với employees.json
 * @param {*} username - tên đăng nhập
 * @param {*} password - mật khẩu
 */
function do_login(username, password)
{
    var error = document.getElementById("pLoginError");
    var found = null;
    for (var i = 0; i < employees.length; i++)
        if (employees[i].username == username && employees[i].password == password) found = employees[i];

    if (!found)
    {
        error.innerHTML = "Sai tên đăng nhập hoặc mật khẩu.";
        return;
    }
    if (!found.active)
    {
        error.innerHTML = "Tài khoản <b>" + found.username + "</b> đã bị khóa, vui lòng liên hệ quản trị.";
        return;
    }
    // Lưu phiên đăng nhập (không lưu mật khẩu)
    write_storage(STORAGE_KEYS.admin, {
        id: found.id,
        username: found.username,
        fullName: found.fullName,
        role: found.role,
        position: found.position,
        loginAt: new Date().toISOString()
    });
    location.href = "admin.html";
}
