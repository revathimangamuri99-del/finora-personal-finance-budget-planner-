const API_URL = "/api/transactions";

let transactions = [];
let incomeExpenseChart = null;
let categoryChart = null;
let editingId = null;
let showAllTransactions = false;
let toastTimer = null;

const $ = (id) => document.getElementById(id);

const money = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);

const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

function formatDate(value) {
    if (!value) return "—";
    const parts = String(value).split("-");
    if (parts.length !== 3) return escapeHTML(value);
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function showToast(message, isError = false) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function normalizeType(type) {
    return String(type || "").toUpperCase();
}

async function loadTransactions() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error("Unexpected data received from the API.");
        }

        transactions = data;
        renderDashboard();
    } catch (error) {
        console.error("Could not load transactions:", error);
        $("transactionTableBody").innerHTML = `
            <tr><td colspan="5" class="loading-cell">
                Unable to load transactions. Make sure Spring Boot is running, then refresh.
            </td></tr>`;
        showToast("Could not connect to your backend. Check that Spring Boot is running.", true);
    }
}

function renderDashboard() {
    const income = transactions
        .filter((item) => normalizeType(item.type) === "INCOME")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const expenses = transactions
        .filter((item) => normalizeType(item.type) === "EXPENSE")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const balance = income - expenses;
    const savingsRate = income > 0 ? ((balance / income) * 100) : 0;

    $("totalBalance").textContent = money(balance);
    $("totalIncome").textContent = money(income);
    $("totalExpenses").textContent = money(expenses);
    $("savingsRate").textContent = `${savingsRate.toFixed(1)}%`;
    $("donutTotal").textContent = money(expenses);
    $("transactionCount").textContent =
        `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;

    renderTransactions();
    renderCharts();
    refreshIcons();
}

function renderTransactions() {
    const search = $("searchInput").value.trim().toLowerCase();
    const type = $("typeFilter").value;

    const filtered = transactions.filter((item) => {
        const matchesType = type === "ALL" || normalizeType(item.type) === type;
        const text = `${item.title || ""} ${item.category || ""} ${item.description || ""}`.toLowerCase();
        return matchesType && text.includes(search);
    });

    const sorted = [...filtered].sort((a, b) =>
        String(b.transactionDate || "").localeCompare(String(a.transactionDate || "")) ||
        Number(b.id || 0) - Number(a.id || 0)
    );

    const visible = showAllTransactions ? sorted : sorted.slice(0, 5);
    const tbody = $("transactionTableBody");

    if (visible.length === 0) {
        const isEmpty = transactions.length === 0;
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <div class="empty-icon"><i data-lucide="${isEmpty ? "wallet" : "search-x"}"></i></div>
                    <strong>${isEmpty ? "Your financial story starts here" : "No matching transactions"}</strong>
                    <span>${isEmpty ? "Add your first income or expense to see your dashboard come alive." : "Try another search term or filter."}</span>
                </td>
            </tr>`;
        refreshIcons();
        return;
    }

    tbody.innerHTML = visible.map((item) => {
        const isIncome = normalizeType(item.type) === "INCOME";
        const symbol = isIncome ? "arrow-down-left" : "arrow-up-right";
        const amountClass = isIncome ? "income" : "expense";
        const sign = isIncome ? "+" : "−";
        return `
            <tr>
                <td>
                    <div class="transaction-name">
                        <span class="transaction-symbol ${isIncome ? "" : "expense"}">
                            <i data-lucide="${symbol}"></i>
                        </span>
                        <span>
                            <span class="transaction-title">${escapeHTML(item.title)}</span>
                            ${item.description ? `<span class="transaction-description">${escapeHTML(item.description)}</span>` : ""}
                        </span>
                    </div>
                </td>
                <td><span class="category-badge">${escapeHTML(item.category)}</span></td>
                <td class="transaction-date">${formatDate(item.transactionDate)}</td>
                <td class="amount ${amountClass}">${sign}${money(item.amount)}</td>
                <td>
                    <div class="row-actions">
                        <button class="action-button" data-action="edit" data-id="${Number(item.id)}" aria-label="Edit ${escapeHTML(item.title)}" title="Edit">
                            <i data-lucide="pencil"></i>
                        </button>
                        <button class="action-button delete" data-action="delete" data-id="${Number(item.id)}" aria-label="Delete ${escapeHTML(item.title)}" title="Delete">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join("");

    refreshIcons();
}

function renderCharts() {
    if (!window.Chart) {
        $("chartEmpty").style.display = "flex";
        $("chartEmpty").querySelector("span").textContent = "Charts unavailable. Check your internet connection.";
        return;
    }

    const today = new Date();
    const monthLabels = [];
    const incomeByMonth = [];
    const expenseByMonth = [];

    for (let offset = 5; offset >= 0; offset--) {
        const date = new Date(today.getFullYear(), today.getMonth() - offset, 1);
        const year = date.getFullYear();
        const month = date.getMonth();

        monthLabels.push(date.toLocaleDateString("en-IN", { month: "short" }));

        const monthItems = transactions.filter((item) => {
            if (!item.transactionDate) return false;
            const parts = item.transactionDate.split("-").map(Number);
            return parts.length === 3 && parts[0] === year && parts[1] - 1 === month;
        });

        incomeByMonth.push(monthItems
            .filter((item) => normalizeType(item.type) === "INCOME")
            .reduce((sum, item) => sum + Number(item.amount || 0), 0));

        expenseByMonth.push(monthItems
            .filter((item) => normalizeType(item.type) === "EXPENSE")
            .reduce((sum, item) => sum + Number(item.amount || 0), 0));
    }

    const hasMonthlyData = incomeByMonth.some((v) => v > 0) || expenseByMonth.some((v) => v > 0);
    $("chartEmpty").style.display = hasMonthlyData ? "none" : "flex";

    if (incomeExpenseChart) incomeExpenseChart.destroy();

    incomeExpenseChart = new Chart($("incomeExpenseChart"), {
        type: "bar",
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: "Income",
                    data: incomeByMonth,
                    backgroundColor: "#39ad87",
                    borderRadius: 5,
                    maxBarThickness: 17
                },
                {
                    label: "Expenses",
                    data: expenseByMonth,
                    backgroundColor: "#f0a19a",
                    borderRadius: 5,
                    maxBarThickness: 17
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 450 },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        pointStyle: "circle",
                        boxWidth: 7,
                        boxHeight: 7,
                        padding: 18,
                        color: "#7e8d95",
                        font: { size: 10, family: "DM Sans" }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => `${context.dataset.label}: ${money(context.raw)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: "#95a1a8", font: { size: 10 } }
                },
                y: {
                    beginAtZero: true,
                    border: { display: false, dash: [4, 4] },
                    grid: { color: "#eef1f2" },
                    ticks: {
                        maxTicksLimit: 5,
                        color: "#95a1a8",
                        font: { size: 9 },
                        callback: (value) => value >= 100000
                            ? `₹${(value / 100000).toFixed(1)}L`
                            : value >= 1000
                                ? `₹${(value / 1000).toFixed(0)}k`
                                : `₹${value}`
                    }
                }
            }
        }
    });

    const expenses = transactions.filter((item) => normalizeType(item.type) === "EXPENSE");
    const categoryTotals = {};

    expenses.forEach((item) => {
        const category = item.category || "Other";
        categoryTotals[category] = (categoryTotals[category] || 0) + Number(item.amount || 0);
    });

    const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const palette = ["#16866a", "#80c9ad", "#f0b47c", "#8e83d8", "#e88383", "#5c9dd5", "#d1b85d", "#6daeb0", "#b18acb", "#a5b0b8"];

    if (categoryChart) categoryChart.destroy();

    if (categories.length) {
        categoryChart = new Chart($("categoryChart"), {
            type: "doughnut",
            data: {
                labels: categories.map(([name]) => name),
                datasets: [{
                    data: categories.map(([, value]) => value),
                    backgroundColor: categories.map((_, index) => palette[index % palette.length]),
                    borderWidth: 3,
                    borderColor: "#ffffff",
                    hoverOffset: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "75%",
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${money(context.raw)}`
                        }
                    }
                }
            }
        });

        $("categoryLegend").innerHTML = categories.slice(0, 5).map(([name, value], index) => `
            <div class="legend-item">
                <span class="legend-dot" style="background:${palette[index % palette.length]}"></span>
                <span class="legend-name">${escapeHTML(name)}</span>
                <span class="legend-amount">${money(value)}</span>
            </div>
        `).join("");
    } else {
        $("categoryLegend").innerHTML = `<p class="muted-empty">Add an expense to see your category insights.</p>`;
    }
}

function openModal(item = null) {
    editingId = item ? item.id : null;
    $("transactionForm").reset();
    $("formError").textContent = "";
    $("modalTitle").textContent = item ? "Edit transaction" : "Add transaction";
    $("saveButton").innerHTML = item
        ? '<i data-lucide="check"></i> Update transaction'
        : '<i data-lucide="check"></i> Save transaction';

    $("transactionDate").value = item?.transactionDate || new Date().toLocaleDateString("en-CA");
    $("title").value = item?.title || "";
    $("amount").value = item?.amount ?? "";
    $("category").value = item?.category || "Salary";
    $("description").value = item?.description || "";

    const selectedType = item ? normalizeType(item.type) : "INCOME";
    const radio = document.querySelector(`input[name="type"][value="${selectedType}"]`);
    if (radio) radio.checked = true;

    $("transactionModal").classList.add("open");
    $("transactionModal").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    refreshIcons();
    setTimeout(() => $("title").focus(), 50);
}

function closeModal() {
    $("transactionModal").classList.remove("open");
    $("transactionModal").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    editingId = null;
}

async function saveTransaction(event) {
    event.preventDefault();
    $("formError").textContent = "";

    const amount = Number($("amount").value);
    if (!Number.isFinite(amount) || amount <= 0) {
        $("formError").textContent = "Please enter an amount greater than zero.";
        return;
    }

    const type = document.querySelector('input[name="type"]:checked')?.value;
    const payload = {
        title: $("title").value.trim(),
        amount,
        type,
        category: $("category").value,
        transactionDate: $("transactionDate").value,
        description: $("description").value.trim()
    };

    if (!payload.title || !payload.transactionDate) {
        $("formError").textContent = "Please complete all required fields.";
        return;
    }

    const button = $("saveButton");
    button.disabled = true;
    button.textContent = "Saving...";

    try {
        const url = editingId
            ? `${API_URL}/${encodeURIComponent(editingId)}`
            : API_URL;

        const response = await fetch(url, {
            method: editingId ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const detail = await response.text();
            throw new Error(detail || `Request failed (${response.status})`);
        }

        closeModal();
        await loadTransactions();
        showToast(editingId ? "Transaction updated successfully." : "Transaction saved successfully.");
    } catch (error) {
        console.error("Could not save transaction:", error);
        $("formError").textContent =
            "Unable to save. Check that the backend is running and the API fields match.";
    } finally {
        button.disabled = false;
        button.innerHTML = '<i data-lucide="check"></i> Save transaction';
        refreshIcons();
    }
}

async function deleteTransaction(id) {
    const item = transactions.find((transaction) => String(transaction.id) === String(id));
    if (!item) return;

    const confirmed = window.confirm(`Delete "${item.title}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/${encodeURIComponent(id)}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error(`Delete failed (${response.status})`);
        }

        await loadTransactions();
        showToast("Transaction deleted.");
    } catch (error) {
        console.error("Could not delete transaction:", error);
        showToast("Could not delete this transaction. Please try again.", true);
    }
}

function editTransaction(id) {
    const item = transactions.find((transaction) => String(transaction.id) === String(id));
    if (item) openModal(item);
}

function initializePage() {
    $("currentDate").textContent = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
    $("currentYear").textContent = new Date().getFullYear();

    $("addTopButton").addEventListener("click", () => openModal());
    $("closeModalButton").addEventListener("click", closeModal);
    $("cancelButton").addEventListener("click", closeModal);
    $("transactionForm").addEventListener("submit", saveTransaction);

    $("transactionModal").addEventListener("click", (event) => {
        if (event.target === $("transactionModal")) closeModal();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeModal();
            $("sidebar").classList.remove("open");
        }
    });

    $("searchInput").addEventListener("input", renderTransactions);
    $("typeFilter").addEventListener("change", renderTransactions);
	$("viewAllButton").addEventListener("click", () => {
		    window.location.href = "transactions.html";
		});
    $("viewAllButton").addEventListener("click", () => {
        showAllTransactions = !showAllTransactions;
        $("viewAllButton").innerHTML = showAllTransactions
            ? 'Show less <i data-lucide="arrow-up"></i>'
            : 'View all <i data-lucide="arrow-right"></i>';
        renderTransactions();
    });

    $("transactionTableBody").addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const id = button.dataset.id;
        if (button.dataset.action === "edit") editTransaction(id);
        if (button.dataset.action === "delete") deleteTransaction(id);
    });

    $("menuButton").addEventListener("click", () => {
        $("sidebar").classList.toggle("open");
    });

    document.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
            link.classList.add("active");
            $("sidebar").classList.remove("open");
        });
    });


    loadTransactions();
    refreshIcons();
}

