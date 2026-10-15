const API_URL = "/api/transactions";

let transactions = [];
let editingId = null;
let toastTimer;

const $ = (id) => document.getElementById(id);

const money = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);

const normalizeType = (type) =>
    String(type || "").toUpperCase();

const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

function today() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

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
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function refreshIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

async function loadTransactions() {
    const tbody = $("transactionTableBody");

    try {
        const response = await fetch(API_URL, {
            credentials: "same-origin"
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = "/login.html";
            return;
        }

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Unexpected transaction data.");
        }

        transactions = data;
        renderTransactions();
    } catch (error) {
        console.error("Unable to load transactions:", error);

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-cell">
                    Unable to load transactions.
                    Check that the backend is running.
                </td>
            </tr>`;

        showToast("Could not load transactions.", true);
    }
}

function renderSummary() {
    const income = transactions
        .filter(item => normalizeType(item.type) === "INCOME")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const expenses = transactions
        .filter(item => normalizeType(item.type) === "EXPENSE")
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    $("pageTotalIncome").textContent = money(income);
    $("pageTotalExpenses").textContent = money(expenses);
    $("pageBalance").textContent = money(income - expenses);

    $("transactionCount").textContent =
        `${transactions.length} transaction${transactions.length === 1 ? "" : "s"}`;
}

function renderTransactions() {
    const search = $("searchInput").value.trim().toLowerCase();
    const type = $("typeFilter").value;

    const filtered = transactions
        .filter(item => {
            const matchesType =
                type === "ALL" || normalizeType(item.type) === type;

            const searchableText = [
                item.title,
                item.category,
                item.description,
                item.transactionDate
            ].join(" ").toLowerCase();

            return matchesType && searchableText.includes(search);
        })
        .sort((a, b) =>
            String(b.transactionDate || "").localeCompare(
                String(a.transactionDate || "")
            )
        );

    $("filteredCount").textContent =
        `${filtered.length} transaction${filtered.length === 1 ? "" : "s"} shown`;

    const tbody = $("transactionTableBody");

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="loading-cell">
                    ${transactions.length === 0
                        ? "No transactions yet. Click Add transaction to begin."
                        : "No matching transactions. Try another search."}
                </td>
            </tr>`;

        renderSummary();
        return;
    }

    tbody.innerHTML = filtered.map(item => {
        const isIncome = normalizeType(item.type) === "INCOME";
        const sign = isIncome ? "+" : "−";
        const amountClass = isIncome ? "income" : "expense";
        const symbol = isIncome ? "arrow-down-left" : "arrow-up-right";

        return `
            <tr>
                <td>
                    <div class="transaction-name">
                        <span class="transaction-symbol ${isIncome ? "" : "expense"}">
                            <i data-lucide="${symbol}"></i>
                        </span>
                        <span>
                            <span class="transaction-title">
                                ${escapeHTML(item.title || "Untitled")}
                            </span>
                            ${item.description
                                ? `<span class="transaction-description">
                                    ${escapeHTML(item.description)}
                                   </span>`
                                : ""}
                        </span>
                    </div>
                </td>

                <td>
                    <span class="category-badge">
                        ${escapeHTML(item.category || "Other")}
                    </span>
                </td>

                <td class="transaction-date">
                    ${formatDate(item.transactionDate)}
                </td>

                <td class="amount ${amountClass}">
                    ${sign}${money(item.amount)}
                </td>

                <td>
                    <div class="row-actions">
                        <button type="button" class="action-button"
                                data-action="edit" data-id="${Number(item.id)}"
                                aria-label="Edit transaction">
                            <i data-lucide="pencil"></i>
                        </button>

                        <button type="button" class="action-button delete"
                                data-action="delete" data-id="${Number(item.id)}"
                                aria-label="Delete transaction">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join("");

    renderSummary();
    refreshIcons();
}

function openModal(item = null) {
    editingId = item ? item.id : null;

    $("transactionForm").reset();
    $("formError").textContent = "";

    $("modalTitle").textContent =
        item ? "Edit transaction" : "Add transaction";

    $("saveButton").textContent =
        item ? "Update transaction" : "Save transaction";

    $("title").value = item?.title || "";
    $("amount").value = item?.amount ?? "";
    $("category").value = item?.category || "Salary";
    $("transactionDate").value = item?.transactionDate || today();
    $("description").value = item?.description || "";

    const selectedType = item
        ? normalizeType(item.type)
        : "INCOME";

    const radio = document.querySelector(
        `input[name="type"][value="${selectedType}"]`
    );

    if (radio) radio.checked = true;

    $("transactionModal").classList.add("open");
    $("transactionModal").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    refreshIcons();
    $("title").focus();
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
        $("formError").textContent =
            "Please enter an amount greater than zero.";
        return;
    }

    const payload = {
        title: $("title").value.trim(),
        amount,
        type: document.querySelector(
            'input[name="type"]:checked'
        )?.value,
        category: $("category").value,
        transactionDate: $("transactionDate").value,
        description: $("description").value.trim()
    };

    if (!payload.title || !payload.transactionDate) {
        $("formError").textContent =
            "Please fill in all required fields.";
        return;
    }

    const wasEditing = editingId !== null;
    const button = $("saveButton");

    button.disabled = true;
    button.textContent = "Saving...";

    try {
        const url = wasEditing
            ? `${API_URL}/${encodeURIComponent(editingId)}`
            : API_URL;

        const response = await fetch(url, {
            method: wasEditing ? "PUT" : "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const details = await response.text();
            throw new Error(details || `Request failed: ${response.status}`);
        }

        closeModal();
        await loadTransactions();

        showToast(
            wasEditing
                ? "Transaction updated successfully."
                : "Transaction added successfully."
        );
    } catch (error) {
        console.error("Unable to save transaction:", error);
        $("formError").textContent =
            "Unable to save. Please check your backend API.";
    } finally {
        button.disabled = false;
        button.textContent = editingId
            ? "Update transaction"
            : "Save transaction";

        refreshIcons();
    }
}

async function deleteTransaction(id) {
    const item = transactions.find(
        transaction => String(transaction.id) === String(id)
    );

    if (!item) return;

    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/${encodeURIComponent(id)}`,
            {
                method: "DELETE",
                credentials: "same-origin"
            }
        );

        if (!response.ok) {
            throw new Error(`Delete failed: ${response.status}`);
        }

        await loadTransactions();
        showToast("Transaction deleted successfully.");
    } catch (error) {
        console.error("Unable to delete transaction:", error);
        showToast("Could not delete this transaction.", true);
    }
}

