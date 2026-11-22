// Grab every element once, using the IDs defined in index.html
const emailInput = document.getElementById("emailInput");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultBox = document.getElementById("result");
const badge = document.getElementById("badge");
const barFill = document.getElementById("barFill");
const confText = document.getElementById("confText");
const errorMsg = document.getElementById("errorMsg");

// Quick-fill samples for testing
const SAMPLES = {
  spam: "WINNER!! You have been selected to receive a $1000 cash prize. Click the link now to claim your free reward before it expires!",
  ham: "Hi Sarah, just confirming our project meeting tomorrow at 10 AM in the conference room. Please bring the latest report. Thanks, David",
};
document.getElementById("sampleSpam").addEventListener("click", () => { emailInput.value = SAMPLES.spam; });
document.getElementById("sampleHam").addEventListener("click", () => { emailInput.value = SAMPLES.ham; });

// Dark/light theme toggle, remembered between visits
const root = document.documentElement;
root.dataset.theme = localStorage.getItem("theme") || "dark";
document.getElementById("themeToggle").addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", root.dataset.theme);
});

function showError(message) {
  resultBox.classList.add("hidden");
  errorMsg.textContent = message;
  errorMsg.classList.remove("hidden");
}

function showResult(label, confidence) {
  const cls = label === "Spam" ? "spam" : "ham";
  badge.textContent = label === "Spam" ? "🚫 Spam" : "✅ Legitimate";
  badge.className = "badge " + cls;
  barFill.className = "bar-fill " + cls;
  barFill.style.width = confidence + "%";  // the CSS transition animates the bar
  confText.textContent = "Confidence: " + confidence.toFixed(2) + "%";
  errorMsg.classList.add("hidden");
  resultBox.classList.remove("hidden");
}

analyzeBtn.addEventListener("click", async () => {
  const text = emailInput.value.trim();
  if (!text) { showError("Please paste some email text first."); return; }

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analyzing...";

  try {
    // Send the email text to Flask's /predict route as JSON (same origin, so no CORS)
    const response = await fetch("/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: text }),  // key "email" is read by app.py
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Server error");

    showResult(data.label, data.confidence);  // keys returned by app.py
  } catch (err) {
    showError(err.message || "Could not reach the server.");
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analyze Email";
  }
});