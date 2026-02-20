const data = {
  balance: 12640.35,
  income: 5400,
  expenses: 2735.45,
  savingsGoal: 18000,
  savingsCurrent: 12640.35,
  transactions: [
    { name: 'Salary', category: 'Income', amount: 4200, date: '2026-02-01' },
    { name: 'Groceries', category: 'Food', amount: -134.27, date: '2026-02-18' },
    { name: 'Internet Bill', category: 'Utilities', amount: -65.0, date: '2026-02-17' },
    { name: 'ETF Investment', category: 'Investments', amount: -500.0, date: '2026-02-15' }
  ]
};

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const setText = (id, value) => {
  document.getElementById(id).textContent = currency.format(value);
};

setText('current-balance', data.balance);
setText('monthly-income', data.income);
setText('monthly-expenses', data.expenses);
setText('savings-goal', data.savingsGoal);

const progressPct = Math.min(100, (data.savingsCurrent / data.savingsGoal) * 100);
document.getElementById('goal-progress').style.width = `${progressPct}%`;
document
  .querySelector('.progress-track')
  .setAttribute('aria-valuenow', Math.round(progressPct));

const list = document.getElementById('transaction-list');
for (const tx of data.transactions) {
  const li = document.createElement('li');
  const amountClass = tx.amount < 0 ? 'negative' : 'positive';
  li.innerHTML = `
    <div>
      <strong>${tx.name}</strong>
      <div class="transaction-meta">${tx.category} • ${tx.date}</div>
    </div>
    <span class="${amountClass}">${currency.format(tx.amount)}</span>
  `;
  list.appendChild(li);
}
