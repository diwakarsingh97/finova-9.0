
"use strict";

const $ = id => document.getElementById(id);
const KEY = "finova_starter_v1";
const categories = ["Food","Transport","Shopping","Bills","Education","Health","Salary","Business","Entertainment","Other"];

let state = loadState();
let currentPage = "home";
let toastTimer;

function initialState() {
  return {
    name: "",
    theme: "dark",
    transactions: [],
    budgets: [],
    goals: [],
    premium: false
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved === "object") {
      return { ...initialState(), ...saved,
        transactions: Array.isArray(saved.transactions) ? saved.transactions : [],
        budgets: Array.isArray(saved.budgets) ? saved.budgets : [],
        goals: Array.isArray(saved.goals) ? saved.goals : []
      };
    }
  } catch (error) {
    console.warn("Could not load saved FINOVA data.", error);
  }
  return initialState();
}

function saveState() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    showToast("Storage is full or unavailable. Export your data.");
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[c]);
}

function money(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2
  }).format(Number(amount) || 0);
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function monthKey(date) {
  return String(date || "").slice(0,7);
}

function thisMonthTransactions() {
  return state.transactions.filter(t => monthKey(t.date) === today().slice(0,7));
}

function sum(items, type) {
  return items.filter(t => t.type === type).reduce((n,t) => n + Number(t.amount), 0);
}

function monthTotals(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  const items = state.transactions.filter(t => monthKey(t.date) === key);
  return { income: sum(items,"income"), expense: sum(items,"expense"), key, date:d };
}

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2600);
}

function openModal(id) {
  $(id).classList.remove("hidden");
}

function closeModal(id) {
  $(id).classList.add("hidden");
}

function updateIdentity() {
  const name = state.name || "Friend";
  $("sideName").textContent = name;
  $("sideAvatar").textContent = name.trim().charAt(0).toUpperCase() || "F";
  $("topAvatar").textContent = name.trim().charAt(0).toUpperCase() || "F";
}

function enterApp() {
  $("welcome").classList.add("hidden");
  $("app").classList.remove("hidden");
  updateIdentity();
  document.body.classList.toggle("light", state.theme === "light");
  render();
}

$("welcomeForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("nameInput").value.trim();
  if (!name) return;
  state.name = name;
  saveState();
  enterApp();
  showToast(`Welcome to FINOVA, ${name}!`);
});

$("year").textContent = new Date().getFullYear();
$("txDate").value = today();

if (state.name) {
  enterApp();
} else {
  $("welcome").classList.remove("hidden");
  $("app").classList.add("hidden");
  $("nameInput").focus();
}

$("themeButton").addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  document.body.classList.toggle("light", state.theme === "light");
  saveState();
  showToast(`${state.theme === "light" ? "Light" : "Dark"} theme enabled`);
});

$("profileButton").addEventListener("click", () => {
  $("editName").value = state.name;
  openModal("nameModal");
});
$("topAvatar").addEventListener("click", () => {
  $("editName").value = state.name;
  openModal("nameModal");
});

$("nameForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("editName").value.trim();
  if (!name) return;
  state.name = name;
  saveState();
  updateIdentity();
  closeModal("nameModal");
  render();
  showToast("Your name has been updated.");
});

$("resetButton").addEventListener("click", () => {
  if (!confirm("Delete all FINOVA data stored in this browser? This cannot be undone.")) return;
  localStorage.removeItem(KEY);
  state = initialState();
  currentPage = "home";
  closeModal("nameModal");
  $("nameInput").value = "";
  $("app").classList.add("hidden");
  $("welcome").classList.remove("hidden");
  $("nameInput").focus();
});

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => closeModal(button.dataset.close));
});

document.querySelectorAll(".overlay").forEach(overlay => {
  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeModal(overlay.id);
  });
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    document.querySelectorAll(".overlay").forEach(el => closeModal(el.id));
  }
});

document.addEventListener("click", event => {
  const button = event.target.closest("[data-page]");
  if (!button) return;
  event.preventDefault();
  currentPage = button.dataset.page;
  render();
});

