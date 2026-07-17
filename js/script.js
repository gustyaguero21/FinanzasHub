// 1. Obtener de forma dinámica el año y mes actual (ej: "2026-07")
const ahora = new Date();
const mesActualKey = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`;

// 2. Cargar datos desde LocalStorage amarrados estrictamente al mes actual
let budget = parseFloat(localStorage.getItem(`pro_budget_${mesActualKey}`)) || 0;
let expenses = JSON.parse(localStorage.getItem('pro_expenses')) || [];

// Si no hay presupuesto mensual pero existía uno viejo general (de tus pruebas locales), lo migramos
if (budget === 0 && localStorage.getItem('pro_budget')) {
    budget = parseFloat(localStorage.getItem('pro_budget')) || 0;
    localStorage.setItem(`pro_budget_${mesActualKey}`, budget);
}

// Parche automático para gastos viejos sin fecha
let huboCambios = false;
expenses = expenses.map(item => {
    if (!item.date) {
        item.date = mesActualKey; 
        huboCambios = true;
    }
    return item;
});
if (huboCambios) {
    localStorage.setItem('pro_expenses', JSON.stringify(expenses));
}

// 3. Capturas de Elementos del DOM
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

// Renderizado inicial automático apenas carga la página
updateUI();

// 4. Funciones de Control
function setBudget() {
    const val = parseFloat(budgetInput.value);
    if (!isNaN(val) && val >= 0) {
        budget = val;
        
        // Guardamos con la clave mensual del mes en curso
        localStorage.setItem(`pro_budget_${mesActualKey}`, budget);
        
        budgetInput.value = '';
        updateUI();
    }
}

expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('expense-name').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const category = document.getElementById('expense-category').value;

    expenses.push({ 
        id: Date.now(), 
        name, 
        amount, 
        category,
        date: mesActualKey 
    });
    
    localStorage.setItem('pro_expenses', JSON.stringify(expenses));
    expenseForm.reset();
    updateUI();
});

function deleteExpense(id) {
    expenses = expenses.filter(item => item.id !== id);
    localStorage.setItem('pro_expenses', JSON.stringify(expenses));
    updateUI();
}

function updateUI() {
    // Las métricas de las tarjetas principales calculan SOLO el mes en curso
    const gastosDelMesActual = expenses.filter(item => item.date === mesActualKey);
    const totalSpent = gastosDelMesActual.reduce((sum, item) => sum + item.amount, 0);
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
        const opciones = { month: 'long' };
        const nombreMesActual = ahora.toLocaleDateString('es-AR', opciones);
        healthBox.innerText = `Asigná el presupuesto inicial de ${nombreMesActual.charAt(0).toUpperCase() + nombreMesActual.slice(1)} para comenzar el análisis del estado de tus cuentas.`;
    } else if (balance < 0) {
        healthBox.innerHTML = "⚠️ <strong style='color:var(--danger)'>Déficit crítico:</strong> Has sobrepasado los fondos asignados. Detener gastos superfluos.";
    } else if (percent > 80) {
        healthBox.innerHTML = "🚨 <strong style='color:var(--warning)'>Zona de riesgo:</strong> Consumiste más del 80% de tus recursos líquidos.";
    } else {
        healthBox.innerHTML = "✅ <strong style='color:var(--success)'>Flujo Estable:</strong> Tus consumos se mantienen dentro de los márgenes previstos.";
    }

    renderCategoryMetrics(gastosDelMesActual);
    renderExpenses();
}

function renderCategoryMetrics(gastosMes) {
    const cats = ['Comida', 'Transporte', 'Entretenimiento', 'Tarjeta de Credito', 'Otros'];
    categoriesSummary.innerHTML = '';

    if (gastosMes.length === 0) {
        categoriesSummary.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Sin consumos registrados este mes.</p>';
        return;
    }

    cats.forEach(c => {
        const totalCat = gastosMes.filter(i => i.category === c).reduce((s, i) => s + i.amount, 0);
        if (totalCat > 0) {
            const div = document.createElement('div');
            div.className = 'category-row';
            div.innerHTML = `
                <span class="cat-tag cat-${c.replace(/ /g, "")}">${c}</span>
                <strong style="color: var(--text-main); font-size:0.95rem;">$${totalCat.toLocaleString('es-AR', {minimumFractionDigits: 2})}</strong>
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

    const gruposPorMes = {};
    [...filtered].reverse().forEach(item => {
        const mes = item.date || "Historial general";
        if (!gruposPorMes[mes]) {
            gruposPorMes[mes] = [];
        }
        gruposPorMes[mes].push(item);
    });

    Object.keys(gruposPorMes).sort().reverse().forEach(mes => {
        let nombreMes = mes;
        const [anio, numeroMes] = mes.split('-');
        
        if (numeroMes) {
            nombreMes = new Date(anio, numeroMes - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
            nombreMes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);
        }

        const containerLi = document.createElement('li');
        containerLi.style.width = '100%';

        const btnMes = document.createElement('button');
        btnMes.className = 'month-accordion-btn';
        btnMes.innerHTML = `<span>📅 ${nombreMes}</span>`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'month-content';
        
        if (mes === mesActualKey) {
            btnMes.classList.add('active');
            contentDiv.classList.add('open');
        }

        gruposPorMes[mes].forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'history-item';
            itemDiv.innerHTML = `
                <div>
                    <span style="font-weight: 500; font-size:0.9rem; display:block; color:var(--text-main);">${item.name}</span>
                    <span class="cat-tag cat-${item.category.replace(/ /g, "")}" style="font-size:0.65rem; padding: 2px 6px; margin-top:4px; display:inline-block;">${item.category}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-weight: 600; color: var(--danger); font-size:0.95rem;">-$${item.amount.toFixed(2)}</span>
                    <button onclick="deleteExpense(${item.id})" style="background: none; border: none; padding: 4px; width: auto; cursor: pointer; font-size: 1rem; transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.15)'" onmouseout="this.style.transform='scale(1)'">
                        🗑️
                    </button>
                </div>
            `;
            contentDiv.appendChild(itemDiv);
        });

        btnMes.addEventListener('click', () => {
            btnMes.classList.toggle('active');
            contentDiv.classList.toggle('open');
        });

        containerLi.appendChild(btnMes);
        containerLi.appendChild(contentDiv);
        expenseList.appendChild(containerLi);
    });
}