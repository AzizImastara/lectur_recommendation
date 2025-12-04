import "./style.css";
import { isAuthenticated, getUserRole } from "./auth";
import { initRoute, getCurrentRoute, setRoute } from "./router";
import { renderLogin } from "./pages/login";
import { renderRegister } from "./pages/register";
import { renderDashboardMahasiswa } from "./pages/dashboard-mahasiswa";
import { renderDashboardDosen } from "./pages/dashboard-dosen";
import { renderDashboardAdmin } from "./pages/dashboard-admin";
import { renderProfileMahasiswa } from "./pages/profile-mahasiswa";
import { renderProfileDosen } from "./pages/profile-dosen";

// Initialize route
initRoute();

// Main render function
function render() {
  const route = getCurrentRoute();
  const authenticated = isAuthenticated();

  if (!authenticated) {
    if (route === "register") {
      renderRegister(() => {
        // On register success
        setRoute("dashboard");
        render();
      });
    } else {
      renderLogin(() => {
        // On login success
        setRoute("dashboard");
        render();
      });
    }
    return;
  }

  // Render based on route and user role
  const role = getUserRole();

  // Handle profile route
  if (route === "profile") {
    if (role === "mahasiswa") {
      renderProfileMahasiswa(() => {
        // On logout
        setRoute("login");
        render();
      });
      return;
    }
    if (role === "dosen") {
      renderProfileDosen(() => {
        // On logout
        setRoute("login");
        render();
      });
      return;
    }
    // For other roles, fall through to dashboard
    setRoute("dashboard");
    render();
    return;
  }

  // Render dashboard based on user role
  switch (role) {
    case "mahasiswa":
      renderDashboardMahasiswa(() => {
        // On logout
        setRoute("login");
        render();
      });
      break;
    case "dosen":
      renderDashboardDosen(() => {
        // On logout
        setRoute("login");
        render();
      });
      break;
    case "super_admin":
      renderDashboardAdmin(() => {
        // On logout
        setRoute("login");
        render();
      });
      break;
    default:
      // Unknown role, show login
      setRoute("login");
      render();
  }
}

// Listen for route changes
window.addEventListener("routechange", () => {
  render();
});

// Initial render
render();
