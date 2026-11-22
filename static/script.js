const emailInput = document.getElementById("emailInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const clearBtn = document.getElementById("clearBtn");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const liveMetrics = document.getElementById("liveMetrics");
const errorMsg = document.getElementById("errorMsg");

const emptyState = document.getElementById("emptyState");
const resultBox = document.getElementById("resultBox");
const verdictTitle = document.getElementById("verdictTitle");
const confValue = document.getElementById("confValue");
const barFill = document.getElementById("barFill");
const signalsList = document.getElementById("signalsList");
const copyReportBtn = document.getElementById("copyReportBtn");

const historyList = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const SAMPLES = {
  phish:
    "URGENT: Your payroll account has been temporarily suspended due to an unverified login attempt. Verify your banking credentials within 12 hours at http://secure-payroll-verify.net/login to avoid permanent lock.",
  promo:
    "CONGRATULATIONS!! You have been selected as our $2,500 cash voucher winner. Click here immediately to claim your FREE prize before midnight tonight!",
  ham:
    "Hi Ananya,\n\nI pushed the updated Q3 metrics to the shared repo. Can we review the slide deck tomorrow at 11:00 AM before sending it to the client?\n\nBest,\nRohan",
};

let lastResult = null;

// Theme persistence
const root = document.documentElement;
root.dataset.theme = localStorage.getItem("mg_theme") || "light";
document.getElementById("themeToggle").addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("mg_theme", root.dataset.theme);
});

// Sample buttons
document.querySelectorAll("[data-sample]").forEach((btn) => {
  btn.addEventListener("click", () => {
    emailInput.value = SAMPLES[btn.dataset.sample];
    updateMetrics();
    hideError();
  });
});

// File upload & drag-and-drop
function readEmailFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    emailInput.value = e.target.result;
    updateMetrics();
    hideError();
  };
  reader.readAsText(file);
}

fileInput.addEventListener("change", (e) => readEmailFile(e.target.files[0]));

["dragenter", "dragover"].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });
});
["dragleave", "drop"].forEach((evt) => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
  });
});
dropZone.addEventListener("drop", (e) => readEmailFile(e.dataTransfer.files[0]));

// Live metrics
function updateMetrics() {
  const text = emailInput.value;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const links = (text.match(/https?:\/\/\S+|www\.\S+/gi) || []).length;
  liveMetrics.innerHTML = `<span>${words} words</span><span>${chars} chars</span><span>${links} ${links === 1 ? "link" : "links"}</span>`;
}
emailInput.addEventListener("input", updateMetrics);

clearBtn.addEventListener("click", () => {
  emailInput.value = "";
  updateMetrics();
  hideError();
});

// Heuristic text signal extraction (runs locally to explain context)
function extractSignals(text) {
  const signals = [];
  if (/(urgent|immediately|24 hours|12 hours|suspended|verify your|action required|expires)/i.test(text)) {
    signals.push({ text: "Urgency or account-threat language", warn: true });
  }
  if (/(winner|cash prize|free|claim your|congratulations|\$\d+|lottery|voucher)/i.test(text)) {
    signals.push({ text: "Financial or giveaway lure keywords", warn: true });
  }
  const urls = text.match(/https?:\/\/\S+|www\.\S+/gi) || [];
  if (urls.length > 0) {
    signals.push({ text: `Contains ${urls.length} external link${urls.length > 1 ? "s" : ""}`, warn: true });
  }
  const letters = text.replace(/[^a-zA-Z]/g, "");
  const upperRatio = letters.length > 15 ? (text.replace(/[^A-Z]/g, "").length / letters.length) : 0;
  if (upperRatio > 0.3) {
    signals.push({ text: "Unusually high uppercase character ratio", warn: true });
  }
  if (/[!?]{2,}/.test(text)) {
    signals.push({ text: "Repeated exclamation/question punctuation", warn: true });
  }
  if (signals.length === 0) {
    signals.push({ text: "No common phishing or spam heuristics triggered", warn: false });
  }
  return signals;
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
}
function hideError() {
  errorMsg.classList.add("hidden");
}

