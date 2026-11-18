// Offer release installation only after a click, and keep the loaded page
// intact until its reader chooses Reload after the target server is healthy.
(() => {
  "use strict";

  const loadedBuild = document.querySelector('meta[name="chorus-ui-build"]')?.content || "";
  let uiChanged = false;
  let available = null;
  let progress = null;

  // Render the existing banner for changed assets, an available release, or
  // the accepted update. Readiness takes precedence over an asset-change hint.
  function render() {
    const banner = document.getElementById("update-banner");
    const message = document.getElementById("update-message");
    const release = document.getElementById("update-release");
    const install = document.getElementById("btn-update-chorus");
    const reload = document.getElementById("btn-reload-ui");
    const busy = progress?.status === "installing" || progress?.status === "restarting";
    const ready = progress?.status === "ready";
    const showReload = ready || progress?.status === "conflict" || (!progress && uiChanged);
    banner.hidden = !progress && !uiChanged && !available;
    banner.setAttribute("aria-busy", String(busy));
    reload.hidden = !showReload;
    install.hidden = showReload || (!progress && !available);
    install.disabled = busy;
    release.hidden = !available || showReload;
    if (available) release.href = available.release_url;
    install.textContent = progress?.status === "restart_failed" ? "Check again"
      : progress?.status === "error" ? "Try again"
      : busy ? "Updating…" : "Update & Restart";
    if (progress?.status === "installing") message.textContent = "Updating Chorus and its integrations…";
    else if (progress?.status === "restarting") message.textContent = `Waiting for Chorus v${progress.version} to restart…`;
    else if (ready) message.textContent = `Chorus v${progress.version} is running. Reload when you are ready.`;
    else if (progress) message.textContent = progress.error;
    else if (uiChanged) message.textContent = "Dashboard updated";
    else if (available) message.textContent = `Chorus v${available.latest_version} is available`;
  }

  // A dashboard hosted by an embedding application may have no updater.
  // A failed availability check leaves coordination and existing reloads usable.
  async function check() {
    try {
      const response = await fetch("/update", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      if (typeof result.update_available !== "boolean" || typeof result.latest_version !== "string"
        || !result.latest_version || typeof result.release_url !== "string") return;
      const release = new URL(result.release_url);
      if (release.protocol !== "https:") return;
      available = result.update_available ? result : null;
      render();
    } catch {
      // Missing routes, offline servers, and unavailable GitHub checks are optional notices.
    }
  }

  // A 202 response fixes the target version. Poll only that readiness fact for
  // the server's 30-second stop/start window; retrying it never installs again.
  async function waitForServer(version) {
    progress = { status: "restarting", version };
    render();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      while (!controller.signal.aborted) {
        try {
          const response = await fetch("/healthz", { cache: "no-store", signal: controller.signal });
          if (response.ok && response.headers.get("X-Chorus-Version") === version) {
            progress = { status: "ready", version };
            render();
            return;
          }
        } catch {
          // Connection errors are expected while the old listener is replaced.
        }
        if (!controller.signal.aborted) await new Promise(resolve => setTimeout(resolve, 250));
      }
      progress = {
        status: "restart_failed", version,
        error: `Chorus v${version} has not become healthy yet. Check chorus status, then check again.`,
      };
      render();
    } finally {
      clearTimeout(timeout);
    }
  }

  // The button is the user's approval. The server owns download, installation,
  // setup, and restart; a browser request never retries those writes by itself.
  async function install() {
    progress = { status: "installing" };
    render();
    try {
      const response = await fetch("/update", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ version: available.latest_version }),
      });
      if (!response.ok) {
        const message = response.headers.get("Content-Type")?.includes("application/json")
          ? (await response.json()).error : await response.text();
        if (response.status === 409) {
          progress = { status: "conflict", error: `${message}. Reload to check the current version.` };
          render();
          return;
        }
        throw new Error(message || `HTTP ${response.status}`);
      }
      const result = await response.json();
      if (typeof result.version !== "string" || !result.version) throw new Error("The server did not report an update version.");
      if (response.status === 200 && result.status === "up_to_date") {
        progress = { status: "ready", version: result.version };
        render();
      } else if (response.status === 202 && result.status === "restarting") {
        await waitForServer(result.version);
      } else {
        throw new Error("The server did not confirm the update.");
      }
    } catch (error) {
      progress = { status: "error", error: `Could not complete the Chorus update: ${error.message}. Try again when ready.` };
      render();
    }
  }

  // Observe the same response header as before, including 304 responses.
  // Release availability must not hide an existing manual dashboard reload.
  function checkUIBuild(response) {
    const build = response.headers.get("X-Chorus-UI-Build");
    if (!loadedBuild || !build) return;
    uiChanged = loadedBuild !== build;
    render();
  }

  // Called once by the dashboard after its composer and event handlers exist.
  function start() {
    document.getElementById("btn-reload-ui").addEventListener("click", () => window.location.reload());
    document.getElementById("btn-update-chorus").addEventListener("click", () => {
      if (progress?.status === "installing" || progress?.status === "restarting") return;
      return progress?.status === "restart_failed" ? waitForServer(progress.version) : install();
    });
    return check();
  }

  window.ChorusUpdate = { start, checkUIBuild };
})();
