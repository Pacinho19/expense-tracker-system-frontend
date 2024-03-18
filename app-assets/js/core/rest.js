let host = 'http://localhost:8080';
let categories = ["", "FOOD", "HEALTHCARE", "HOUSING", "TRANSPORTATION", "INVESTING", "ENTERTAINMENT", "OTHER"];
let exportFormates = ["JSON", "CSV"];

function getUrlParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function redirect(url, newTab = false) {
    var ua = navigator.userAgent.toLowerCase(),
        isIE = ua.indexOf('msie') !== -1,
        version = parseInt(ua.substr(4, 2), 10);
    // Internet Explorer 8 and lower
    if (isIE && version < 9) {
        var link = document.createElement('a');
        if (newTab) {
            link.target = '_blank';
        }
        link.href = url;
        document.body.appendChild(link);
        link.click();
    }
    // All other browsers can use the standard window.location.href (they don't lose HTTP_REFERER like Internet Explorer 8 & lower41 does)
    else {
        if (newTab) {
            window.open(
                url,
                '_blank'
            );
        } else {
            window.location.href = url;
        }
    }
}

function showErrorMessageUnauthorized() {
    localStorage.removeItem("auth");
    alert('You not logged. Login first..');
    redirect('/index.html');
}

function showErrorMessageForbidden() {
    alert('No permissions to access to this page!');
}

function showErrorMessage500() {
    alert('Wystąpił problem z działaniem aplikacji. Zgłoś błąd do BINT lub spróbuj ponownie.');
    redirect('/home.html');
}

function createRequest(path, type) {
    let http = new XMLHttpRequest();
    let url = host + path;

    http.open(type, url, true);
    var token = localStorage.getItem("auth");
    if (token != null)
        http.setRequestHeader('Authorization', token);
    return http;
}

function loginRest() {
    let url = host + '/authorization';

    let http = new XMLHttpRequest();
    http.open("POST", url, true);

    var authItem = new Object();
    authItem.username = document.getElementById("username").value;
    authItem.password = document.getElementById("password").value;

    var jsonObject = JSON.stringify(authItem);
    http.setRequestHeader("Content-Type", "application/json");

    http.onreadystatechange = function () {
        if (http.readyState === 4 && http.status === 200) {
            let token = http.responseText;
            document.cookie = "Authorization=Authorization: Bearer " + token + ";secure;HttpOnly";
            localStorage.setItem('auth', 'Bearer ' + token);
            console.log(token);
            redirect('/home.html');
        } else if (http.readyState === 4 && http.status === 500) {
            showErrorMessage500();
        } else if (http.readyState === 4) {
            document.getElementById('login-error').removeAttribute('hidden');
        }
    };
    http.send(jsonObject);
}

function logout() {
    localStorage.removeItem("auth");
    redirect('/index.html');
}

function ping() {
    let http = createRequest("/api/ping", "GET");
    http.onreadystatechange = function () {
        if (http.readyState === 4 && http.status === 200) {
            document.getElementById("main").removeAttribute('hidden');
            document.getElementById("loader").setAttribute('hidden', true);
        }
        if (http.readyState === 4 && http.status === 500) {
            showErrorMessage500();
        } else if (http.readyState === 4 && http.status === 401) {
            showErrorMessageUnauthorized();
            document.getElementById('login-error').removeAttribute('hidden');
        } else if (http.readyState === 4 && http.status === 403) {
            showErrorMessageForbidden();
        }
    };
    http.send();
}

function getMonthlyReport(year, month) {
    if (year == null && month == null) {
        const dateObj = new Date();
        month = dateObj.getUTCMonth() + 1; // months from 1-12
        year = dateObj.getUTCFullYear();
    }

    let http = createRequest("/expense/monthly-report/" + year + "/" + month, "GET");
    http.onreadystatechange = function () {
        if (http.readyState === 4 && http.status === 200) {
            let obj = JSON.parse(http.responseText);
            console.log(http.responseText);

            createMonthlyReport(obj);

            document.getElementById("main").removeAttribute('hidden');
            document.getElementById("loader").setAttribute('hidden', true);
        }
        else if (http.readyState === 4 && http.status === 500) {
            showErrorMessage500();
        } else if (http.readyState === 4 && http.status === 401) {
            showErrorMessageUnauthorized();
            document.getElementById('login-error').removeAttribute('hidden');
        } else if (http.readyState === 4 && http.status === 403) {
            showErrorMessageForbidden();
        }
    };
    http.send();
}

