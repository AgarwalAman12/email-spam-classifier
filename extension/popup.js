const toggle = document.getElementById("autoScanToggle");
const quickInput = document.getElementById("quickInput");
const scanBtn = document.getElementById("scanBtn");
const out = document.getElementById("out");

chrome.storage.local.get({ autoScan: true }, ({ autoScan }) => {
  toggle.checked = autoScan;
});

toggle.addEventListener("change", () => {
  chrome.storage.local.set({ autoScan: toggle.checked });
});

scanBtn.addEventListener("click", () => {
  const text = quickInput.value.trim();
  if (!text) return;

  scanBtn.disabled = true;
  scanBtn.textContent = "Checking...";

  chrome.runtime.sendMessage({ type: "SCAN_EMAIL", text }, (res) => {
    scanBtn.disabled = false;
    scanBtn.textContent = "Check Text";
    out.style.display = "block";

    if (!res || !res.ok) {
      out.className = "err";
      out.textContent = "Server offline. Run `python app.py` first.";
      return;
    }

    const isSpam = String(res.data.label).toLowerCase() === "spam";
    out.className = isSpam ? "spam" : "ham";
    out.textContent = `${isSpam ? "Likely Spam" : "Legitimate"} (${Number(res.data.confidence).toFixed(1)}%)`;
  });
});