$("transactionForm").addEventListener("submit", event => {
  event.preventDefault();
  const title = $("txTitle").value.trim();
  const amount = Number($("txAmount").value);
  const date = $("txDate").value;
  if (!title || !Number.isFinite(amount) || amount <= 0 || amount > 1e9 || !date) {
    showToast("Enter a valid description, amount and date.");
    return;
  }
  state.transactions.push({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
    type: $("txType").value,
    title,
    amount,
    category: $("txCategory").value,
    date
  });
  saveState();
  closeModal("transactionModal");
  $("transactionForm").reset();
  $("txDate").value = today();
  render();
  showToast("Transaction saved successfully.");
});

$("goalForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("goalName").value.trim();
  const target = Number($("goalTarget").value);
  const saved = Number($("goalSaved").value);
  if (!name || !Number.isFinite(target) || target <= 0 || target > 1e9 ||
      !Number.isFinite(saved) || saved < 0 || saved > target) {
    showToast("Check your goal amounts. Saved money cannot exceed the target.");
    return;
  }
  state.goals.push({
    id: String(Date.now()),
    name, target, saved
  });
  saveState();
  closeModal("goalModal");
  $("goalForm").reset();
  render();
  showToast("Savings goal created!");
});

$("budgetForm").addEventListener("submit", event => {
  event.preventDefault();
  const category = $("budgetCategory").value;
  const limit = Number($("budgetLimit").value);
  if (!Number.isFinite(limit) || limit <= 0 || limit > 1e9) {
    showToast("Enter a valid monthly budget.");
    return;
  }
  const existing = state.budgets.find(b => b.category === category);
  if (existing) existing.limit = limit;
  else state.budgets.push({ id:String(Date.now()), category, limit });
  saveState();
  closeModal("budgetModal");
  render();
  showToast("Monthly budget saved.");
});

$("exportButton").addEventListener("click", () => {
  const rows = [["Date","Type","Description","Category","Amount"]];
  state.transactions.forEach(t => rows.push([t.date,t.type,t.title,t.category,t.amount]));
  const csv = rows.map(row => row.map(v =>
    '"' + String(v ?? "").replace(/"/g,'""') + '"'
  ).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "finova-transactions.csv";
  a.click();
  URL.revokeObjectURL(url);
  showToast("CSV export prepared.");
});

function deleteTransaction(id) {
  if (!confirm("Delete this transaction?")) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveState();
  render();
  showToast("Transaction deleted.");
}

function deleteGoal(id) {
  if (!confirm("Delete this savings goal?")) return;
  state.goals = state.goals.filter(g => g.id !== id);
  saveState();
  render();
  showToast("Savings goal deleted.");
}

function transactionIcon(category) {
  const icons = {
    Food:"🍜",Transport:"🚗",Shopping:"🛍️",Bills:"⚡",
    Education:"📚",Health:"💚",Salary:"💼",Business:"🏢",
    Entertainment:"🎬",Other:"◈"
  };
  return icons[category] || "◈";
}

function transactionRow(t) {
  const positive = t.type === "income";
  return `<div class="transaction-row">
    <div class="tx-icon">${transactionIcon(t.category)}</div>
    <div class="tx-info"><strong>${escapeHTML(t.title)}</strong>
      <small>${escapeHTML(t.category)} · ${escapeHTML(t.date)}</small></div>
    <span class="tx-amount ${positive ? "green" : "red"}">${positive ? "+" : "−"}${money(t.amount)}</span>
    <button class="delete-tx" data-delete-tx="${escapeHTML(t.id)}" aria-label="Delete transaction">×</button>
  </div>`;
}

function goalCard(g) {
  const percent = Math.min(100, Math.round(g.saved / g.target * 100));
  return `<div class="goal-card">
    <div class="goal-top"><strong>${escapeHTML(g.name)}</strong><span>${percent}%</span></div>
    <div class="progress"><div style="width:${percent}%"></div></div>
    <div class="progress-note"><span>${money(g.saved)} saved</span><span>Target ${money(g.target)}</span></div>
    <button class="section-link" data-add-goal="${escapeHTML(g.id)}">＋ Add savings</button>
    <button class="delete-tx" data-delete-goal="${escapeHTML(g.id)}">Delete</button>
  </div>`;
}

function recentTransactions(items, limit = 5) {
  const ordered = [...items].sort((a,b) => b.date.localeCompare(a.date));
  if (!ordered.length) return `<div class="empty">No transactions yet.<br>Add your first transaction to see your money clearly.</div>`;
  return ordered.slice(0,limit).map(transactionRow).join("");
}

function chartMarkup() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const total = monthTotals(-i);
    months.push({
      label: total.date.toLocaleDateString("en-IN",{month:"short"}),
      income:total.income, expense:total.expense
    });
  }
  const max = Math.max(1,...months.flatMap(m => [m.income,m.expense]));
  return `<div class="chart-head"><div><h3>Cash flow</h3><p class="subtle">Income and spending by month</p></div>
    <div class="subtle"><span class="green">● Income</span><br><span class="red">● Expenses</span></div></div>
    <div class="chart-total">${money(months[5].income-months[5].expense)}</div>
    <p class="subtle">Net cash flow this month</p>
    <div class="chart-bars">${months.map(m => `<div class="bar-column">
      <div class="bar-track" title="Income ${money(m.income)}"><div class="bar-fill" style="height:${Math.max(3,m.income/max*100)}%;background:var(--green)"></div></div>
      <div class="bar-track" title="Expenses ${money(m.expense)}"><div class="bar-fill" style="height:${Math.max(3,m.expense/max*100)}%;background:var(--red)"></div></div>
      <small>${escapeHTML(m.label)}</small></div>`).join("")}</div>`;
}

