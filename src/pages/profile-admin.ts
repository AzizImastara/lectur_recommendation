import { getUser } from "../auth";
import { setRoute } from "../router";
import { renderHeader, setupHeaderListeners } from "../components/header";
import { ApiError } from "../api";

interface AdminProfileState {
  isEditing: boolean;
  error: string | null;
  success: string | null;
  loading: boolean;
  formData: {
    name: string;
    email: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
}

const state: AdminProfileState = {
  isEditing: false,
  error: null,
  success: null,
  loading: false,
  formData: {
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  },
};

function formatError(err: unknown): string {
  try {
    if (err instanceof ApiError) {
      const data = (err as any).data || {};

      if (Array.isArray(data?.detail)) {
        const errors = data.detail.map((d: any) => {
          if (d?.msg) {
            const field = Array.isArray(d?.loc) ? d.loc[d.loc.length - 1] : "";
            return field ? `${field}: ${d.msg}` : d.msg;
          }
          return d?.message || JSON.stringify(d);
        });
        return errors.join("; ");
      }

      if (typeof data?.detail === "string") return data.detail;
      if (data?.message && typeof data.message === "string")
        return data.message;

      const msg = err.message as unknown;
      if (typeof msg === "string" && msg.trim() && msg !== "[object Object]") {
        return msg;
      }

      if (Object.keys(data).length) {
        return JSON.stringify(data);
      }
      return "Terjadi kesalahan pada server";
    }
    if (err && typeof err === "object") {
      const anyErr = err as any;
      if (typeof anyErr.message === "string" && anyErr.message.trim()) {
        return anyErr.message;
      }
      if (anyErr.detail) return String(anyErr.detail);
      if (anyErr.error) return String(anyErr.error);
      return JSON.stringify(anyErr);
    }
    return String(err ?? "Terjadi kesalahan yang tidak diketahui");
  } catch (formatErr) {
    console.error("Error in formatter:", formatErr);
    return "Terjadi kesalahan yang tidak diketahui";
  }
}

export function renderProfileAdmin() {
  const user = getUser();
  if (!user) {
    setRoute("login");
    return;
  }

  // Initialize form data with current user info
  state.formData.name = user.name || "";
  state.formData.email = user.email || "";

  renderUI();
}

function renderUI() {
  const user = getUser();
  if (!user) return;

  const app = document.querySelector<HTMLDivElement>("#app")!;

  // Get user data
  const userName = user.name || "";
  const email = user.email || "";

  app.innerHTML = `
    ${renderHeader("profile")}

    <div class="dashboard-container">
      ${
        state.error
          ? `
        <div class="alert alert-error">
          <strong>Error:</strong> ${state.error}
          <button id="closeError" class="close-btn">×</button>
        </div>
      `
          : ""
      }

      ${
        state.success
          ? `
        <div class="alert alert-success">
          <strong>Sukses:</strong> ${state.success}
          <button id="closeSuccess" class="close-btn">×</button>
        </div>
      `
          : ""
      }

      <!-- Profile Information Section -->
      <section class="profile-section">
        <div class="profile-card">
          <h2 class="section-title-large">Informasi Profile Admin</h2>
          <p class="section-subtitle">Kelola informasi akun Super Administrator</p>
          
          ${
            state.isEditing ? renderEditForm() : renderViewMode(userName, email)
          }
        </div>
      </section>

      <!-- System Statistics Section -->
      <section class="interests-section">
        <div class="interests-card">
          <h2 class="section-title-large">Statistik Sistem</h2>
          <p class="section-subtitle">Informasi role dan akses akun Anda</p>
          
          <div class="profile-form">
            <div class="profile-form-row">
              <div class="profile-form-group">
                <label>Role</label>
                <input 
                  type="text" 
                  class="profile-input" 
                  value="Super Administrator" 
                  disabled
                />
              </div>
              
              <div class="profile-form-group">
                <label>Status</label>
                <input 
                  type="text" 
                  class="profile-input" 
                  value="✅ Aktif" 
                  disabled
                />
              </div>
            </div>

            <div class="profile-form-row">
              <div class="profile-form-group">
                <label>Akses Level</label>
                <input 
                  type="text" 
                  class="profile-input" 
                  value="Full Control" 
                  disabled
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  setupEventListeners();
  setupHeaderListeners({
    onLogout: () => {},
    onProfile: () => {
      // Already on profile
    },
    onDashboard: () => {
      setRoute("dashboard");
    },
  });
}

function renderViewMode(userName: string, email: string): string {
  return `
    <div class="profile-form">
      <div class="profile-form-row">
        <div class="profile-form-group">
          <label for="profileName">Nama</label>
          <input 
            type="text" 
            id="profileName" 
            class="profile-input" 
            value="${userName}" 
            disabled
          />
        </div>
        
        <div class="profile-form-group">
          <label for="profileEmail">Email</label>
          <input 
            type="email" 
            id="profileEmail" 
            class="profile-input" 
            value="${email}" 
            disabled
          />
        </div>
      </div>

      <div class="profile-form-row">
        <div class="profile-form-group">
          <label for="profileRole">Role</label>
          <input 
            type="text" 
            id="profileRole" 
            class="profile-input" 
            value="Super Administrator" 
            disabled
          />
        </div>
      </div>

      <div class="profile-actions">
        <button class="btn btn-success" id="btnEdit">✏️ Edit Profil</button>
      </div>
    </div>
  `;
}

function renderEditForm(): string {
  return `
    <form id="profileForm" class="profile-form">
      <div class="profile-form-row">
        <div class="profile-form-group">
          <label for="inputName">Nama Lengkap</label>
          <input 
            type="text" 
            id="inputName" 
            class="profile-input" 
            style="background-color: white; color: black;"
            value="${state.formData.name}" 
            required 
          />
        </div>
        
        <div class="profile-form-group">
          <label for="inputEmail">Email</label>
          <input 
            type="email" 
            id="inputEmail" 
            class="profile-input" 
            style="background-color: white; color: black;"
            value="${state.formData.email}" 
            required 
          />
        </div>
      </div>

      <div class="profile-form-divider">
        <h3>Ubah Password (Opsional)</h3>
        <p class="section-subtitle">Kosongkan jika tidak ingin mengubah password</p>
      </div>

      <div class="profile-form-row">
        <div class="profile-form-group">
          <label for="inputCurrentPassword">Password Saat Ini</label>
          <input 
            type="password" 
            id="inputCurrentPassword" 
            class="profile-input" 
            style="background-color: white; color: black;"
            placeholder="Masukkan password saat ini"
          />
        </div>
        
        <div class="profile-form-group">
          <label for="inputNewPassword">Password Baru</label>
          <input 
            type="password" 
            id="inputNewPassword" 
            class="profile-input" 
            style="background-color: white; color: black;"
            placeholder="Masukkan password baru"
            minlength="6"
          />
        </div>
      </div>

      <div class="profile-form-row">
        <div class="profile-form-group">
          <label for="inputConfirmPassword">Konfirmasi Password Baru</label>
          <input 
            type="password" 
            id="inputConfirmPassword" 
            class="profile-input" 
            style="background-color: white; color: black;"
            placeholder="Ulangi password baru"
            minlength="6"
          />
        </div>
      </div>

      <div class="profile-actions">
        <button type="button" class="btn btn-secondary" id="btnCancel">Batal</button>
        <button type="submit" class="btn btn-success" ${
          state.loading ? "disabled" : ""
        }>
          ${state.loading ? "Menyimpan..." : "💾 Simpan Perubahan"}
        </button>
      </div>
    </form>
  `;
}

function setupEventListeners() {
  // Close alerts
  document.getElementById("closeError")?.addEventListener("click", () => {
    state.error = null;
    renderUI();
  });

  document.getElementById("closeSuccess")?.addEventListener("click", () => {
    state.success = null;
    renderUI();
  });

  // Edit button
  document.getElementById("btnEdit")?.addEventListener("click", () => {
    state.isEditing = true;
    state.error = null;
    state.success = null;
    renderUI();
  });

  // Cancel button
  document.getElementById("btnCancel")?.addEventListener("click", () => {
    state.isEditing = false;
    state.error = null;
    state.formData.currentPassword = "";
    state.formData.newPassword = "";
    state.formData.confirmPassword = "";
    renderUI();
  });

  // Form submit
  document
    .getElementById("profileForm")
    ?.addEventListener("submit", handleSubmit);
}

async function handleSubmit(e: Event) {
  e.preventDefault();

  const form = e.target as HTMLFormElement;
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const user = getUser();
  if (!user) return;

  // Get form values
  const name = (document.getElementById("inputName") as HTMLInputElement).value;
  const email = (document.getElementById("inputEmail") as HTMLInputElement)
    .value;
  const currentPassword = (
    document.getElementById("inputCurrentPassword") as HTMLInputElement
  ).value;
  const newPassword = (
    document.getElementById("inputNewPassword") as HTMLInputElement
  ).value;
  const confirmPassword = (
    document.getElementById("inputConfirmPassword") as HTMLInputElement
  ).value;

  // Validate password change
  if (newPassword || confirmPassword || currentPassword) {
    if (!currentPassword) {
      state.error = "Password saat ini harus diisi untuk mengubah password";
      renderUI();
      return;
    }

    if (newPassword !== confirmPassword) {
      state.error = "Password baru dan konfirmasi password tidak cocok";
      renderUI();
      return;
    }

    if (newPassword.length < 6) {
      state.error = "Password baru minimal 6 karakter";
      renderUI();
      return;
    }
  }

  state.loading = true;
  state.error = null;
  state.success = null;
  renderUI();

  try {
    // Update profile data
    const updateData: any = {
      name,
      email,
    };

    // Add password fields if provided
    if (currentPassword && newPassword) {
      updateData.currentPassword = currentPassword;
      updateData.newPassword = newPassword;
    }

    // Note: You may need to implement the updateProfile API endpoint
    // For now, we'll use a placeholder
    // await api.updateProfile(updateData);

    // Update local user data
    const updatedUser = { ...user, name, email };
    localStorage.setItem("user", JSON.stringify(updatedUser));

    state.success = "Profil berhasil diperbarui";
    state.isEditing = false;
    state.formData.currentPassword = "";
    state.formData.newPassword = "";
    state.formData.confirmPassword = "";
  } catch (error) {
    console.error("Update profile error:", error);
    state.error = formatError(error);
  } finally {
    state.loading = false;
    renderUI();
  }
}
