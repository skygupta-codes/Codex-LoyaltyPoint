const USERS_KEY = "loyalty-users";
const SESSION_KEY = "loyalty-current-user";

const authStatus = document.getElementById("auth-status");
const signupBtn = document.getElementById("signup-btn");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

const cardManager = document.getElementById("card-manager");
const dashboard = document.getElementById("dashboard");
const chatPanel = document.getElementById("chat-panel");

const cardForm = document.getElementById("card-form");
const cardList = document.getElementById("card-list");

const totalCardsEl = document.getElementById("total-cards");
const totalPointsEl = document.getElementById("total-points");
const topCardEl = document.getElementById("top-card");

const chatLog = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");

function readUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSessionUser() {
  return localStorage.getItem(SESSION_KEY);
}

function setSessionUser(email) {
  localStorage.setItem(SESSION_KEY, email);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getAuthInput() {
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  return { email, password };
}

function setLoggedInUI(email) {
  const isLoggedIn = Boolean(email);
  cardManager.hidden = !isLoggedIn;
  dashboard.hidden = !isLoggedIn;
  chatPanel.hidden = !isLoggedIn;
  logoutBtn.hidden = !isLoggedIn;
  signupBtn.hidden = isLoggedIn;
  loginBtn.hidden = isLoggedIn;
  authStatus.textContent = isLoggedIn ? `Logged in as ${email}` : "No active session.";

  if (isLoggedIn) {
    renderCards();
    renderDashboard();
    renderChatWelcome();
  } else {
    cardList.innerHTML = "";
    chatLog.innerHTML = "";
  }
}

function signup() {
  const { email, password } = getAuthInput();
  if (!email || !password) return;

  const users = readUsers();
  if (users[email]) {
    authStatus.textContent = "Account already exists. Please login.";
    return;
  }

  users[email] = { password, cards: {} };
  writeUsers(users);
  setSessionUser(email);
  setLoggedInUI(email);
}

function login() {
  const { email, password } = getAuthInput();
  const users = readUsers();

  if (!users[email] || users[email].password !== password) {
    authStatus.textContent = "Invalid credentials.";
    return;
  }

  setSessionUser(email);
  setLoggedInUI(email);
}

function logout() {
  clearSession();
  setLoggedInUI("");
}

function currentUserData() {
  const email = getSessionUser();
  if (!email) return null;
  const users = readUsers();
  return { email, data: users[email], users };
}

function upsertCard(name, points) {
  const current = currentUserData();
  if (!current) return;

  current.data.cards[name] = Number(points);
  current.users[current.email] = current.data;
  writeUsers(current.users);
}

function renderCards() {
  const current = currentUserData();
  if (!current) return;

  const entries = Object.entries(current.data.cards);
  cardList.innerHTML = "";

  if (entries.length === 0) {
    cardList.innerHTML = "<li>No cards added yet.</li>";
    return;
  }

  entries
    .sort((a, b) => b[1] - a[1])
    .forEach(([name, points]) => {
      const li = document.createElement("li");
      li.textContent = `${name}: ${points.toLocaleString()} points`;
      cardList.appendChild(li);
    });
}

function renderDashboard() {
  const current = currentUserData();
  if (!current) return;

  const entries = Object.entries(current.data.cards);
  const totalCards = entries.length;
  const totalPoints = entries.reduce((sum, [, points]) => sum + points, 0);
  const best = entries.sort((a, b) => b[1] - a[1])[0];

  totalCardsEl.textContent = String(totalCards);
  totalPointsEl.textContent = totalPoints.toLocaleString();
  topCardEl.textContent = best ? `${best[0]} (${best[1].toLocaleString()})` : "—";
}

function assistantReply(input) {
  const current = currentUserData();
  const entries = current ? Object.entries(current.data.cards) : [];
  const totalPoints = entries.reduce((sum, [, points]) => sum + points, 0);

  const prompt = input.toLowerCase();

  if (prompt.includes("total")) {
    return `You currently have ${totalPoints.toLocaleString()} total points across ${entries.length} card(s).`;
  }

  if (prompt.includes("travel") || prompt.includes("flight")) {
    if (totalPoints >= 100000) return "You can likely book an international round-trip reward flight, depending on transfer partners.";
    if (totalPoints >= 50000) return "You likely have enough for a domestic flight or hotel stay using transfer partners/portal redemptions.";
    return "Focus on building to ~25k+ for better travel value. Consider transfer bonuses and off-peak awards.";
  }

  if (prompt.includes("cash") || prompt.includes("redeem")) {
    return "Cash-back redemptions are simple, but travel transfers often provide higher cents-per-point value.";
  }

  if (entries.length === 0) {
    return "Add at least one credit card points balance so I can give personalized suggestions.";
  }

  const topCard = entries.sort((a, b) => b[1] - a[1])[0];
  return `Your highest balance is ${topCard[0]} with ${topCard[1].toLocaleString()} points. Ask me about travel, cash-out, or total points.`;
}

function appendMessage(author, text) {
  const p = document.createElement("p");
  p.className = "message";
  p.innerHTML = `<strong>${author}:</strong> ${text}`;
  chatLog.appendChild(p);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderChatWelcome() {
  chatLog.innerHTML = "";
  appendMessage("Assistant", "Hi! I can help you decide what to do with your loyalty points.");
}

signupBtn.addEventListener("click", signup);
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);

cardForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("card-name").value.trim();
  const points = document.getElementById("card-points").value;
  if (!name || points === "") return;

  upsertCard(name, points);
  cardForm.reset();
  renderCards();
  renderDashboard();
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  const message = input.value.trim();
  if (!message) return;

  appendMessage("You", message);
  appendMessage("Assistant", assistantReply(message));
  input.value = "";
});

setLoggedInUI(getSessionUser());