function insightMarkup() {
  const month = monthTotals();
  const last = monthTotals(-1);
  const net = month.income-month.expense;
  const savingRate = month.income > 0 ? Math.round(net/month.income*100) : null;
  let spendingText = "Add transactions to understand your spending.";
  if (month.expense > 0 && last.expense > 0) {
    const change = Math.round((month.expense-last.expense)/last.expense*100);
    spendingText = `Your recorded spending is ${Math.abs(change)}% ${change > 0 ? "higher" : change < 0 ? "lower" : "unchanged"} than last month.`;
  } else if (month.expense > 0) {
    spendingText = `You've recorded ${money(month.expense)} in expenses this month.`;
  }
  const topCategory = Object.entries(thisMonthTransactions().filter(t=>t.type==="expense").reduce((obj,t)=>{
    obj[t.category]=(obj[t.category]||0)+Number(t.amount);return obj;
  },{})).sort((a,b)=>b[1]-a[1])[0];
  return `<div class="insight-item"><span class="insight-dot">↗</span><div><strong>Cash flow</strong><p>${net >= 0 ? "Your recorded income covers your expenses so far." : "Your recorded expenses exceed income this month."}</p></div></div>
    <div class="insight-item"><span class="insight-dot">◉</span><div><strong>Savings rate</strong><p>${savingRate === null ? "Record income to calculate your savings rate." : `Your current net savings are ${savingRate}% of recorded income.`}</p></div></div>
    <div class="insight-item"><span class="insight-dot">⌁</span><div><strong>Spending trend</strong><p>${escapeHTML(spendingText)}</p></div></div>
    <div class="insight-item"><span class="insight-dot">✦</span><div><strong>Top expense category</strong><p>${topCategory ? `${escapeHTML(topCategory[0])}: ${money(topCategory[1])}` : "Add expenses to identify your largest category."}</p></div></div>`;
}

