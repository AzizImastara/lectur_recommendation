import { getUser } from "../auth";
import { setRoute } from "../router";
import { renderHeader, setupHeaderListeners } from "../components/header";

export function renderDashboardDosen() {
  const user = getUser();
  if (!user) {
    setRoute("login");
    return;
  }

  const app = document.querySelector<HTMLDivElement>("#app")!;

  app.innerHTML = `
    <!-- Header -->
    ${renderHeader("dashboard")}

    <div class="dashboard-container">
      <section class="welcome-section">
        <h2 class="welcome-text">Selamat Datang, ${user.name}!</h2>
        <p class="welcome-subtitle">Dashboard Dosen - Kelola profil dan publikasi Anda</p>
      </section>

      <div class="dashboard-grid">
        <div class="dashboard-card">
          <h3>📊 Statistik</h3>
          <p>Total Mahasiswa Bimbingan: <strong>0</strong></p>
          <p>Total Publikasi: <strong>0</strong></p>
        </div>

        <div class="dashboard-card">
          <h3>📝 Kelola Profil</h3>
          <p>Update informasi profil, bidang penelitian, dan publikasi Anda.</p>
          <button class="btn btn-primary">Edit Profil</button>
        </div>

        <div class="dashboard-card">
          <h3>👥 Mahasiswa Bimbingan</h3>
          <p>Lihat daftar mahasiswa yang Anda bimbing.</p>
          <button class="btn btn-primary">Lihat Daftar</button>
        </div>
      </div>
    </div>
  `;

  setupHeaderListeners({
    onLogout: () => {},
    onProfile: () => {
      setRoute("profile");
      window.dispatchEvent(new CustomEvent("routechange"));
    },
    onDashboard: () => {
      // Already on dashboard
    },
  });
}
