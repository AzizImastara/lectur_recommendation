import { getUser } from "../auth";
import { setRoute } from "../router";
import { renderHeader, setupHeaderListeners } from "../components/header";

export function renderDashboardAdmin(onLogout: () => void) {
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
        <p class="welcome-subtitle">Super Admin Dashboard - Kelola sistem rekomendasi</p>
      </section>

      <div class="dashboard-grid">
        <div class="dashboard-card">
          <h3>👥 Kelola Pengguna</h3>
          <p>Kelola data mahasiswa, dosen, dan admin.</p>
          <button class="btn btn-primary">Kelola Pengguna</button>
        </div>

        <div class="dashboard-card">
          <h3>📊 Statistik Sistem</h3>
          <p>Lihat statistik penggunaan sistem.</p>
          <button class="btn btn-primary">Lihat Statistik</button>
        </div>

        <div class="dashboard-card">
          <h3>⚙️ Pengaturan Sistem</h3>
          <p>Konfigurasi sistem rekomendasi.</p>
          <button class="btn btn-primary">Pengaturan</button>
        </div>

        <div class="dashboard-card">
          <h3>📝 Kelola Dosen</h3>
          <p>Tambah, edit, atau hapus data dosen.</p>
          <button class="btn btn-primary">Kelola Dosen</button>
        </div>
      </div>
    </div>
  `;

  setupHeaderListeners({
    onLogout,
    onProfile: () => {
      alert("Halaman profile akan segera tersedia");
    },
    onDashboard: () => {
      // Already on dashboard
    },
  });
}