function dashboard() {
  const items = thisMonthTransactions();
  const income = sum(items,"income"), expense = sum(items,"expense");
  const net = income-expense;
  const goalSaved = state.goals.reduce((n,g)=>n+Number(g.saved),0);
  const goalTarget = state.goals.reduce((n,g)=>n+Number(g.target),0);
  const goalPercent = goalTarget ? Math.min(100,Math.round(goalSaved/goalTarget*100)) : 0;
  return `<p class="welcome-line">Welcome back, <strong>${escapeHTML(state.name)}</strong>. Here's your money at a glance.</p>
    <div class="dashboard-grid">
      <section class="panel balance">
        <p class="eyebrow">MONTHLY NET CASH FLOW</p>
        <div class="balance-amount">${money(net)}</div>
        <div class="balance-meta"><span>Income: <b class="green">${money(income)}</b></span><span>Expenses: <b class="red">${money(expense)}</b></span></div>
      </section>
      <section class="panel stat"><div class="stat-icon">↗</div><div class="stat-label">Income</div><div class="stat-value">${money(income)}</div><div class="stat-foot">This month</div></section>
      <section class="panel stat"><div class="stat-icon">↘</div><div class="stat-label">Expenses</div><div class="stat-value">${money(expense)}</div><div class="stat-foot">This month</div></section>
      <section class="panel stat"><div class="stat-icon">◎</div><div class="stat-label">Goals progress</div><div class="stat-value">${goalPercent}%</div><div class="stat-foot">${money(goalSaved)} saved</div></section>
      <section class="panel chart-panel">${chartMarkup()}</section>
      <section class="panel insight-panel"><h3>Money insights</h3><p class="subtle">Based on the data you've entered.</p>${insightMarkup()}</section>
      <section class="panel transaction-panel"><div class="section-heading"><h3>Recent transactions</h3><button data-page="transactions">View all →</button></div><div class="transaction-list">${recentTransactions(state.transactions)}</div></section>
      <section class="panel goal-panel"><div class="section-heading"><h3>Savings goals</h3><button data-page="goals">View all →</button></div>${state.goals.length ? state.goals.slice(0,3).map(goalCard).join("") : `<div class="empty">Give your savings a purpose.<br>Create your first goal.</div>`}</section>
    </div>`;
}

function transactionsPage() {
  return `<section class="panel page-panel"><div class="section-heading"><h3>All transactions</h3><button id="addTransactionButton">＋ Add transaction</button></div><div class="transaction-list">${recentTransactions(state.transactions,1000)}</div></section>`;
}

function budgetsPage() {
  const items = thisMonthTransactions();
  const budgets = state.budgets.map(b => {
    const spent = items.filter(t=>t.type==="expense" && t.category===b.category).reduce((n,t)=>n+Number(t.amount),0);
    const pct = Math.round(spent/b.limit*100);
    return `<div class="budget-item"><div class="budget-top"><strong>${escapeHTML(b.category)}</strong><span>${money(spent)} / ${money(b.limit)}</span></div>
      <div class="progress"><div style="width:${Math.min(100,pct)}%;background:${pct>100?"var(--red)":"var(--green)"}"></div></div>
      <div class="progress-note"><span>${pct>100?"Budget exceeded":`${Math.max(0,100-pct)}% remaining`}</span><button class="delete-tx" data-delete-budget="${escapeHTML(b.category)}">Remove</button></div></div>`;
  }).join("");
  return `<section class="panel page-panel"><div class="section-heading"><h3>Monthly budgets</h3><button id="addBudgetButton">＋ Set budget</button></div><p class="subtle">Budgets compare your category limits against expenses recorded this month.</p>${budgets || `<div class="empty">No budgets yet. Set a limit to start tracking your spending.</div>`}</section>`;
}

function goalsPage() {
  return `<section class="panel page-panel"><div class="section-heading"><h3>Your savings goals</h3><button id="addGoalButton">＋ Create goal</button></div>${state.goals.length ? state.goals.map(goalCard).join("") : `<div class="empty">Big dreams start with small steps.<br>Create your first savings goal.</div>`}</section>`;
}

function insightsPage() {
  const month = monthTotals();
  const rate = month.income ? Math.round((month.income-month.expense)/month.income*100) : null;
  const tips = [
    ["Know your cash flow",`This month you've recorded ${money(month.income)} income and ${money(month.expense)} expenses.`],
    ["Build a savings habit",rate===null?"Record income to calculate a savings rate.":`Your current net savings rate is ${rate}%. A consistent saving habit can help build a buffer.`],
    ["Set spending boundaries",state.budgets.length?`You've set ${state.budgets.length} category budget${state.budgets.length===1?"":"s"}. Review them regularly.`:"Try setting category budgets to make spending limits visible."],
    ["Plan for your goals",state.goals.length?`You've created ${state.goals.length} savings goal${state.goals.length===1?"":"s"}. Keep contributions realistic and consistent.`:"Create a goal to give your savings a clear purpose."]
  ];
  return `<div class="dashboard-grid">${tips.map((t,i)=>`<section class="panel stat" style="grid-column:span 6"><div class="stat-icon">${["↗","◎","◉","✦"][i]}</div><h3>${t[0]}</h3><p class="subtle">${t[1]}</p></section>`).join("")}
    <section class="panel" style="grid-column:span 12"><h3>How these insights work</h3><p class="subtle">Insights use only the transactions, budgets and goals you enter into this browser. They are simple calculations, not personalized financial advice. They won't see your bank accounts automatically.</p></section></div>`;
}

