import { api, ApiError } from "../api";
import { saveAuth, type UserRole } from "../auth";
import { setRoute } from "../router";

export function renderRegister(onRegisterSuccess: () => void) {
  const app = document.querySelector<HTMLDivElement>("#app")!;

  let error: string | null = null;
  let loading = false;
  let registerType: "mahasiswa" | "dosen" = "mahasiswa";

  function updateUI() {
    app.innerHTML = `
      <div class="login-container">
        <div class="login-card">
          <div class="login-header">
            <div class="logo-icon">🎓</div>
            <h1>Daftar Akun Baru</h1>
            <p>Silakan isi form di bawah untuk mendaftar</p>
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

          <div class="form-group">
            <label>Daftar Sebagai</label>
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
              <button 
                type="button"
                id="btnMahasiswa"
                class="btn ${
                  registerType === "mahasiswa" ? "btn-primary" : "btn-secondary"
                }"
                style="flex: 1;"
              >
                Mahasiswa
              </button>
              <button 
                type="button"
                id="btnDosen"
                class="btn ${
                  registerType === "dosen" ? "btn-primary" : "btn-secondary"
                }"
                style="flex: 1;"
              >
                Dosen
              </button>
            </div>
          </div>

          <form id="registerForm" class="login-form">
            <div class="form-group">
              <label for="email">Email</label>
              <input 
                type="email" 
                id="email" 
                name="email"
                placeholder="Masukkan email"
                required
                autocomplete="email"
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
                autocomplete="new-password"
                style="background-color: white; color: black;"
              />
            </div>

            <div class="form-group">
              <label for="confirmPassword">Konfirmasi Password</label>
              <input 
                type="password" 
                id="confirmPassword" 
                name="confirmPassword"
                placeholder="Masukkan ulang password"
                required
                autocomplete="new-password"
                style="background-color: white; color: black;"
              />
            </div>

            <div class="form-group">
              <label for="name">Nama Lengkap</label>
              <input 
                type="text" 
                id="name" 
                name="name"
                placeholder="Masukkan nama lengkap"
                required
                style="background-color: white; color: black;"
              />
            </div>

            ${
              registerType === "mahasiswa"
                ? `
              <div class="form-group">
                <label for="nim">NIM</label>
                <input 
                  type="text" 
                  id="nim" 
                  name="nim"
                  placeholder="Masukkan NIM"
                  required
                  style="background-color: white; color: black;"
                />
              </div>
              <div class="form-group">
                <label for="major">Major / Jurusan</label>
                <input 
                  type="text" 
                  id="major" 
                  name="major"
                  placeholder="Masukkan major/jurusan"
                  required
                  style="background-color: white; color: black;"
                />
              </div>
              <div class="form-group">
                <label for="noHp">No. HP</label>
                <input 
                  type="tel" 
                  id="noHp" 
                  name="noHp"
                  placeholder="Masukkan nomor HP"
                  required
                  style="background-color: white; color: black;"
                />
              </div>
            `
                : `
              <div class="form-group">
                <label for="nidn">NIDN</label>
                <input 
                  type="text" 
                  id="nidn" 
                  name="nidn"
                  placeholder="Masukkan NIDN"
                  required
                  style="background-color: white; color: black;"
                />
              </div>
              <div class="form-group">
                <label for="noHp">No. HP</label>
                <input 
                  type="tel" 
                  id="noHp" 
                  name="noHp"
                  placeholder="Masukkan nomor HP"
                  required
                  style="background-color: white; color: black;"
                />
              </div>
              <div class="form-group">
                <label for="major">Major / Jurusan</label>
                <input 
                  type="text" 
                  id="major" 
                  name="major"
                  placeholder="Masukkan major/jurusan"
                  required
                  style="background-color: white; color: black;"
                />
              </div>
            `
            }

            <button 
              type="submit" 
              class="btn btn-primary btn-large"
              ${loading ? "disabled" : ""}
            >
              ${loading ? "⏳ Memproses..." : "📝 Daftar"}
            </button>

            <div style="text-align: center; margin-top: 20px;">
              <p style="color: #666;">
                Sudah punya akun? 
                <a href="#" id="linkLogin" style="color: #4a90e2; text-decoration: none;">
                  Login di sini
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    `;

    // Attach event listeners
    const form = document.getElementById("registerForm") as HTMLFormElement;
    form?.addEventListener("submit", handleRegister);

    const btnMahasiswa = document.getElementById("btnMahasiswa");
    const btnDosen = document.getElementById("btnDosen");
    const linkLogin = document.getElementById("linkLogin");

    btnMahasiswa?.addEventListener("click", () => {
      registerType = "mahasiswa";
      updateUI();
    });

    btnDosen?.addEventListener("click", () => {
      registerType = "dosen";
      updateUI();
    });

    linkLogin?.addEventListener("click", (e) => {
      e.preventDefault();
      setRoute("login");
      // Trigger route change - event listener di main.ts akan handle render
      window.dispatchEvent(new CustomEvent("routechange"));
    });

    const closeError = document.getElementById("closeError");
    closeError?.addEventListener("click", () => {
      error = null;
      updateUI();
    });
  }

  async function handleRegister(e: Event) {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Validation
    if (!email || !name || !password || !confirmPassword) {
      error = "Semua field wajib harus diisi";
      updateUI();
      return;
    }

    if (registerType === "mahasiswa") {
      const nim = formData.get("nim") as string;
      const major = formData.get("major") as string;
      const noHp = formData.get("noHp") as string;
      if (!nim || !major || !noHp) {
        error = "Semua field wajib harus diisi";
        updateUI();
        return;
      }
    } else {
      const nidn = formData.get("nidn") as string;
      const noHp = formData.get("noHp") as string;
      const major = formData.get("major") as string;
      if (!nidn || !noHp || !major) {
        error = "Semua field wajib harus diisi";
        updateUI();
        return;
      }
    }

    if (password !== confirmPassword) {
      error = "Password dan konfirmasi password tidak cocok";
      updateUI();
      return;
    }

    if (password.length < 6) {
      error = "Password minimal 6 karakter";
      updateUI();
      return;
    }

    loading = true;
    error = null;
    updateUI();

    // Get additional fields based on register type (declare in outer scope)
    let nidn = "";
    let nim = "";
    let major = "";
    let noHp = "";

    if (registerType === "mahasiswa") {
      nim = formData.get("nim") as string;
      major = formData.get("major") as string;
      noHp = formData.get("noHp") as string;
    } else {
      nidn = formData.get("nidn") as string;
      noHp = formData.get("noHp") as string;
      major = formData.get("major") as string;
    }

    try {
      let response;

      if (registerType === "mahasiswa") {
        response = await api.registerMahasiswa({
          email,
          password,
          name,
          nim,
          major,
          noHp, // Field name sesuai API: noHp (camelCase)
        });
      } else {
        response = await api.registerDosen({
          email,
          password,
          name,
          nidn,
          noHP: noHp, // API expects noHP (with capital H)
          major,
        });
      }

      // Debug: log response untuk melihat strukturnya
      console.log("Register response:", response);

      // Handle response yang mungkin memiliki struktur berbeda
      // Beberapa API register tidak langsung return token, jadi perlu login terpisah
      const userData = response.user || response;
      const accessToken = response.access_token;

      if (!accessToken) {
        // Jika tidak ada token, mungkin register berhasil tapi perlu login
        // Coba login otomatis dengan email dan password yang baru didaftarkan
        console.log("Token tidak ditemukan, mencoba login otomatis...");
        try {
          const loginResponse = await api.login({
            username: email,
            password: password,
          });

          const loginUserData = loginResponse.user || loginResponse;
          const loginToken = loginResponse.access_token;

          if (!loginToken) {
            throw new Error("Login otomatis gagal: Token tidak ditemukan");
          }

          // Create user object with role
          // Preserve all fields from API response
          const user = {
            ...loginUserData,
            id: loginUserData.id || loginUserData.user_id || loginUserData._id || email,
            name: loginUserData.name || 
                  loginUserData.name_dosen || 
                  loginUserData.name_mahasiswa || 
                  loginUserData.full_name || 
                  name,
            email: loginUserData.email || email,
            role: registerType as UserRole,
            // Preserve additional fields from registration
            nidn: loginUserData.nidn || loginUserData.NIDN || (registerType === "dosen" ? nidn : ""),
            nim: loginUserData.nim || loginUserData.NIM || (registerType === "mahasiswa" ? nim : ""),
            major: loginUserData.major || loginUserData.Major || loginUserData.program_studi || major,
            noHp: loginUserData.noHp || loginUserData.noHP || loginUserData.phone || loginUserData.phone_number || noHp,
            // Explicitly save name_dosen and name_mahasiswa
            name_dosen: loginUserData.name_dosen || (registerType === "dosen" ? name : ""),
            name_mahasiswa: loginUserData.name_mahasiswa || (registerType === "mahasiswa" ? name : ""),
          };

          // Save auth data
          saveAuth(loginToken, user);
          console.log("Saved user data after register (auto-login):", user);

          // Navigate to dashboard
          setRoute("dashboard");
          onRegisterSuccess();
        } catch (loginError) {
          // Jika login otomatis gagal, redirect ke login page
          console.error("Login otomatis gagal:", loginError);
          error =
            "Registrasi berhasil! Silakan login dengan email dan password Anda.";
          loading = false;
          updateUI();
          // Redirect ke login setelah 2 detik
          setTimeout(() => {
            setRoute("login");
            window.dispatchEvent(new CustomEvent("routechange"));
          }, 2000);
        }
      } else {
        // Jika ada token langsung, gunakan token tersebut
        // Get form data again for additional fields
        let nidn = "";
        let nim = "";
        let major = "";
        let noHp = "";
        
        if (registerType === "mahasiswa") {
          nim = formData.get("nim") as string;
          major = formData.get("major") as string;
          noHp = formData.get("noHp") as string;
        } else {
          nidn = formData.get("nidn") as string;
          major = formData.get("major") as string;
          noHp = formData.get("noHp") as string;
        }
        
        // Create user object with role
        // Preserve all fields from API response
        const user = {
          ...userData,
          id: userData.id || userData.user_id || userData._id || email,
          name: userData.name || 
                userData.name_dosen || 
                userData.name_mahasiswa || 
                userData.full_name || 
                name,
          email: userData.email || email,
          role: registerType as UserRole,
          // Preserve additional fields from registration
          nidn: userData.nidn || userData.NIDN || (registerType === "dosen" ? nidn : ""),
          nim: userData.nim || userData.NIM || (registerType === "mahasiswa" ? nim : ""),
          major: userData.major || userData.Major || userData.program_studi || major,
          noHp: userData.noHp || userData.noHP || userData.phone || userData.phone_number || noHp,
          // Explicitly save name_dosen and name_mahasiswa
          name_dosen: userData.name_dosen || (registerType === "dosen" ? name : ""),
          name_mahasiswa: userData.name_mahasiswa || (registerType === "mahasiswa" ? name : ""),
        };

        // Save auth data
        saveAuth(accessToken, user);
        console.log("Saved user data after register:", user);

        // Navigate to dashboard
        setRoute("dashboard");
        onRegisterSuccess();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        error = err.message || "Terjadi kesalahan saat mendaftar";
      } else if (err instanceof Error) {
        error = err.message || "Terjadi kesalahan saat mendaftar";
      } else if (typeof err === "string") {
        error = err;
      } else {
        error = "Terjadi kesalahan saat mendaftar. Silakan coba lagi.";
      }
      loading = false;
      updateUI();
    }
  }

  updateUI();
}