function initializePage() {
    $("currentDate").textContent = new Date().toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

    $("currentYear").textContent = new Date().getFullYear();

    $("addTransactionButton").addEventListener(
        "click", () => openModal()
    );

    $("closeModalButton").addEventListener("click", closeModal);
    $("cancelButton").addEventListener("click", closeModal);

    $("transactionForm").addEventListener(
        "submit", saveTransaction
    );

    $("transactionModal").addEventListener("click", event => {
        if (event.target === $("transactionModal")) {
            closeModal();
        }
    });

    $("searchInput").addEventListener("input", renderTransactions);
    $("typeFilter").addEventListener("change", renderTransactions);

    $("transactionTableBody").addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;

        const id = button.dataset.id;

        if (button.dataset.action === "edit") {
            const item = transactions.find(
                transaction => String(transaction.id) === String(id)
            );

            if (item) openModal(item);
        }

        if (button.dataset.action === "delete") {
            deleteTransaction(id);
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeModal();
    });

    // Sidebar profile
    const menuButton = $("profileMenuButton");
    const dropdown = $("profileDropdown");

    menuButton.addEventListener("click", event => {
        event.stopPropagation();
        dropdown.hidden = !dropdown.hidden;
        menuButton.setAttribute(
            "aria-expanded", String(!dropdown.hidden)
        );
    });

    document.addEventListener("click", event => {
        if (!dropdown.contains(event.target) &&
            !menuButton.contains(event.target)) {
            dropdown.hidden = true;
            menuButton.setAttribute("aria-expanded", "false");
        }
    });

    loadSidebarProfile();
    loadTransactions();
    refreshIcons();
}

async function loadSidebarProfile() {
    try {
        const response = await fetch("/api/profile", {
            credentials: "same-origin"
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = "/login.html";
            return;
        }

        if (!response.ok) return;

        const user = await response.json();
        const name = (user.fullName || user.name || "").trim();

        if (!name) return;

        $("sidebarProfileName").textContent = name;

        $("profileInitials").textContent = name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(word => word[0].toUpperCase())
            .join("");
    } catch (error) {
        console.error("Unable to load profile:", error);
    }
}

document.addEventListener("DOMContentLoaded", initializePage);