let lastScannedText = "";
let scanTimer = null;

function getEmailBodyElement() {
  // Gmail opened message body (.a3s.aiL) or Outlook Web reading pane
  return (
    document.querySelector(".a3s.aiL") ||
    document.querySelector('[aria-label="Message body"]')
  );
}

function injectBanner(targetEl, isSpam, confidence) {
  const existing = document.getElementById("mg-alert-banner");
  if (existing) existing.remove();

  // Only show prominent warning for Spam, and a compact badge for Legitimate
  const banner = document.createElement("div");
  banner.id = "mg-alert-banner";
  banner.className = isSpam ? "mg-banner mg-spam" : "mg-banner mg-safe";

  const confStr = Number(confidence).toFixed(1);
  banner.innerHTML = isSpam
    ? `<div class="mg-banner-content">
         <strong>Warning: Potential Spam or Phishing Detected</strong>
         <span>MailGuard flagged this email with ${confStr}% confidence. Avoid clicking links or sharing credentials.</span>
       </div>
       <button class="mg-dismiss" title="Dismiss">&times;</button>`
    : `<div class="mg-banner-content">
         <strong>MailGuard: Looks Legitimate</strong>
         <span>Confidence: ${confStr}%</span>
       </div>
       <button class="mg-dismiss" title="Dismiss">&times;</button>`;

  banner.querySelector(".mg-dismiss").addEventListener("click", () => banner.remove());
  targetEl.parentElement.insertBefore(banner, targetEl);
}

function scanCurrentEmail() {
  chrome.storage.local.get({ autoScan: true }, ({ autoScan }) => {
    if (!autoScan) return;

    const bodyEl = getEmailBodyElement();
    if (!bodyEl) return;

    const text = bodyEl.innerText.trim();
    if (text.length < 25 || text === lastScannedText) return;

    lastScannedText = text;

    chrome.runtime.sendMessage({ type: "SCAN_EMAIL", text }, (res) => {
      if (chrome.runtime.lastError || !res || !res.ok) return;
      const isSpam = String(res.data.label).toLowerCase() === "spam";
      injectBanner(bodyEl, isSpam, res.data.confidence);
    });
  });
}

// Watch for navigation between emails in single-page webmail apps
const observer = new MutationObserver(() => {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scanCurrentEmail, 700);
});

observer.observe(document.body, { childList: true, subtree: true });