import { getUser } from "../auth";
import { setRoute } from "../router";
import { renderHeader, setupHeaderListeners } from "../components/header";
import { api, ApiError, type Mahasiswa, type Lecturer } from "../api";

interface AdminState {
  currentTab: "mahasiswa" | "dosen" | "overview";
  mahasiswaList: Mahasiswa[];
  dosenList: Lecturer[];
  loading: boolean;
  error: string | null;
  success: string | null;
  editingUser: { type: "mahasiswa" | "dosen"; id: string; data: any } | null;
  deletingUser: {
    type: "mahasiswa" | "dosen";
    id: string;
    name: string;
  } | null;
}

const state: AdminState = {
  currentTab: "overview",
  mahasiswaList: [],
  dosenList: [],
  loading: false,
  error: null,
  success: null,
  editingUser: null,
  deletingUser: null,
};

function formatError(err: unknown): string {
  try {
    if (err instanceof ApiError) {
      const data = (err as any).data || {};

      // Handle FastAPI validation errors (422)
      if (Array.isArray(data?.detail)) {
        const errors = data.detail.map((d: any) => {
          if (d?.msg) {
            // Include field name if available
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

      // Fallback to ApiError message
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
      // Try to extract useful info from error object
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

export function renderDashboardAdmin() {
  const user = getUser();
  if (!user) {
    setRoute("login");
    return;
  }

  renderUI();
}

function renderUI() {
  const user = getUser();
  if (!user) return;

  const app = document.querySelector<HTMLDivElement>("#app")!;

  const overviewActive = state.currentTab === "overview" ? "active" : "";
  const mahasiswaActive = state.currentTab === "mahasiswa" ? "active" : "";
  const dosenActive = state.currentTab === "dosen" ? "active" : "";

  app.innerHTML = `
    <!-- Header -->
    ${renderHeader("dashboard")}

    <div class="dashboard-container">
      <section class="welcome-section">
        <h2 class="welcome-text">Selamat Datang, ${user.name}!</h2>
        <p class="welcome-subtitle">Super Admin Dashboard - Kelola sistem rekomendasi</p>
      </section>

      <!-- Tab Navigation -->
      <div class="admin-tabs">
        <button class="tab-btn ${overviewActive}" id="tabOverview">📊 Overview</button>
        <button class="tab-btn ${mahasiswaActive}" id="tabMahasiswa">👨‍🎓 Kelola Mahasiswa</button>
        <button class="tab-btn ${dosenActive}" id="tabDosen">👨‍🏫 Kelola Dosen</button>
      </div>

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

      ${
        state.success
          ? `
        <div class="alert alert-success">
          ${state.success}
          <button id="closeSuccess" class="close-btn">×</button>
        </div>
      `
          : ""
      }

      ${
        state.currentTab === "overview"
          ? renderOverview()
          : state.currentTab === "mahasiswa"
          ? renderMahasiswaTab()
          : renderDosenTab()
      }
    </div>

    <!-- Edit Modal -->
    ${state.editingUser ? renderEditModal() : ""}

    <!-- Delete Confirmation Modal -->
    ${state.deletingUser ? renderDeleteModal() : ""}
  `;

  setupEventListeners();
  setupHeaderListeners({
    onLogout: () => {},
    onProfile: () => {
      setRoute("profile");
    },
    onDashboard: () => {
      // Already on dashboard
    },
  });
}

function renderOverview(): string {
  return `
    <div class="admin-overview">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${state.mahasiswaList.length || "..."}</div>
          <div class="stat-label">Total Mahasiswa</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${state.dosenList.length || "..."}</div>
          <div class="stat-label">Total Dosen</div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="dashboard-card">
          <h3>👥 Kelola Mahasiswa</h3>
          <p>Tambah, edit, atau hapus data mahasiswa</p>
          <button class="btn btn-primary" id="goToMahasiswa">Kelola Mahasiswa</button>
        </div>

        <div class="dashboard-card">
          <h3>👨‍🏫 Kelola Dosen</h3>
          <p>Kelola data dosen pembimbing</p>
          <button class="btn btn-primary" id="goToDosen">Kelola Dosen</button>
        </div>

      </div>
    </div>
  `;
}

function renderEditModal(): string {
  if (!state.editingUser) return "";

  const { type, data } = state.editingUser;
  const isMahasiswa = type === "mahasiswa";

  return `
    <div class="modal-overlay" id="editModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${isMahasiswa ? "Edit Data Mahasiswa" : "Edit Data Dosen"}</h3>
          <button class="modal-close" id="closeEditModal">×</button>
        </div>
        <div class="modal-body">
          <form id="editForm">
            <div class="form-group">
              <label for="editName">Nama ${
                isMahasiswa ? "Mahasiswa" : "Dosen"
              }</label>
              <input type="text" id="editName" class="form-input" value="${
                data.name || ""
              }" required />
            </div>
            
            <div class="form-group">
              <label for="editEmail">Email</label>
              <input type="email" id="editEmail" class="form-input" value="${
                data.email || ""
              }" required />
            </div>
            
            ${
              isMahasiswa
                ? `
              <div class="form-group">
                <label for="editNim">NIM</label>
                <input type="text" id="editNim" class="form-input" value="${
                  data.nim || ""
                }" required />
              </div>
              
              <div class="form-group">
                <label for="editMajor">Program Studi</label>
                <input type="text" id="editMajor" class="form-input" value="${
                  data.major || ""
                }" required />
              </div>
              
              <div class="form-group">
                <label for="editNoHp">No HP</label>
                <input type="text" id="editNoHp" class="form-input" value="${
                  data.noHp || ""
                }" required />
              </div>
            `
                : `
              <div class="form-group">
                <label for="editNidn">NIDN (min. 10 karakter)</label>
                <input type="text" id="editNidn" class="form-input" value="${
                  data.nidn || ""
                }" minlength="10" maxlength="20" pattern="[0-9]*" title="NIDN harus berisi minimal 10 digit angka" />
              </div>

              <div class="form-group">
                <label for="editMajorDosen">Jurusan</label>
                <input type="text" id="editMajorDosen" class="form-input" value="${
                  data.major || ""
                }" />
              </div>
              
              <div class="form-group">
                <label for="editNoHp">No HP</label>
                <input type="text" id="editNoHp" class="form-input" value="${
                  data.noHp || data.phone || ""
                }" />
              </div>
            `
            }
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelEdit">Batal</button>
          <button class="btn btn-primary" id="confirmEdit">Simpan Perubahan</button>
        </div>
      </div>
    </div>
  `;
}

function renderDeleteModal(): string {
  if (!state.deletingUser) return "";

  const { type, name } = state.deletingUser;

  return `
    <div class="modal-overlay" id="deleteModal">
      <div class="modal-content modal-small">
        <div class="modal-header">
          <h3>Konfirmasi Hapus</h3>
          <button class="modal-close" id="closeDeleteModal">×</button>
        </div>
        <div class="modal-body">
          <p>Apakah Anda yakin ingin menghapus <strong>${name}</strong>?</p>
          <p class="text-danger">Tindakan ini tidak dapat dibatalkan.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="cancelDelete">Batal</button>
          <button class="btn btn-danger" id="confirmDelete">Hapus</button>
        </div>
      </div>
    </div>
  `;
}

function renderMahasiswaTab(): string {
  if (state.loading) {
    return `
      <div class="loading">
        <div class="spinner"></div>
        <p>Memuat data mahasiswa...</p>
      </div>
    `;
  }

  return `
    <div class="admin-section">
      <div class="section-header">
        <h2 class="section-title">Daftar Mahasiswa</h2>
      </div>

      ${
        !Array.isArray(state.mahasiswaList) || state.mahasiswaList.length === 0
          ? `<p class="no-data">Belum ada data mahasiswa</p>`
          : `
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>NIM</th>
                <th>Program Studi</th>
                <th>No HP</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${state.mahasiswaList
                .map((m, index) => {
                  // Use id, user_id, _id, nim, or email as unique identifier
                  const uniqueId =
                    m.id || m.user_id || m._id || m.nim || m.email || index;
                  return `
                <tr>
                  <td>${m.name || "-"}</td>
                  <td>${m.email || "-"}</td>
                  <td>${m.nim || "-"}</td>
                  <td>${m.major || "-"}</td>
                  <td>${m.noHp || "-"}</td>
                  <td>
                    <button class="btn-icon btn-edit" data-id="${uniqueId}" data-type="mahasiswa" title="Edit">✏️</button>
                    <button class="btn-icon btn-delete" data-id="${uniqueId}" data-type="mahasiswa" title="Hapus">🗑️</button>
                  </td>
                </tr>
              `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `
      }
    </div>
  `;
}

function renderDosenTab(): string {
  if (state.loading) {
    return `
      <div class="loading">
        <div class="spinner"></div>
        <p>Memuat data dosen...</p>
      </div>
    `;
  }

  return `
    <div class="admin-section">
      <div class="section-header">
        <h2 class="section-title">Daftar Dosen</h2>
      </div>

      ${
        !Array.isArray(state.dosenList) || state.dosenList.length === 0
          ? `<p class="no-data">Belum ada data dosen</p>`
          : `
        <div class="table-responsive">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>NIDN</th>
                <th>Jurusan</th>
                <th>Topik Penelitian</th>
                <th>No HP</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${state.dosenList
                .map((d, index) => {
                  // Use id, user_id, _id, email as unique identifier
                  const uniqueId =
                    d.id || d.user_id || d._id || d.email || index;
                  return `
                <tr>
                  <td>${d.name || "-"}</td>
                  <td>${d.email || "-"}</td>
                  <td>${d.nidn || "-"}</td>
                  <td>${d.major || "-"}</td>
                  <td>${
                    (d as any).isTopic
                      ? (d as any).isTopic.join(", ")
                      : d.expertise || "-"
                  }</td>
                  <td>${(d as any).noHp || d.phone || "-"}</td>
                  <td>
                    <button class="btn-icon btn-edit" data-id="${uniqueId}" data-type="dosen" title="Edit">✏️</button>
                    <button class="btn-icon btn-delete" data-id="${uniqueId}" data-type="dosen" title="Hapus">🗑️</button>
                  </td>
                </tr>
              `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      `
      }
    </div>
  `;
}

function setupEventListeners() {
  // Tab navigation
  document.getElementById("tabOverview")?.addEventListener("click", () => {
    state.currentTab = "overview";
    renderUI();
  });

  document
    .getElementById("tabMahasiswa")
    ?.addEventListener("click", async () => {
      state.currentTab = "mahasiswa";
      await loadMahasiswa();
      renderUI();
    });

  document.getElementById("tabDosen")?.addEventListener("click", async () => {
    state.currentTab = "dosen";
    await loadDosen();
    renderUI();
  });

  // Quick navigation
  document
    .getElementById("goToMahasiswa")
    ?.addEventListener("click", async () => {
      state.currentTab = "mahasiswa";
      await loadMahasiswa();
      renderUI();
    });

  document.getElementById("goToDosen")?.addEventListener("click", async () => {
    state.currentTab = "dosen";
    await loadDosen();
    renderUI();
  });

  // Close alerts
  document.getElementById("closeError")?.addEventListener("click", () => {
    state.error = null;
    renderUI();
  });

  document.getElementById("closeSuccess")?.addEventListener("click", () => {
    state.success = null;
    renderUI();
  });

  // Use event delegation for edit and delete buttons
  const app = document.querySelector("#app");

  app?.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;

    // Handle delete button click
    if (
      target.classList.contains("btn-delete") ||
      target.closest(".btn-delete")
    ) {
      const btn = target.classList.contains("btn-delete")
        ? target
        : target.closest(".btn-delete");
      const id = (btn as HTMLElement)?.dataset.id;
      const type = (btn as HTMLElement)?.dataset.type as "mahasiswa" | "dosen";

      if (!id || id === "undefined") {
        console.error("Invalid ID:", id);
        return;
      }

      if (type === "mahasiswa") {
        const mahasiswa = state.mahasiswaList.find(
          (m) =>
            String(m.id || m.user_id || m._id || m.nim || m.email) ===
            String(id)
        );

        if (!mahasiswa) {
          console.error("Mahasiswa not found for ID:", id);
          return;
        }

        state.deletingUser = {
          type: "mahasiswa",
          id: String(id),
          name: mahasiswa.name || "User",
        };
      } else {
        const dosen = state.dosenList.find(
          (d) => String(d.id || d.user_id || d._id || d.email) === String(id)
        );
        console.log("Found dosen:", dosen);

        if (!dosen) {
          console.error("Dosen not found for ID:", id);
          return;
        }

        state.deletingUser = {
          type: "dosen",
          id: String(id),
          name: dosen.name || "User",
        };
      }
      renderUI();
    }

    // Handle edit button click
    if (target.classList.contains("btn-edit") || target.closest(".btn-edit")) {
      const btn = target.classList.contains("btn-edit")
        ? target
        : target.closest(".btn-edit");
      const type = (btn as HTMLElement)?.dataset.type as "mahasiswa" | "dosen";
      const id = (btn as HTMLElement)?.dataset.id;

      if (!id || id === "undefined") {
        console.error("Invalid ID:", id);
        return;
      }

      if (type === "mahasiswa") {
        const mahasiswa = state.mahasiswaList.find(
          (m) =>
            String(m.id || m.user_id || m._id || m.nim || m.email) ===
            String(id)
        );

        if (!mahasiswa) {
          console.error("Mahasiswa not found for ID:", id);
          return;
        }

        state.editingUser = {
          type: "mahasiswa",
          id: String(id),
          data: { ...mahasiswa },
        };
      } else {
        const dosen = state.dosenList.find(
          (d) => String(d.id || d.user_id || d._id || d.email) === String(id)
        );

        if (!dosen) {
          return;
        }

        state.editingUser = {
          type: "dosen",
          id: String(id),
          data: { ...dosen },
        };
      }
      renderUI();
    }
  });

  // Modal event listeners
  setupModalListeners();
}

function setupModalListeners() {
  // Edit Modal
  document.getElementById("closeEditModal")?.addEventListener("click", () => {
    state.editingUser = null;
    renderUI();
  });

  document.getElementById("cancelEdit")?.addEventListener("click", () => {
    state.editingUser = null;
    renderUI();
  });

  document
    .getElementById("confirmEdit")
    ?.addEventListener("click", async () => {
      if (!state.editingUser) return;

      const { type, id } = state.editingUser;
      const form = document.getElementById("editForm") as HTMLFormElement;

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      try {
        if (type === "mahasiswa") {
          const data = {
            name: (document.getElementById("editName") as HTMLInputElement)
              .value,
            email: (document.getElementById("editEmail") as HTMLInputElement)
              .value,
            nim: (document.getElementById("editNim") as HTMLInputElement).value,
            major: (document.getElementById("editMajor") as HTMLInputElement)
              .value,
            noHp: (document.getElementById("editNoHp") as HTMLInputElement)
              .value,
          };
          await api.updateMahasiswa(id, data);
          state.success = `Mahasiswa ${
            state.editingUser?.data?.name || ""
          } berhasil diupdate`;
          state.editingUser = null;
          await loadMahasiswa();
        } else {
          const data = {
            name: (document.getElementById("editName") as HTMLInputElement)
              .value,
            email: (document.getElementById("editEmail") as HTMLInputElement)
              .value,
            nidn: (document.getElementById("editNidn") as HTMLInputElement)
              ?.value,
            major: (
              document.getElementById("editMajorDosen") as HTMLInputElement
            )?.value,
            noHp: (document.getElementById("editNoHp") as HTMLInputElement)
              ?.value,
          };
          await api.updateDosen(id, data);
          state.success = `Dosen ${
            state.editingUser?.data?.name || ""
          } berhasil diupdate`;
          state.editingUser = null;
          await loadDosen();
        }
      } catch (error) {
        console.error("❌ EDIT Error:", error);
        state.error = formatError(error);
        renderUI();
      }
    });

  // Delete Modal
  document.getElementById("closeDeleteModal")?.addEventListener("click", () => {
    state.deletingUser = null;
    renderUI();
  });

  document.getElementById("cancelDelete")?.addEventListener("click", () => {
    state.deletingUser = null;
    renderUI();
  });

  document
    .getElementById("confirmDelete")
    ?.addEventListener("click", async () => {
      if (!state.deletingUser) return;

      const { type, id } = state.deletingUser;

      try {
        if (type === "mahasiswa") {
          await api.deleteMahasiswa(id);
          state.success = `Mahasiswa ${
            state.deletingUser?.name || ""
          } berhasil dihapus`;
          state.deletingUser = null;
          await loadMahasiswa();
        } else {
          await api.deleteDosen(id);
          state.success = `Dosen ${
            state.deletingUser?.name || ""
          } berhasil dihapus`;
          state.deletingUser = null;
          await loadDosen();
        }
      } catch (error) {
        console.error("❌ DELETE Error:", error);
        state.error = formatError(error);
        renderUI();
      }
    });

  // Close modal on overlay click
  document.getElementById("editModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      state.editingUser = null;
      renderUI();
    }
  });

  document.getElementById("deleteModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      state.deletingUser = null;
      renderUI();
    }
  });
}

async function loadMahasiswa() {
  state.loading = true;
  state.error = null;
  // Don't clear success message during reload
  renderUI();

  try {
    const response = await api.getAllMahasiswa();

    // Handle berbagai format response dari API
    if (Array.isArray(response)) {
      state.mahasiswaList = response;
    } else if (response && typeof response === "object") {
      if (Array.isArray((response as any).data)) {
        state.mahasiswaList = (response as any).data;
      } else if (Array.isArray((response as any).mahasiswa)) {
        state.mahasiswaList = (response as any).mahasiswa;
      } else if (Array.isArray((response as any).users)) {
        state.mahasiswaList = (response as any).users;
      } else {
        state.mahasiswaList = [];
      }
    } else {
      state.mahasiswaList = [];
    }
  } catch (error) {
    state.error = formatError(error) || "Gagal memuat data mahasiswa";
  } finally {
    state.loading = false;
    renderUI();
  }
}

async function loadDosen() {
  state.loading = true;
  state.error = null;
  // Don't clear success message during reload
  renderUI();

  try {
    const response = await api.getAllDosen();

    // Handle berbagai format response dari API
    if (Array.isArray(response)) {
      state.dosenList = response;
    } else if (response && typeof response === "object") {
      if (Array.isArray((response as any).data)) {
        state.dosenList = (response as any).data;
      } else if (Array.isArray((response as any).dosen)) {
        state.dosenList = (response as any).dosen;
      } else if (Array.isArray((response as any).users)) {
        state.dosenList = (response as any).users;
      } else {
        state.dosenList = [];
      }
    } else {
      state.dosenList = [];
    }
  } catch (error) {
    state.error = formatError(error) || "Gagal memuat data dosen";
  } finally {
    state.loading = false;
    renderUI();
  }
}
