// ===== State =====
let transactions = [];
let chart = null;

const COLORS = {
  Food: '#22c55e',
  Transport: '#3b82f6',
  Fun: '#f97316'
};

// ===== LocalStorage =====
function saveData() {
  localStorage.setItem('budget_transactions', JSON.stringify(transactions));
}

function loadData() {
  const stored = localStorage.getItem('budget_transactions');
  if (stored) {
    try { transactions = JSON.parse(stored); } catch { transactions = []; }
  }
}

// ===== Add Transaction =====
function addTransaction() {
  const name = document.getElementById('itemName').value.trim();
  const amount = parseFloat(document.getElementById('itemAmount').value);
  const category = document.getElementById('itemCategory').value;
  const errorEl = document.getElementById('formError');

  if (!name || isNaN(amount) || amount <= 0 || !category) {
    errorEl.classList.remove('hidden');
    return;
  }
  errorEl.classList.add('hidden');

  const tx = {
    id: Date.now(),
    name,
    amount,
    category,
    date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  };

  transactions.unshift(tx);
  saveData();
  renderAll();

  // Reset form
  document.getElementById('itemName').value = '';
  document.getElementById('itemAmount').value = '';
}

// ===== Delete Transaction =====
function deleteTransaction(id) {
  transactions = transactions.filter(tx => tx.id !== id);
  saveData();
  renderAll();
}

// ===== Render All =====
function renderAll() {
  renderBalance();
  renderPills();
  renderList();
  renderChart();
}

// ===== Format Currency =====
function formatRp(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

// ===== Render Balance =====
function renderBalance() {
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  document.getElementById('totalBalance').textContent = formatRp(total);

  const max = transactions.length > 0 ? Math.max(...transactions.map(t => t.amount)) * transactions.length : 1;
  const pct = Math.min((total / (max || 1)) * 100, 100);
  document.getElementById('balanceFill').style.width = pct + '%';

  const meta = transactions.length === 0
    ? 'No transactions yet'
    : `${transactions.length} transaction${transactions.length > 1 ? 's' : ''}`;
  document.getElementById('balanceMeta').textContent = meta;
}

// ===== Render Pills =====
function renderPills() {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  transactions.forEach(tx => { if (totals[tx.category] !== undefined) totals[tx.category] += tx.amount; });
  document.getElementById('pillFood').textContent = formatRp(totals.Food);
  document.getElementById('pillTransport').textContent = formatRp(totals.Transport);
  document.getElementById('pillFun').textContent = formatRp(totals.Fun);
}

// ===== Get Sorted Transactions =====
function getSorted() {
  const sort = document.getElementById('sortSelect').value;
  const copy = [...transactions];
  if (sort === 'newest') return copy;
  if (sort === 'amount-desc') return copy.sort((a, b) => b.amount - a.amount);
  if (sort === 'amount-asc') return copy.sort((a, b) => a.amount - b.amount);
  if (sort === 'category') return copy.sort((a, b) => a.category.localeCompare(b.category));
  return copy;
}

// ===== Render List =====
function renderList() {
  const list = document.getElementById('transactionList');
  const empty = document.getElementById('emptyState');
  const sorted = getSorted();

  if (sorted.length === 0) {
    list.innerHTML = '';
    list.appendChild(empty);
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const catEmoji = { Food: '🍜', Transport: '🚗', Fun: '🎉' };

  list.innerHTML = sorted.map(tx => `
    <div class="transaction-item cat-${tx.category}">
      <div class="tx-info">
        <div class="tx-name">${escapeHtml(tx.name)}</div>
        <div class="tx-meta">${catEmoji[tx.category] || '📌'} ${tx.category} · ${tx.date}</div>
      </div>
      <div class="tx-amount">${formatRp(tx.amount)}</div>
      <button class="tx-delete" onclick="deleteTransaction(${tx.id})">Delete</button>
    </div>
  `).join('');
}

// ===== Render Chart =====
function renderChart() {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  transactions.forEach(tx => { if (totals[tx.category] !== undefined) totals[tx.category] += tx.amount; });

  const allZero = Object.values(totals).every(v => v === 0);
  const chartEmpty = document.getElementById('chartEmpty');
  const canvas = document.getElementById('spendingChart');

  if (allZero) {
    canvas.style.display = 'none';
    chartEmpty.style.display = 'block';
    if (chart) { chart.destroy(); chart = null; }
    return;
  }

  canvas.style.display = 'block';
  chartEmpty.style.display = 'none';

  const data = {
    labels: ['Food', 'Transport', 'Fun'],
    datasets: [{
      data: [totals.Food, totals.Transport, totals.Fun],
      backgroundColor: [COLORS.Food, COLORS.Transport, COLORS.Fun],
      borderWidth: 2,
      borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#fff',
      hoverOffset: 8
    }]
  };

  if (chart) {
    chart.data = data;
    chart.update();
  } else {
    chart = new Chart(canvas, {
      type: 'pie',
      data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              font: { family: "'DM Sans', sans-serif", size: 12 },
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#666'
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${formatRp(ctx.parsed)}`
            }
          }
        }
      }
    });
  }
}

// ===== Escape HTML =====
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== Dark/Light Mode =====
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('budget_theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
updateToggleIcon(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('budget_theme', next);
  updateToggleIcon(next);
  if (chart) { chart.destroy(); chart = null; renderChart(); }
});

function updateToggleIcon(theme) {
  themeToggle.querySelector('.toggle-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ===== Enter Key Support =====
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.target.id === 'itemName' || e.target.id === 'itemAmount')) {
    addTransaction();
  }
});

// ===== Init =====
loadData();
renderAll();
