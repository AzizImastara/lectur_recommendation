import { api, ApiError } from "../api";
import type { Lecturer } from "../api";
import { getUser } from "../auth";
import { setRoute } from "../router";
import { renderHeader, setupHeaderListeners } from "../components/header";

interface DashboardState {
  interests: string[];
  recommendations: Lecturer[];
  loading: boolean;
  error: string | null;
  inputValue: string;
}

const state: DashboardState = {
  interests: [],
  recommendations: [],
  loading: false,
  error: null,
  inputValue: "",
};

export function renderDashboardMahasiswa() {
  const user = getUser();
  if (!user) {
    setRoute("login");
    return;
  }

  // Load interests from localStorage (synced with profile)
  const saved = localStorage.getItem(`interests_${user.id}`);
  if (saved) {
    try {
      state.interests = JSON.parse(saved);
    } catch {
      state.interests = [];
    }
  }

  // Load recommendations if interests exist
  if (state.interests.length > 0) {
    loadRecommendations();
  }

  renderUI();
}

function renderUI() {
  const user = getUser();
  if (!user) return;

  const app = document.querySelector<HTMLDivElement>("#app")!;

  app.innerHTML = `
    <!-- Header -->
    ${renderHeader("dashboard")}

    <div class="dashboard-container">
      <!-- Welcome Section -->
      <section class="welcome-section">
        <h2 class="welcome-text">Selamat Datang, ${user.name}!</h2>
        <p class="welcome-subtitle">Temukan dosen pembimbing yang tepat untuk penelitianmu disini!</p>
      </section>

      <!-- Research Interests Section -->
      <section class="interests-section">
        <div class="interests-card">
          <h3 class="section-title">
            🔍 Cari minat penelitian Anda!
          </h3>
          <p class="section-subtitle">
            Tambahkan topik penelitian Anda untuk mendapatkan rekomendasi dosen yang cocok!
          </p>
          
          <div class="interests-input-container">
            <div class="interests-tags">
              ${state.interests
                .map(
                  (interest, index) => `
                <span class="interest-tag">
                  ${interest}
                  <button class="tag-remove" data-index="${index}">×</button>
                </span>
              `
                )
                .join("")}
            </div>
            <div class="interests-input-group">
              <input 
                type="text" 
                id="interestInput"
                class="interest-input"
                style="background-color: white; color: black;"
                placeholder="Contoh: Cybersecurity, Machine Learning, Support Vector Machine, Dsb..."
                value="${state.inputValue}"
              />
              <button id="addInterestBtn" class="btn btn-success">
                + Tambah
              </button>
            </div>
          </div>
        </div>
      </section>

      ${
        state.error
          ? `
        <div class="alert alert-error">
          ${state.error}
          <button id="closeError" class="close-btn">×</button>
        </div>
      `
          : ""
      }

      <!-- Recommendations Section -->
      ${
        state.recommendations.length > 0
          ? `
        <section class="recommendations-section">
          <h2 class="section-title-large">
            ✨ Berikut rekomendasi Dosen Pembimbing untuk ${user.name}!
          </h2>
          <div class="recommendations-grid">
            ${state.recommendations
              .map((lecturer) => renderLecturerCard(lecturer))
              .join("")}
          </div>
        </section>
      `
          : state.interests.length > 0 && !state.loading
          ? `
        <section class="recommendations-section">
          <p class="no-recommendations">Belum ada rekomendasi. Coba tambahkan minat penelitian Anda.</p>
        </section>
      `
          : ""
      }

      ${
        state.loading
          ? `
        <div class="loading">
          <div class="spinner"></div>
          <p>Memuat rekomendasi...</p>
        </div>
      `
          : ""
      }
    </div>
  `;

  setupEventListeners();
  // Setup header listeners after rendering
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

function renderLecturerCard(lecturer: Lecturer): string {
  const bidangPenelitian =
    lecturer.bidang_penelitian ||
    (lecturer.expertise ? [lecturer.expertise] : []);
  const publikasi = lecturer.publikasi || [];
  const phone = lecturer.phone || "";

  return `
    <div class="lecturer-recommendation-card">
      <div class="lecturer-card-header">
        <h3 class="lecturer-name">${lecturer.name}</h3>
      </div>
      <div class="lecturer-card-body">
        ${
          lecturer.department
            ? `
          <p class="lecturer-info">
            <strong>Departemen:</strong> ${lecturer.department}
          </p>
        `
            : ""
        }
        
        ${
          bidangPenelitian.length > 0
            ? `
          <div class="lecturer-section">
            <strong class="section-label">Bidang Penelitian:</strong>
            <div class="research-tags">
              ${bidangPenelitian
                .map(
                  (field) => `
                <span class="research-tag">${field}</span>
              `
                )
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        ${
          publikasi.length > 0
            ? `
          <div class="lecturer-section">
            <strong class="section-label">Publikasi:</strong>
            <div class="publications-list">
              ${publikasi
                .slice(0, 2)
                .map(
                  (pub) => `
                <div class="publication-item">
                  <p class="publication-title">${pub.title || "N/A"}</p>
                  <p class="publication-meta">
                    ${pub.journal || ""} ${pub.year ? `• ${pub.year}` : ""}
                  </p>
                </div>
              `
                )
                .join("")}
              ${
                publikasi.length > 2
                  ? `
                <p class="publication-more">+${
                  publikasi.length - 2
                } publikasi</p>
              `
                  : ""
              }
            </div>
          </div>
        `
            : ""
        }
      </div>
      <div class="lecturer-card-actions">
        <button class="btn btn-primary btn-outline" data-lecturer-id="${
          lecturer.id
        }">
          Lihat Profil Lengkap Dosen
        </button>
        ${
          phone
            ? `
          <a href="https://wa.me/${phone.replace(
            /[^0-9]/g,
            ""
          )}" target="_blank" class="btn btn-success btn-whatsapp">
            💬 Hubungi
          </a>
        `
            : `
          <button class="btn btn-success btn-whatsapp" disabled>
            💬 Hubungi
          </button>
        `
        }
      </div>
    </div>
  `;
}

function setupEventListeners() {
  // Add interest
  const addBtn = document.getElementById("addInterestBtn");
  const interestInput = document.getElementById(
    "interestInput"
  ) as HTMLInputElement;

  addBtn?.addEventListener("click", handleAddInterest);
  interestInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddInterest();
    }
  });

  // Remove interest tags
  document.querySelectorAll(".tag-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = parseInt((e.target as HTMLElement).dataset.index || "0");
      state.interests.splice(index, 1);
      if (state.interests.length > 0) {
        loadRecommendations();
      } else {
        state.recommendations = [];
      }
      renderUI();
    });
  });

  // Close error
  document.getElementById("closeError")?.addEventListener("click", () => {
    state.error = null;
    renderUI();
  });

  // Lecturer card actions
  document.querySelectorAll("[data-lecturer-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLElement).dataset.lecturerId;
      // TODO: Show lecturer profile modal
      alert(`Lihat profil dosen ID: ${id}`);
    });
  });
}

function handleAddInterest() {
  const interestInput = document.getElementById(
    "interestInput"
  ) as HTMLInputElement;
  const value = interestInput?.value.trim();

  if (!value) return;

  if (state.interests.includes(value)) {
    state.error = "Minat penelitian ini sudah ditambahkan";
    renderUI();
    return;
  }

  state.interests.push(value);
  state.inputValue = "";
  interestInput.value = "";

  loadRecommendations();
  renderUI();
}

async function loadRecommendations() {
  const user = getUser();
  if (!user || state.interests.length === 0) return;

  state.loading = true;
  state.error = null;
  renderUI();

  try {
    const response = await api.getRecommendations({
      student_id: user.id,
      student_name: user.name,
      interests: state.interests,
    });

    state.recommendations = response.recommendations || [];
  } catch (error) {
    if (error instanceof ApiError) {
      state.error = error.message;
    } else {
      state.error = "Gagal memuat rekomendasi";
    }
    console.error("Error loading recommendations:", error);
  } finally {
    state.loading = false;
    renderUI();
  }
}