document.addEventListener("DOMContentLoaded", initializePage);


async function loadSidebarProfile() {
    const nameElement = document.getElementById("sidebarProfileName");
    const initialsElement = document.getElementById("profileInitials");

    if (!nameElement || !initialsElement) return;

    try {
        const response = await fetch("/api/profile", {
            method: "GET",
            credentials: "same-origin"
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = "/login.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Unable to load user profile.");
        }

        const user = await response.json();
        const fullName = (user.name || user.fullName || "").trim();

        if (!fullName) {
            nameElement.textContent = "My Finances";
            initialsElement.textContent = "MF";
            return;
        }

        // Display the logged-in user's actual name
        nameElement.textContent = fullName;

        // Generate initials automatically
        const words = fullName.split(/\s+/).filter(Boolean);

        const initials = words
            .slice(0, 2)
            .map(word => word.charAt(0).toUpperCase())
            .join("");

        initialsElement.textContent = initials || "MF";

    } catch (error) {
        console.error("Could not load sidebar profile:", error);
        nameElement.textContent = "My Finances";
        initialsElement.textContent = "MF";
    }
}

loadSidebarProfile();

// Open and close the three-dot menu
const menuButton = document.getElementById("profileMenuButton");
const dropdown = document.getElementById("profileDropdown");

