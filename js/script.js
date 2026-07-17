let budget = parseFloat(localStorage.getItem('pro_budget')) || 0;
let expenses = JSON.parse(localStorage.getItem('pro_expenses')) || [];

const budgetInput = document.getElementById('budget-input');
const balanceDisplay = document.getElementById('balance-display');
const spentDisplay = document.getElementById('spent-display');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const categoriesSummary = document.getElementById('categories-summary');
const healthBox = document.getElementById('health-box');
const expenseList = document.getElementById('expense-list');
const filterCategory = document.getElementById('filter-category');
const expenseForm = document.getElementById('expense-form');


updateUI();

function setBudget() {
    const val = parseFloat(budgetInput.value);
    if (!isNaN(val) && val >= 0) {
        budget = val;
        
        localStorage.setItem('pro_budget', budget); //persistencia de datos
        
        budgetInput.value = '';
        updateUI();
    }
}

expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('expense-name').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;

    expenses.push({ id: Date.now(), name, amount, category });
    
    localStorage.setItem('pro_expenses', JSON.stringify(expenses));
    
    expenseForm.reset();
    updateUI();
});

function updateUI() {
    const totalSpent = expenses.reduce((sum, item) => sum + item.amount, 0);
    const balance = budget - totalSpent;

    balanceDisplay.innerText = `$${balance.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    spentDisplay.innerText = `$${totalSpent.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;

    if (balance < 0) {
        balanceDisplay.style.color = 'var(--danger)';
    } else {
        balanceDisplay.style.color = 'var(--success)';
    }

    let percent = budget > 0 ? (totalSpent / budget) * 100 : 0;
    percent = Math.min(percent, 100);
    progressBar.style.width = `${percent}%`;
    progressPercent.innerText = `${Math.round(percent)}%`;

    if (percent > 85) progressBar.style.backgroundColor = 'var(--danger)';
    else if (percent > 60) progressBar.style.backgroundColor = 'var(--warning)';
    else progressBar.style.backgroundColor = 'var(--primary)';

    if (budget === 0) {
        healthBox.innerText = "Establecé un presupuesto inicial para comenzar el análisis automatizado de flujo.";
    } else if (balance < 0) {
        healthBox.innerHTML = "⚠️ <strong style='color:var(--danger)'>Déficit crítico:</strong> Has sobrepasado los fondos asignados. Detener gastos superfluos.";
    } else if (percent > 80) {
        healthBox.innerHTML = "🚨 <strong style='color:var(--warning)'>Zona de riesgo:</strong> Consumiste más del 80% de tus recursos líquidos.";
    } else {
        healthBox.innerHTML = "✅ <strong style='color:var(--success)'>Flujo Estable:</strong> Tus consumos se mantienen dentro de los márgenes previstos.";
    }

    renderCategoryMetrics();
    renderExpenses();
}

function renderCategoryMetrics() {
    const cats = ['Comida', 'Transporte', 'Entretenimiento', 'Otros'];
    categoriesSummary.innerHTML = '';

    if (expenses.length === 0) {
        categoriesSummary.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Sin consumos registrados.</p>';
        return;
    }

    cats.forEach(c => {
        const totalCat = expenses.filter(i => i.category === c).reduce((s, i) => s + i.amount, 0);
        if (totalCat > 0) {
            const div = document.createElement('div');
            div.className = 'category-row';
            div.innerHTML = `
                <span class="cat-tag cat-${c}">${c}</span>
                <strong style="color: var(--text-main); font-size:0.95rem;">$${totalCat.toFixed(2)}</strong>
            `;
            categoriesSummary.appendChild(div);
        }
    });
}

function renderExpenses() {
    expenseList.innerHTML = '';
    const filter = filterCategory.value;
    const filtered = expenses.filter(i => filter === 'Todos' || i.category === filter);

    if (filtered.length === 0) {
        expenseList.innerHTML = '<li style="color: var(--text-muted); text-align:center; padding: 20px; font-size: 0.9rem; border:none; width:100%">Historial vacío</li>';
        return;
    }

    filtered.reverse().forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.innerHTML = `
            <div>
                <span style="font-weight: 500; font-size:0.9rem; display:block; color:var(--text-main);">${item.name}</span>
                <span class="cat-tag cat-${item.category}" style="font-size:0.65rem; padding: 2px 6px; margin-top:4px; display:inline-block;">${item.category}</span>
            </div>
            <span style="font-weight: 600; color: var(--danger); font-size:0.95rem;">-$${item.amount.toFixed(2)}</span>
        `;
        expenseList.appendChild(li);
    });
}