function renderResult(label, confidence, text) {
  const isSpam = String(label).toLowerCase() === "spam";
  const cls = isSpam ? "spam" : "ham";
  const numericConf = Number(confidence) || 0;

  verdictTitle.textContent = isSpam ? "Likely Spam" : "Legitimate";
  verdictTitle.className = "verdict-title " + cls;
  confValue.textContent = numericConf.toFixed(1) + "%";

  barFill.className = "meter-fill " + cls;
  barFill.style.width = "0%";
  requestAnimationFrame(() => {
    barFill.style.width = Math.min(100, Math.max(0, numericConf)) + "%";
  });

  const signals = extractSignals(text);
  signalsList.innerHTML = signals
    .map((s) => `<li class="${s.warn ? "flag-warn" : "flag-ok"}">${s.text}</li>`)
    .join("");

  emptyState.classList.add("hidden");
  resultBox.classList.remove("hidden");
  copyReportBtn.classList.remove("hidden");

  lastResult = { label: isSpam ? "Spam" : "Legitimate", confidence: numericConf, signals };
}

// History management
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem("mg_history") || "[]");
  } catch {
    return [];
  }
}

function saveToHistory(text, label, confidence) {
  const items = getHistory();
  items.unshift({
    text,
    snippet: text.replace(/\s+/g, " ").slice(0, 60),
    isSpam: String(label).toLowerCase() === "spam",
    confidence: Number(confidence).toFixed(0),
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  });
  localStorage.setItem("mg_history", JSON.stringify(items.slice(0, 10)));
  renderHistory();
}

function renderHistory() {
  const items = getHistory();
  if (!items.length) {
    historyList.innerHTML = `<li class="history-empty">Your recent inspections will appear here.</li>`;
    clearHistoryBtn.classList.add("hidden");
    return;
  }
  clearHistoryBtn.classList.remove("hidden");
  historyList.innerHTML = items
    .map(
      (item, idx) => `
      <li class="history-item" data-idx="${idx}">
        <span class="history-snippet">${item.snippet.replace(/</g, "&lt;")}</span>
        <span class="history-meta">
          <span class="pill ${item.isSpam ? "spam" : "ham"}">${item.isSpam ? "SPAM" : "OK"} ${item.confidence}%</span>
        </span>
      </li>`
    )
    .join("");

  historyList.querySelectorAll(".history-item").forEach((el) => {
    el.addEventListener("click", () => {
      const chosen = items[Number(el.dataset.idx)];
      emailInput.value = chosen.text;
      updateMetrics();
      renderResult(chosen.isSpam ? "Spam" : "Legitimate", chosen.confidence, chosen.text);
    });
  });
}

clearHistoryBtn.addEventListener("click", () => {
  localStorage.removeItem("mg_history");
  renderHistory();
});

copyReportBtn.addEventListener("click", async () => {
  if (!lastResult) return;
  const report = `MailGuard Report\nVerdict: ${lastResult.label} (${lastResult.confidence.toFixed(1)}%)\nSignals:\n- ${lastResult.signals.map((s) => s.text).join("\n- ")}`;
  await navigator.clipboard.writeText(report);
  copyReportBtn.textContent = "Copied";
  setTimeout(() => (copyReportBtn.textContent = "Copy report"), 1500);
});

async function runAnalysis() {
  const text = emailInput.value.trim();
  if (!text) {
    showError("Paste or drop an email message before running inspection.");
    return;
  }

  hideError();
  analyzeBtn.disabled = true;
  analyzeBtn.querySelector("span").textContent = "Inspecting...";

  try {
    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: text }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Server returned an error.");

    renderResult(data.label, data.confidence, text);
    saveToHistory(text, data.label, data.confidence);
  } catch (err) {
    showError(err.message || "Unable to reach the local Flask server.");
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.querySelector("span").textContent = "Inspect Message";
  }
}

analyzeBtn.addEventListener("click", runAnalysis);
emailInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    runAnalysis();
  }
});

renderHistory();