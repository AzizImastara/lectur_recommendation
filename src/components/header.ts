import { clearAuth } from "../auth";
import { setRoute } from "../router";

export interface HeaderCallbacks {
  onLogout: () => void;
  onProfile?: () => void;
  onDashboard?: () => void;
}

/**
 * Renders the application header component
 * @param activeRoute - The currently active route to highlight
 * @returns HTML string for the header
 */
export function renderHeader(
  activeRoute: "dashboard" | "profile" = "dashboard"
): string {
  const dashboardActive = activeRoute === "dashboard" ? "active" : "";
  const profileActive = activeRoute === "profile" ? "active" : "";

  return `
    <header class="app-header">
      <div class="header-left">
        <div class="logo-square">🎓</div>
        <h1 class="header-title">Sistem Rekomendasi Dosen Pembimbing!</h1>
      </div>
      <nav class="header-nav">
        <a href="#" id="navDashboard" class="nav-link ${dashboardActive}">Dashboard</a>
        <a href="#" id="navProfile" class="nav-link ${profileActive}">Profile</a>
        <a href="#" id="navLogout" class="nav-link logout-link">
          Logout <span>→</span>
        </a>
      </nav>
    </header>
  `;
}

/**
 * Sets up event listeners for header navigation
 * @param callbacks - Object containing callback functions for navigation actions
 */
export function setupHeaderListeners(callbacks: HeaderCallbacks): void {
  // Logout handler
  document.getElementById("navLogout")?.addEventListener("click", (e) => {
    e.preventDefault();
    clearAuth();
    setRoute("login");
    callbacks.onLogout();
  });

  // Profile handler
  document.getElementById("navProfile")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (callbacks.onProfile) {
      callbacks.onProfile();
    } else {
      alert("Halaman profile akan segera tersedia");
    }
  });

  // Dashboard handler
  document.getElementById("navDashboard")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (callbacks.onDashboard) {
      callbacks.onDashboard();
    }
  });
}
