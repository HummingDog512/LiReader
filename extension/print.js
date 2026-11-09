(() => {
  "use strict";
  const status = document.getElementById("lr-status");
  const button = document.getElementById("lr-printbtn");
  button.addEventListener("click", () => window.print());

  function fail(message) {
    status.textContent = message;
  }

  chrome.storage.local.get("lireaderPrintHTML", (stored) => {
    const html = stored && stored.lireaderPrintHTML;
    chrome.storage.local.remove("lireaderPrintHTML");
    if (!html) {
      fail("Nothing to print. Return to the article and choose Save as PDF again.");
      return;
    }
    const parsed = new DOMParser().parseFromString(html, "text/html");
    document.title = parsed.title || "LiReader";
    parsed.querySelectorAll("style").forEach((node) => document.head.appendChild(node));
    const article = document.createElement("div");
    article.innerHTML = parsed.body ? parsed.body.innerHTML : "";
    document.body.appendChild(article);
    const images = Array.from(document.images || []);
    const waits = images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    });
    const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
    Promise.race([Promise.all(waits), timeout]).then(() => {
      status.textContent = "Choose “Save as PDF” in the print dialog.";
      setTimeout(() => window.print(), 60);
    });
  });
})();
