import { getUser } from "../auth";
import { setRoute } from "../router";
import { renderHeader, setupHeaderListeners } from "../components/header";
import { api, ApiError } from "../api";

interface ProfileState {
  interests: string[];
  inputValue: string;
  error: string | null;
  success: string | null;
  isEditing: boolean;
  loading: boolean;
}

const state: ProfileState = {
  interests: [],
  inputValue: "",
  error: null,
  success: null,
  isEditing: false,
  loading: false,
};

// Load interests from localStorage
function loadInterests(): void {
  const user = getUser();
  if (user) {
    const saved = localStorage.getItem(`interests_${user.id}`);
    if (saved) {
      try {
        state.interests = JSON.parse(saved);
      } catch {
        state.interests = [];
      }
    }
  }
}

// Save interests to localStorage
function saveInterests(): void {
  const user = getUser();
  if (user) {
    localStorage.setItem(
      `interests_${user.id}`,
      JSON.stringify(state.interests)
    );
  }
}

export function renderProfileMahasiswa() {
  const user = getUser();
  if (!user) {
    setRoute("login");
    return;
  }

  // Load saved interests
  loadInterests();

  renderUI();
}

function renderUI() {
  const user = getUser();
  if (!user) return;

  const app = document.querySelector<HTMLDivElement>("#app")!;

  // Get user additional data - try multiple possible field names
  const nim = (user as any).nim || (user as any).NIM || "";
  const major =
    (user as any).major ||
    (user as any).Major ||
    (user as any).program_studi ||
    "";
  const noHp =
    (user as any).noHp ||
    (user as any).noHP ||
    (user as any).phone ||
    (user as any).phone_number ||
    "";
  const email = user.email || (user as any).email_address || "";
  // Make sure name is not email - try name_mahasiswa first for mahasiswa
  const userName =
    (user as any).name_mahasiswa ||
    (user.name && user.name !== email ? user.name : "") ||
    (user as any).full_name ||
    "";

  app.innerHTML = `
    <!-- Header -->
    ${renderHeader("profile")}

    <div class="dashboard-container">
      ${
        state.error
          ? `
        <div class="alert alert-error">
          ${state.error}
          <button id="closeErrorProfile" class="close-btn">×</button>
        </div>
      `
          : ""
      }

      ${
        state.success
          ? `
        <div class="alert alert-success">
          ${state.success}
          <button id="closeSuccessProfile" class="close-btn">×</button>
        </div>
      `
          : ""
      }

      <!-- Profile Information Section -->
      <section class="profile-section">
        <div class="profile-card">
          <h2 class="section-title-large">Informasi Profile</h2>
          <p class="section-subtitle">Kelola profile dan minat penelitian Anda</p>
          
          <div class="profile-form">
            <div class="profile-form-row">
              <div class="profile-form-group">
                <label for="profileName">Nama</label>
                <input 
                  type="text" 
                  id="profileName" 
                  class="profile-input" 
                  ${
                    state.isEditing
                      ? 'style="background-color: white; color: black;"'
                      : ""
                  }
                  value="${userName}" 
                  ${!state.isEditing ? "disabled" : "required"}
                />
              </div>
              
              <div class="profile-form-group">
                <label for="profileNIM">NIM</label>
                <input 
                  type="text" 
                  id="profileNIM" 
                  class="profile-input" 
                  value="${nim}" 
                  disabled
                />
              </div>
            </div>

            <div class="profile-form-row">
              <div class="profile-form-group">
                <label for="profileEmail">Email</label>
                <input 
                  type="email" 
                  id="profileEmail" 
                  class="profile-input" 
                  ${
                    state.isEditing
                      ? 'style="background-color: white; color: black;"'
                      : ""
                  }
                  value="${email}" 
                  ${!state.isEditing ? "disabled" : "required"}
                />
              </div>
              
              <div class="profile-form-group">
                <label for="profilePhone">Nomor Telepon</label>
                <input 
                  type="text" 
                  id="profilePhone" 
                  class="profile-input" 
                  ${
                    state.isEditing
                      ? 'style="background-color: white; color: black;"'
                      : ""
                  }
                  value="${noHp}" 
                  ${!state.isEditing ? "disabled" : ""}
                />
              </div>
            </div>

            <div class="profile-form-row">
              <div class="profile-form-group">
                <label for="profileMajor">Jurusan</label>
                <input 
                  type="text" 
                  id="profileMajor" 
                  class="profile-input" 
                  ${
                    state.isEditing
                      ? 'style="background-color: white; color: black;"'
                      : ""
                  }
                  value="${major}" 
                  ${!state.isEditing ? "disabled" : ""}
                />
              </div>
            </div>

            <div class="profile-actions">
              ${
                !state.isEditing
                  ? `<button class="btn btn-success" id="btnEditProfile">✏️ Edit Profil</button>`
                  : `
                <button type="button" class="btn btn-secondary" id="btnCancelEdit">Batal</button>
                <button type="button" class="btn btn-success" id="btnSaveProfile" ${
                  state.loading ? "disabled" : ""
                }>
                  ${state.loading ? "Menyimpan..." : "💾 Simpan Perubahan"}
                </button>
              `
              }
            </div>
          </div>
        </div>
      </section>

      <!-- Interest Topics Section -->
      <section class="interests-section">
        <div class="interests-card">
          <h2 class="section-title-large">Minat Topik Anda!</h2>
          <p class="section-subtitle">
            Topik ini digunakan untuk mencocokkan Anda dengan Dosen Pembimbing
          </p>
          
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
    </div>
  `;

  setupEventListeners();
  // Setup header listeners with navigation
  setupHeaderListeners({
    onLogout: () => {},
    onProfile: () => {
      // Already on profile page
    },
    onDashboard: () => {
      setRoute("dashboard");
      window.dispatchEvent(new CustomEvent("routechange"));
    },
  });
}