function createMonthlyReport(monthlyReport) {
    document.getElementById("startDate").innerHTML = toStringDate(monthlyReport.dataRange.startDate);
    document.getElementById("endDate").innerHTML = toStringDate(monthlyReport.dataRange.endDate);
    document.getElementById("totalAmount").innerHTML = monthlyReport.totalAmount;
    document.getElementById("expensesCount").innerHTML = monthlyReport.expensesCount;
    document.getElementById("categoryWithMaxTotalAmount").innerHTML = monthlyReport.categoryWithMaxTotalAmount;
    document.getElementById("categoryWithMaxExpensesCount").innerHTML = monthlyReport.categoryWithMaxExpensesCount;

    document.getElementById("maxExpenseName").innerHTML = monthlyReport.expenseWithMaxAmount.name;
    document.getElementById("maxExpenseAmount").innerHTML = monthlyReport.expenseWithMaxAmount.amount;
    document.getElementById("maxExpenseDate").innerHTML = toStringDate(monthlyReport.expenseWithMaxAmount.date);
    document.getElementById("maxExpenseCategory").innerHTML = monthlyReport.expenseWithMaxAmount.category;
}

function toStringDate(localDate) {
    var date = new Date(localDate);
    const offset = date.getTimezoneOffset()
    date = new Date(date.getTime() - (offset * 60 * 1000))
    return date.toISOString().split('T')[0]
}

function searchExpense(nameSearchParamName = "nameSearchParam") {
    var name = getElementValue(nameSearchParamName);
    if (nameSearchParamName == "nameSearchParam2") {
        var category = getElementValue("categorySearchParam");
        var startDate = getElementValue("startDateSearchParam");
        var endDate = getElementValue("endDateSearchParam");
    }

    var paramsArr = [];
    addUrlParam(paramsArr, name, "name");
    addUrlParam(paramsArr, category, "category");
    addUrlParam(paramsArr, startDate, "startDate");
    addUrlParam(paramsArr, endDate, "endDate");
    var params = (paramsArr.length > 0 ? '?' : '')
        + paramsArr.join("&");

    redirect('/search.html' + params);
}

function search(params, showAll = false) {
    setSearchSettingsParams();
    if (params.length == 0 && !showAll) {
        document.getElementById("main").removeAttribute('hidden');
        document.getElementById("loader").setAttribute('hidden', true);
        return;
    }

    createRequestQuery(params);

    let http = createRequest("/expense" + params, "GET");
    http.onreadystatechange = function () {
        if (http.readyState === 4 && http.status === 200) {
            let obj = JSON.parse(http.responseText);

            document.getElementById("main").removeAttribute('hidden');
            document.getElementById("loader").setAttribute('hidden', true);

            fillTable(obj);

        } else if (http.readyState === 4 && http.status === 500) {
            showErrorMessage500();
        } else if (http.readyState === 4 && http.status === 401) {
            showErrorMessageUnauthorized();
            document.getElementById('login-error').removeAttribute('hidden');
        } else if (http.readyState === 4 && http.status === 403) {
            showErrorMessageForbidden();
        }
    };

    http.send();
}

function addUrlParam(arr, value, name) {
    if (value == null || value.length == 0)
        return;
    arr.push(name + "=" + value);
}

function getElementValue(elementId) {
    var element = document.getElementById(elementId);
    if (element == null || element.value.length == 0)
        return null;
    return element.value;
}