if (menuButton && dropdown) {
    menuButton.addEventListener("click", (event) => {
        event.stopPropagation();

        dropdown.hidden = !dropdown.hidden;

        menuButton.setAttribute(
            "aria-expanded",
            String(!dropdown.hidden)
        );
    });

    document.addEventListener("click", (event) => {
        if (!dropdown.contains(event.target) &&
            !menuButton.contains(event.target)) {
            dropdown.hidden = true;
            menuButton.setAttribute("aria-expanded", "false");
        }
    });
}

function loadFinoraProfilePhoto() {
    const savedPhoto = localStorage.getItem("finoraProfilePhoto");
    const avatar = document.getElementById("profileInitials");

    if (savedPhoto && avatar) {
        avatar.innerHTML = "";

        const img = document.createElement("img");
        img.src = savedPhoto;
        img.alt = "Profile Picture";

        avatar.appendChild(img);
        avatar.classList.add("has-profile-photo");
    }
}

function loadFinoraProfilePhoto() {
    const savedPhoto = localStorage.getItem("finoraProfilePhoto");
    const avatar = document.getElementById("profileInitials");

    if (!savedPhoto || !avatar) return;

    let img = avatar.querySelector("img");

    if (!img) {
        img = document.createElement("img");
        img.alt = "Profile Picture";
        avatar.replaceChildren(img);
    }

    img.src = savedPhoto;
    avatar.classList.add("has-profile-photo");
}

loadFinoraProfilePhoto();
document.addEventListener("DOMContentLoaded", loadFinoraProfilePhoto);