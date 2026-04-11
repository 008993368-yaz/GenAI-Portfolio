export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      console.info("Service worker registered successfully.");
    } catch (error) {
      console.warn("Service worker registration failed:", error);
    }
  });
}