function setupEventListeners() {
  // Close alerts
  document.getElementById("closeError")?.addEventListener("click", () => {
    state.error = null;
    renderUI();
  });

  document
    .getElementById("closeErrorProfile")
    ?.addEventListener("click", () => {
      state.error = null;
      renderUI();
    });

  document
    .getElementById("closeSuccessProfile")
    ?.addEventListener("click", () => {
      state.success = null;
      renderUI();
    });

  // Edit profile button
  document.getElementById("btnEditProfile")?.addEventListener("click", () => {
    state.isEditing = true;
    state.error = null;
    state.success = null;
    renderUI();
  });

  // Cancel edit button
  document.getElementById("btnCancelEdit")?.addEventListener("click", () => {
    state.isEditing = false;
    state.error = null;
    renderUI();
  });

  // Save profile button
  document
    .getElementById("btnSaveProfile")
    ?.addEventListener("click", handleSaveProfile);

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
      saveInterests();
      renderUI();
    });
  });
}

function handleAddInterest() {
  const interestInput = document.getElementById(
    "interestInput"
  ) as HTMLInputElement;
  const value = interestInput?.value.trim();

  if (!value) {
    state.error = "Minat penelitian tidak boleh kosong";
    renderUI();
    return;
  }

  if (state.interests.includes(value)) {
    state.error = "Minat penelitian ini sudah ditambahkan";
    renderUI();
    return;
  }

  state.interests.push(value);
  state.inputValue = "";
  state.error = null;
  if (interestInput) {
    interestInput.value = "";
  }

  saveInterests();
  renderUI();
}

async function handleSaveProfile() {
  const user = getUser();
  if (!user) return;

  // Get form values
  const name = (document.getElementById("profileName") as HTMLInputElement)
    ?.value;
  const email = (document.getElementById("profileEmail") as HTMLInputElement)
    ?.value;
  const noHp = (document.getElementById("profilePhone") as HTMLInputElement)
    ?.value;
  const major = (document.getElementById("profileMajor") as HTMLInputElement)
    ?.value;

  if (!name || !email) {
    state.error = "Nama dan Email harus diisi";
    renderUI();
    return;
  }

  state.loading = true;
  state.error = null;
  state.success = null;
  renderUI();

  try {
    // Update profile via API
    const updateData = {
      name,
      email,
      noHp,
      major,
    };

    // Call API to update own profile
    await api.updateMyProfileMahasiswa(updateData);

    // Update local user data after successful API call
    const updatedUser = {
      ...user,
      name,
      email,
      noHp,
      major,
    };
    localStorage.setItem("user", JSON.stringify(updatedUser));

    state.success = "Profil berhasil diperbarui";
    state.isEditing = false;
  } catch (error) {
    console.error("Update profile error:", error);
    if (error instanceof ApiError) {
      state.error = error.message || "Gagal memperbarui profil";
    } else {
      state.error = "Gagal memperbarui profil. Silakan coba lagi.";
    }
  } finally {
    state.loading = false;
    renderUI();
  }
}