function createRequestQuery(params) {
    if (params == null || params.length == 0)
        return;

    params.substring(1).split('&').forEach(
        (element) => createQueryParamBadge(element)
    );
}

function createQueryParamBadge(element) {
    var span_obj = document.createElement("div");
    span_obj.setAttribute("class", "badge badge-info ml-1");
    span_obj.setAttribute("style", "text-align:center;font-size:20px");
    span_obj.setAttribute("role", "alert");

    var strong_obj = document.createElement("strong");
    strong_obj.innerHTML = element;

    span_obj.appendChild(strong_obj);
    document.getElementById("requestQueryConainer").appendChild(span_obj);
}

function fillTable(expenses) {
    var tbodyRef = document.getElementById('expenseTable').getElementsByTagName('tbody')[0];

    for (let i = 0; i < expenses.length; i++) {
        var newRow = tbodyRef.insertRow();
        createCell(newRow, (i + 1));
        createCell(newRow, expenses[i].name);
        createCell(newRow, expenses[i].category);
        createCell(newRow, expenses[i].amount);
        createCell(newRow, toStringDate(expenses[i].date));
    }
}

function createCell(row, value) {
    var newCell = row.insertCell();
    var newText = document.createTextNode(value);
    newCell.appendChild(newText);
}

function sortTable(n, type) {
    var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    table = document.getElementById("expenseTable");
    switching = true;
    dir = "asc";
    while (switching) {
        switching = false;
        rows = table.rows;
        for (i = 1; i < (rows.length - 1); i++) {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("TD")[n];
            y = rows[i + 1].getElementsByTagName("TD")[n];
            if (dir == "asc") {
                if (type !== 'number' && x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                    shouldSwitch = true;
                    break;
                } else if (Number(x.innerHTML) > Number(y.innerHTML)) {
                    shouldSwitch = true;
                    break;
                }
            } else if (dir == "desc") {
                if (type !== 'number' && x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                    shouldSwitch = true;
                    break;
                } else if (Number(x.innerHTML) < Number(y.innerHTML)) {
                    shouldSwitch = true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            switchcount++;
        } else {

            if (switchcount == 0 && dir == "asc") {
                dir = "desc";
                switching = true;
            }
        }
    }
}

function setSearchSettingsParams() {
    setElemetValueValue("nameSearchParam", getUrlParam('name'));
    setElemetValueValue("nameSearchParam2", getUrlParam('name'));
    setElemetValueValue("categorySearchParam", getUrlParam('category'));
    setElemetValueValue("startDateSearchParam", getUrlParam('startDate'));
    setElemetValueValue("endDateSearchParam", getUrlParam('endDate'));
}

function setElemetValueValue(id, value) {
    var element = document.getElementById(id);
    if (element != null && value != null && value.length > 0)
        element.value = value;
}

function saveExpense() {
    let http = createRequest("/expense", "POST");

    var expense = new Object();
    expense.name = document.getElementById("expenseName").value;
    expense.category = document.getElementById("expenseCategory").value;
    expense.amount = document.getElementById("expenseAmount").value;
    expense.date = document.getElementById("expenseDate").value;

    var jsonObject = JSON.stringify(expense);
    http.setRequestHeader("Content-Type", "application/json");

    http.onreadystatechange = function () {
        if (http.readyState === http.HEADERS_RECEIVED) {
            loc = http.getResponseHeader("Location");
            alert("Expense has been saved successfully!");
            redirect("/expense.html?id=" + loc.split("/").pop());
        } else if (http.readyState === 4 && http.status === 500) {
            showErrorMessage500();
        } else if (http.readyState === 4 && http.status === 401) {
            showErrorMessageUnauthorized();
        } else if (http.readyState === 4 && http.status === 403) {
            showErrorMessageForbidden();
        }
    };
    http.send(jsonObject);
}

function getExpense(id) {
    let http = createRequest("/expense/" + id, "GET");


    http.onreadystatechange = function () {
        if (http.readyState === 4 && http.status === 200) {
            let expense = JSON.parse(http.responseText);

            setExpenseFields(expense);

            document.getElementById("main").removeAttribute('hidden');
            document.getElementById("loader").setAttribute('hidden', true);

        } else if (http.readyState === 4 && http.status === 500) {
            showErrorMessage500();
        } else if (http.readyState === 4 && http.status === 401) {
            showErrorMessageUnauthorized();
        } else if (http.readyState === 4 && http.status === 403) {
            showErrorMessageForbidden();
        }
    };
    http.send();
}

function setExpenseFields(expense) {
    document.getElementById("expenseName").innerHTML = expense.name;
    document.getElementById("expenseCategory").innerHTML = expense.category;
    document.getElementById("expenseAmount").innerHTML = expense.amount;
    document.getElementById("expenseDate").innerHTML = expense.date;
}

function getExpenses() {
    let page = getUrlParam("page");
    let size = getUrlParam("size");

    if (page == null && size == null)
        search([], true);

    getExpensePage(page, size);
}

function getExpensePage(page, size) {
    var paramsArr = [];
    addUrlParam(paramsArr, page, "page");
    addUrlParam(paramsArr, size, "size");
    var params = (paramsArr.length > 0 ? '?' : '')
        + paramsArr.join("&");

    let http = createRequest("/expense" + params, "GET");
    http.onreadystatechange = function () {
        if (http.readyState === 4 && http.status === 200) {
            let obj = JSON.parse(http.responseText);

            document.getElementById("main").removeAttribute('hidden');
            document.getElementById("loader").setAttribute('hidden', true);

            fillTable(obj.expenses);
            createPagination(obj);

        } else if (http.readyState === 4 && http.status === 500) {
            showErrorMessage500();
        } else if (http.readyState === 4 && http.status === 401) {
            showErrorMessageUnauthorized();
            document.getElementById('login-error').removeAttribute('hidden');
        } else if (http.readyState === 4 && http.status === 403) {
            showErrorMessageForbidden();
        }
    };

    http.send();
}

function createPagination(page) {
    container = document.getElementById("paginationContainer");
    for (i = 1; i <= page.totalPages; i++) {
        pageItem = createPageItem(i, i == page.currentPage)
        container.appendChild(pageItem);
    }
}

function createPageItem(value, currentPage = false) {
    li = document.createElement("li");
    li.classList.add('page-item');
    if (currentPage) {
        li.classList.add('active');
    }

    a = document.createElement("a");
    a.classList.add('page-link');
    size = getUrlParam('size');
    a.href = "?page=" + value + (size != null ? "&size=" + size : '');

    a.innerHTML = value;

    li.appendChild(a);
    return li;
}

function exportData() {
    format = document.getElementById("exportFormat").value;
    var params = '?format=' + format;

    let http = createRequest("/expense/export" + params, "GET");
    http.setRequestHeader('responseType', "blob");
    http.onreadystatechange = function () {
        if (http.readyState === 4 && http.status === 200) {
            showExportSuccessAlert(http);
        } else if (http.readyState === 4 && http.status === 500) {
            showErrorMessage500();
        } else if (http.readyState === 4 && http.status === 401) {
            showErrorMessageUnauthorized();
            document.getElementById('login-error').removeAttribute('hidden');
        } else if (http.readyState === 4 && http.status === 403) {
            showErrorMessageForbidden();
        }
    };

    http.send();

}

function showExportSuccessAlert(request) {
    alertDiv = document.getElementById('exportSuccessAlert');
    alertDiv.style.display = 'block';

    downloadDiv = document.getElementById('downloadDiv');
    downloadDiv.innerHTML = '';

    var blob = new Blob([request.response], { type: 'text/plain' });
    var link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.innerHTML = 'Download';
    link.download = getFileName(request);

    downloadDiv.appendChild(link);
}

function getFileName(request) {
    var filename = "";
    var disposition = request.getResponseHeader('Content-Disposition');
    if (disposition && disposition.indexOf('attachment') !== -1) {
        var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        var matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
        }
    }
    return filename;
}
