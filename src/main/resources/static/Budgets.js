const BUDGET_API = "/api/budgets";
const TRANSACTION_API = "/api/transactions";

const budgetForm = document.getElementById("budgetForm");
const budgetGrid = document.getElementById("budgetGrid");
const budgetMessage = document.getElementById("budgetMessage");
const budgetIdInput = document.getElementById("budgetId");
const categoryInput = document.getElementById("category");
const amountInput = document.getElementById("amount");
const monthInput = document.getElementById("budgetMonth");
const saveButton = document.getElementById("saveBudgetButton");
const editBudgetModal = document.getElementById("editBudgetModal");
const editBudgetForm = document.getElementById("editBudgetForm");
const editBudgetId = document.getElementById("editBudgetId");
const editCategory = document.getElementById("editCategory");
const editAmount = document.getElementById("editAmount");
const editBudgetMonth = document.getElementById("editBudgetMonth");
const editBudgetMessage = document.getElementById("editBudgetMessage");

let budgets = [];
let transactions = [];

const today = new Date();
monthInput.value =
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

function formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(amount);
}

function showBudgetMessage(message, isError = false) {
    budgetMessage.textContent = message;
    budgetMessage.style.color = isError ? "#c0392b" : "#218838";
}

async function loadBudgets() {
    try {
        const [budgetResponse, transactionResponse] = await Promise.all([
            fetch(BUDGET_API),
            fetch(TRANSACTION_API)
        ]);

        if (!budgetResponse.ok || !transactionResponse.ok) {
            throw new Error("Could not load data from the server.");
        }

        budgets = await budgetResponse.json();
        transactions = await transactionResponse.json();

        renderBudgets();
    } catch (error) {
        budgetGrid.textContent =
            "Unable to load budgets. Check that Spring Boot is running.";
        showBudgetMessage(error.message, true);
    }
}

function getSpentAmount(category, month) {
    return transactions.reduce((total, transaction) => {
        const transactionCategory =
            String(transaction.category || "").toLowerCase();

        const transactionMonth =
            String(transaction.transactionDate || "").slice(0, 7);

        const type = String(transaction.type || "").toLowerCase();

        const isExpense =
            type === "expense" || type === "debit";

        if (
            transactionCategory === category.toLowerCase() &&
            transactionMonth === month &&
            isExpense
        ) {
            return total + Number(transaction.amount || 0);
        }

        return total;
    }, 0);
}

function renderBudgets() {
    budgetGrid.replaceChildren();

    if (budgets.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent =
            "No budgets yet. Add your first monthly budget above.";
        budgetGrid.appendChild(emptyMessage);
        return;
    }

    budgets.forEach((budget) => {
        const amount = Number(budget.amount || 0);
        const spent = getSpentAmount(budget.category, budget.budgetMonth);
        const remaining = amount - spent;
        const percentage = amount > 0
            ? Math.min((spent / amount) * 100, 100)
            : 0;

        const card = document.createElement("article");
        card.className = "budget-card";

        const title = document.createElement("h3");
        title.textContent = budget.category;

        const month = document.createElement("p");
        month.textContent = `Month: ${budget.budgetMonth}`;

        const total = document.createElement("p");
        total.textContent = `Budget: ${formatCurrency(amount)}`;

        const spentText = document.createElement("p");
        spentText.textContent = `Spent: ${formatCurrency(spent)}`;

        const remainingText = document.createElement("p");
        remainingText.textContent =
            `Remaining: ${formatCurrency(remaining)}`;

        if (remaining < 0) {
            remainingText.style.color = "#c0392b";
        }

        const progress = document.createElement("div");
        progress.className = "budget-progress";

        const progressBar = document.createElement("div");
        progressBar.style.width = `${percentage}%`;

        if (percentage >= 100) {
            progressBar.style.background = "#dc3545";
        }

        progress.appendChild(progressBar);

        const actions = document.createElement("div");
        actions.className = "budget-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editBudget(budget));

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteBudget(budget.id));

        actions.append(editButton, deleteButton);
        card.append(
            title,
            month,
            total,
            spentText,
            remainingText,
            progress,
            actions
        );

        budgetGrid.appendChild(card);
    });
}

budgetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const id = budgetIdInput.value;

    const budget = {
        category: categoryInput.value,
        amount: Number(amountInput.value),
        budgetMonth: monthInput.value
    };

    if (!budget.category || !budget.budgetMonth || budget.amount <= 0) {
        showBudgetMessage("Enter a category, month and valid amount.", true);
        return;
    }

    try {
        const response = await fetch(
            id ? `${BUDGET_API}/${id}` : BUDGET_API,
            {
                method: id ? "PUT" : "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(budget)
            }
        );

        if (!response.ok) {
            throw new Error("Could not save the budget.");
        }

        showBudgetMessage(id ? "Budget updated successfully!" :
            "Budget added successfully!");

        budgetForm.reset();
        budgetIdInput.value = "";

        saveButton.textContent = "Add Budget";
        monthInput.value =
            `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

        await loadBudgets();
    } catch (error) {
        showBudgetMessage(error.message, true);
    }
});

function editBudget(budget) {
    editBudgetId.value = budget.id;
    editCategory.value = budget.category;
    editAmount.value = budget.amount;
    editBudgetMonth.value = budget.budgetMonth;

    editBudgetMessage.textContent = "";
    editBudgetModal.classList.add("show");
}

async function deleteBudget(id) {
    if (!confirm("Are you sure you want to delete this budget?")) {
        return;
    }

    try {
        const response = await fetch(`${BUDGET_API}/${id}`, {
            method: "DELETE"
        });

        if (!response.ok) {
            throw new Error("Could not delete the budget.");
        }

        showBudgetMessage("Budget deleted successfully!");
        await loadBudgets();
    } catch (error) {
        showBudgetMessage(error.message, true);
    }
}

function closeBudgetModal() {
    editBudgetModal.classList.remove("show");
    editBudgetForm.reset();
    editBudgetMessage.textContent = "";
}

document.getElementById("closeBudgetModal")
    .addEventListener("click", closeBudgetModal);

document.getElementById("cancelBudgetEdit")
    .addEventListener("click", closeBudgetModal);

editBudgetModal.addEventListener("click", function (event) {
    if (event.target === editBudgetModal) {
        closeBudgetModal();
    }
});

editBudgetForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const id = editBudgetId.value;

    const budget = {
        category: editCategory.value,
        amount: Number(editAmount.value),
        budgetMonth: editBudgetMonth.value
    };

    if (!id || !budget.category ||
        !budget.budgetMonth || budget.amount <= 0) {
        editBudgetMessage.textContent =
            "Enter a category, month and valid amount.";
        return;
    }

    const updateButton =
        document.getElementById("updateBudgetButton");

    updateButton.disabled = true;
    updateButton.textContent = "Updating...";

    try {
        const response = await fetch(`${BUDGET_API}/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(budget)
        });

        if (!response.ok) {
            throw new Error("Could not update the budget.");
        }

        closeBudgetModal();
        showBudgetMessage("Budget updated successfully!");
        await loadBudgets();

    } catch (error) {
        editBudgetMessage.textContent = error.message;
        editBudgetMessage.style.color = "#c0392b";

    } finally {
        updateButton.disabled = false;
        updateButton.textContent = "Update Budget";
    }
});

loadBudgets();