function premiumPage() {
  return `<section class="premium-hero"><p class="eyebrow">✦ FINOVA PREMIUM</p><h3>Make room for<br>smarter money decisions.</h3><p class="subtle">Explore a premium experience designed to help you understand your finances.</p>
    <ul class="feature-list"><li>Advanced spending analysis</li><li>More detailed financial reports</li><li>Expanded savings and budget tools</li><li>Premium financial planning features</li><li>CSV exports and future upgrades</li></ul>
    <p class="subtle">Premium subscriptions are displayed for planning purposes. Payments are not enabled in this starter version.</p></section>
    <div class="price-grid">
      <section class="price-card"><p class="eyebrow">MONTHLY</p><div class="price">₹49 <span class="subtle">/ month</span></div><p class="subtle">Flexible monthly access.</p><button class="primary full" data-premium-plan="monthly">Choose monthly</button></section>
      <section class="price-card"><p class="eyebrow">YEARLY · SAVE MORE</p><div class="price">₹570 <span class="subtle">/ year</span></div><p class="subtle">Equivalent to ₹47.50 per month.</p><button class="primary full" data-premium-plan="yearly">Choose yearly</button></section>
    </div>`;
}

function render() {
  if (!$("app").classList.contains("hidden")) {
    const pages = {
      home:["Overview",dashboard],
      transactions:["Transactions",transactionsPage],
      budgets:["Budgets",budgetsPage],
      goals:["Savings Goals",goalsPage],
      insights:["Money Insights",insightsPage],
      premium:["FINOVA Premium",premiumPage]
    };
    const selected = pages[currentPage] || pages.home;
    $("pageTitle").textContent = selected[0];
    $("content").innerHTML = selected[1]();
    document.querySelectorAll(".nav").forEach(n => n.classList.toggle("active",n.dataset.page===currentPage));
    updateIdentity();
    bindDynamicButtons();
  }
}

function bindDynamicButtons() {
  const addTx = $("addTransactionButton");
  if (addTx) addTx.addEventListener("click",()=>openModal("transactionModal"));
  const addBudget = $("addBudgetButton");
  if (addBudget) addBudget.addEventListener("click",()=>openModal("budgetModal"));
  const addGoal = $("addGoalButton");
  if (addGoal) addGoal.addEventListener("click",()=>openModal("goalModal"));

  document.querySelectorAll("[data-delete-tx]").forEach(b=>b.addEventListener("click",()=>deleteTransaction(b.dataset.deleteTx)));
  document.querySelectorAll("[data-delete-goal]").forEach(b=>b.addEventListener("click",()=>deleteGoal(b.dataset.deleteGoal)));
  document.querySelectorAll("[data-delete-budget]").forEach(b=>b.addEventListener("click",()=>{
    state.budgets=state.budgets.filter(x=>x.category!==b.dataset.deleteBudget);
    saveState();render();showToast("Budget removed.");
  }));
  document.querySelectorAll("[data-add-goal]").forEach(b=>b.addEventListener("click",()=>{
    const goal=state.goals.find(g=>g.id===b.dataset.addGoal);
    if(!goal)return;
    const raw=prompt(`How much would you like to add to "${goal.name}"? (₹)`);
    if(raw===null)return;
    const amount=Number(raw);
    if(!Number.isFinite(amount)||amount<=0){showToast("Enter a valid positive amount.");return;}
    goal.saved=Math.min(goal.target,goal.saved+amount);
    saveState();render();showToast("Savings progress updated.");
  }));
  document.querySelectorAll("[data-premium-plan]").forEach(b=>b.addEventListener("click",()=>{
    showToast("Payments aren't connected yet. Google Play Billing must be integrated before charging users.");
  }));
}

$("content").addEventListener("click",event=>{
  const btn=event.target.closest("[data-page]");
  if(btn){
    currentPage=btn.dataset.page;
    render();
  }
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  // Service-worker support can be added when FINOVA is deployed over HTTPS.
}
