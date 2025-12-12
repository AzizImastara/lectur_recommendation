import { api, ApiError } from "../api";
import { saveAuth, type UserRole } from "../auth";
import { setRoute } from "../router";

export function renderLogin(onLoginSuccess: () => void) {
  const app = document.querySelector<HTMLDivElement>("#app")!;

  let error: string | null = null;
  let loading = false;

  function updateUI() {
    app.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <div class="login-header">
            <div class="logo-icon">🎓</div>
            <h1>Sistem Rekomendasi Dosen Pembimbing</h1>
            <p>Silakan login untuk melanjutkan</p>
          </div>

          ${
            error
              ? `
            <div class="alert alert-error">
              <strong>Error:</strong> ${error}
              <button id="closeError" class="close-btn">×</button>
            </div>
          `
              : ""
          }

          <form id="loginForm" class="login-form">
            <div class="form-group">
              <label for="username">Username / Email</label>
              <input 
              type="text" 
              id="username" 
              name="username"
              placeholder="Masukkan username atau email"
              required
              autocomplete="username"
              style="background-color: white; color: black;"
            />
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input 
                type="password" 
                id="password" 
                name="password"
                placeholder="Masukkan password"
                required
                autocomplete="current-password"
                style="background-color: white; color: black;"
              />
            </div>

            <div class="form-group">
              <label for="role">Login Sebagai</label>
              <select id="role" name="role" required style="background-color: white; color: black;">
                <option value="">Pilih role</option>
                <option value="mahasiswa">Mahasiswa</option>
                <option value="dosen">Dosen</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <button 
              type="submit" 
              class="btn btn-primary btn-large"
              ${loading ? "disabled" : ""}
            >
              ${loading ? "⏳ Memproses..." : "🔐 Login"}
            </button>

            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #666;">
                Belum punya akun? 
                <a href="#" id="linkRegister" style="color: #4a90e2; text-decoration: none;">
                  Daftar di sini
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    `;

    // Attach event listeners
    const form = document.getElementById("loginForm") as HTMLFormElement;
    form?.addEventListener("submit", handleLogin);

    const linkRegister = document.getElementById("linkRegister");
    linkRegister?.addEventListener("click", (e) => {
      e.preventDefault();
      setRoute("register");
      // Trigger route change - event listener di main.ts akan handle render
      window.dispatchEvent(new CustomEvent("routechange"));
    });

    const closeError = document.getElementById("closeError");
    closeError?.addEventListener("click", () => {
      error = null;
      updateUI();
    });
  }

  async function handleLogin(e: Event) {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const username = formData.get("username") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as UserRole;

    if (!username || !password || !role) {
      error = "Semua field harus diisi";
      updateUI();
      return;
    }

    loading = true;
    error = null;
    updateUI();

    try {
      // Call login API
      const response = await api.login({ username, password });

      // Handle response yang mungkin memiliki struktur berbeda
      // Beberapa API mengembalikan user langsung, beberapa di dalam response.user
      const userData = response.user || response;
      const accessToken = response.access_token;

      if (!accessToken) {
        throw new Error("Token tidak ditemukan dalam response");
      }

      // Save token first so we can call getCurrentUser
      localStorage.setItem('auth_token', accessToken);

      // Try to get full user data from API
      let fullUserData: any = { ...userData };
      
      // First, try to preserve existing user data from localStorage if available
      // This helps maintain data between logins
      const existingUserStr = localStorage.getItem('user');
      if (existingUserStr) {
        try {
          const existingUser = JSON.parse(existingUserStr);
          // Merge existing data with new login data, preserving important fields that might not be in login response
          if (existingUser.nidn && !fullUserData.nidn && !fullUserData.NIDN) fullUserData.nidn = existingUser.nidn;
          if (existingUser.nim && !fullUserData.nim && !fullUserData.NIM) fullUserData.nim = existingUser.nim;
          if (existingUser.major && !fullUserData.major && !fullUserData.Major && !fullUserData.program_studi) fullUserData.major = existingUser.major;
          if (existingUser.noHp && !fullUserData.noHp && !fullUserData.noHP && !fullUserData.phone) fullUserData.noHp = existingUser.noHp;
          if (existingUser.name_dosen && !fullUserData.name_dosen) fullUserData.name_dosen = existingUser.name_dosen;
          if (existingUser.name_mahasiswa && !fullUserData.name_mahasiswa) fullUserData.name_mahasiswa = existingUser.name_mahasiswa;
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      // Then try to get fresh data from API
      try {
        const currentUser = await api.getCurrentUser();
        console.log("Current user data from API:", currentUser);
        // Merge: API data takes priority, but keep existing data if API doesn't have it
        fullUserData = { 
          ...fullUserData, // Keep existing merged data
          ...currentUser,  // Override with fresh API data
        };
      } catch (err) {
        console.warn("Could not fetch current user data, using login response and existing data:", err);
        // Use merged userData (from login + existing localStorage) if getCurrentUser fails
      }

      // Create user object with role from form
      // Preserve all fields from API response, especially nidn, nim, major, noHp, etc.
      const user = {
        ...fullUserData, // Include semua field lain dari response dulu
        id: fullUserData.id || fullUserData.user_id || fullUserData._id || username,
        name:
          fullUserData.name || 
          fullUserData.name_dosen || // For dosen
          fullUserData.name_mahasiswa || // For mahasiswa
          fullUserData.full_name || 
          fullUserData.username || 
          fullUserData.email || // Fallback to email if name not available
          username,
        email: fullUserData.email || fullUserData.email_address || username,
        role: role, // Override dengan role dari form
        // Preserve additional fields - prioritize API response, then existing data
        nidn: fullUserData.nidn || fullUserData.NIDN || "",
        nim: fullUserData.nim || fullUserData.NIM || "",
        major: fullUserData.major || fullUserData.Major || fullUserData.program_studi || "",
        noHp: fullUserData.noHp || fullUserData.noHP || fullUserData.phone || fullUserData.phone_number || "",
        // Preserve name_dosen and name_mahasiswa if available
        name_dosen: fullUserData.name_dosen || "",
        name_mahasiswa: fullUserData.name_mahasiswa || "",
      };

      // Save auth data with complete user information
      saveAuth(accessToken, user);
      console.log("Saved user data:", user);

      // Navigate to dashboard
      setRoute("dashboard");
      onLoginSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        error = err.message || "Terjadi kesalahan saat login";
      } else if (err instanceof Error) {
        error = err.message || "Terjadi kesalahan saat login";
      } else if (typeof err === "string") {
        error = err;
      } else {
        error = "Terjadi kesalahan saat login. Silakan coba lagi.";
      }
      loading = false;
      updateUI();
    }
  }

  updateUI();
}
