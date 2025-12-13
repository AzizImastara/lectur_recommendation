import { getUser } from "../auth";
import { setRoute } from "../router";
import { renderHeader, setupHeaderListeners } from "../components/header";
import { api, ApiError } from "../api";
import type { SupervisionRequest } from "../api";

interface DashboardState {
  requests: SupervisionRequest[];
  loading: boolean;
  error: string | null;
}

const state: DashboardState = {
  requests: [],
  loading: false,
  error: null,
};

export async function renderDashboardDosen() {
  const user = getUser();
  if (!user) {
    setRoute("login");
    return;
  }

  await loadSupervisionRequests();
  renderUI();
}

async function loadSupervisionRequests() {
  state.loading = true;
  state.error = null;

  try {
    const response = await api.getSupervisionRequests();
    console.log("Dosen supervision requests response:", response);

    // Handle different response formats
    if (Array.isArray(response)) {
      state.requests = response;
    } else if (response && typeof response === "object") {
      if ((response as any).data && Array.isArray((response as any).data)) {
        state.requests = (response as any).data;
      } else if (
        (response as any).requests &&
        Array.isArray((response as any).requests)
      ) {
        state.requests = (response as any).requests;
      } else {
        // Might be a single object or different structure
        state.requests = [];
      }
    } else {
      state.requests = [];
    }

    console.log("Filtered pending requests:", state.requests);

    // Normalize request data structure
    state.requests = state.requests.map((req: any) => ({
      id: req._id || req.id,
      student_id: req.mahasiswaId || req.student_id || req.mahasiswa_id,
      dosen_id: req.dosenId || req.dosen_id,
      topic: req.topic || req.topik || req.isTopic || "",
      message: req.note || req.message,
      status: req.status,
      created_at: req.createdAt || req.created_at,
      // Try multiple possible fields for student name that backend may return
      student_name:
        req.student_name || req.nama || req.name || req.mahasiswaName || req.mahasiswa_name || req.name_mahasiswa || req.full_name || req.username || null,
    }));

    // Filter only pending requests
    state.requests = state.requests.filter(
      (req) => req.status === "pending" || !req.status
    );

    // Fetch student names for each request
    for (const request of state.requests) {
      if (request.student_id && !request.student_name) {
        try {
          const mahasiswa = await api.getMahasiswa(String(request.student_id));
          if (mahasiswa) {
            // Prefer several possible fields for student name
            request.student_name =
              mahasiswa.name || mahasiswa.nama || mahasiswa.full_name || mahasiswa.name_mahasiswa || mahasiswa.username || mahasiswa.email || String(request.student_id);
          }
        } catch (error) {
          console.error(`Failed to fetch mahasiswa ${request.student_id}:`, error);
          // Fallback to id string so UI doesn't show generic 'Mahasiswa' nickname
          request.student_name = String(request.student_id);
        }
      }
    }
  } catch (error) {
    console.error("Error loading supervision requests:", error);
    state.error = "Gagal memuat data pengajuan mahasiswa";
  } finally {
    state.loading = false;
    // Merge any local pending submissions targeted to this dosen (optimistic local entries)
    try {
      const pendingKey = `local_pending_submissions`;
      const raw = localStorage.getItem(pendingKey);
      if (raw) {
        const localItems = JSON.parse(raw || "[]");
        const myId = getUser()?.id;
        // Append items where lecturerId matches current dosen (user)
        const extras = localItems
          .filter((it: any) => String(it.lecturerId) === String(myId))
          .map((it: any) => ({
            id: it.id,
            student_id: it.studentId,
            dosen_id: it.lecturerId,
            topic: it.topic,
            message: it.message,
            status: it.status,
            created_at: it.created_at,
            student_name: it.studentName,
            _local: true,
          }));

        if (extras.length > 0) {
          // prepend so local pending appears at top
          state.requests = [...extras, ...state.requests];
        }
      }
    } catch (e) {
      console.warn("Failed to merge local pending submissions into dosen dashboard:", e);
    }
  }
}

async function loadMyStudents() {
  const students = await api.getMySupervisedStudents();

  const container = document.getElementById("studentList");
  if (!container) return;

  container.innerHTML = "";

  students.forEach((student) => {
    container.innerHTML += `
      <div class="p-3 border rounded mb-2">
        <p class="font-semibold">${student.name}</p>
        <p class="text-sm text-gray-600">${student.nim}</p>
      </div>
    `;
  });
}

// Listen for BroadcastChannel events from student tabs and update requests live
try {
  const bc = new BroadcastChannel("lecturer_submissions");
  bc.addEventListener("message", (ev) => {
    try {
      const data = ev.data;
      if (!data) return;
      if (data.type === "new_local_submission") {
        const myId = getUser()?.id;
        if (String(data.item.lecturerId) === String(myId)) {
          state.requests = [
            {
              id: data.item.id,
              student_id: data.item.studentId,
              dosen_id: data.item.lecturerId,
              topic: data.item.topic,
              message: data.item.message,
              status: data.item.status,
              created_at: data.item.created_at,
              student_name: data.item.studentName,
              _local: true,
            },
            ...state.requests,
          ];
          renderUI();
        }
      } else if (data.type === "applied_flag") {
        // mark existing requests UI if necessary
        const myId = getUser()?.id;
        if (String(data.lecturerId) === String(myId)) {
          // no-op for now; reload can pick up local storage
          renderUI();
        }
      }
    } catch (e) {
      console.warn("Error handling BroadcastChannel message:", e);
    }
  });
} catch (e) {
  // BroadcastChannel not available in some environments
}

function renderUI() {
  const user = getUser();
  if (!user) return;

  const app = document.querySelector<HTMLDivElement>("#app")!;

  app.innerHTML = `
    <!-- Header -->
    ${renderHeader("dashboard")}

    <div class="dashboard-container">
      <section class="welcome-section">
        <h2 class="welcome-text">Selamat Datang, ${user.name}!</h2>
        <p class="welcome-subtitle">Dashboard Dosen - Kelola profil dan mahasiswa bimbingan Anda</p>
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

      <!-- Supervision Requests Section -->
      <section class="students-section">
        <div class="students-card">
          <h2 class="section-title-large">📋 Pengajuan Mahasiswa Bimbingan</h2>
          <p class="section-subtitle">Mahasiswa yang mengajukan Anda sebagai dosen pembimbing</p>
          
          ${
            state.loading
              ? `
            <div class="loading">
              <div class="spinner"></div>
              <p>Memuat data pengajuan...</p>
            </div>
          `
              : state.requests.length > 0
              ? `
            <div class="requests-list">
              ${state.requests
                .map((request) => renderRequestCard(request))
                .join("")}
            </div>
          `
              : `
            <p class="no-data">Belum ada mahasiswa yang mengajukan Anda sebagai dosen pembimbing.</p>
          `
          }
        </div>
      </section>
    </div>

    <!-- Confirmation Modal -->
    <div id="confirmModal" class="modal" style="display: none;">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3 id="confirmModalTitle">Konfirmasi</h3>
          <button id="closeConfirmModal" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <p id="confirmModalMessage" style="padding: 1rem;"></p>
          <div style="display: flex; justify-content: flex-end; gap: 0.5rem; padding: 0 1rem 1rem;">
            <button id="cancelConfirm" class="btn btn-secondary">Batal</button>
            <button id="confirmAction" class="btn btn-primary">Ya, Lanjutkan</button>
          </div>
        </div>
      </div>
    </div>
  `;

  loadMyStudents();

  setupEventListeners();
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

function renderRequestCard(request: SupervisionRequest): string {
  const studentName = request.student_name || "Mahasiswa";
  const createdAt = request.created_at
    ? new Date(request.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return `
    <div class="request-card" style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; background: white;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
        <div>
          <h4 style="margin: 0 0 0.5rem 0; color: #1e293b; font-size: 1.1rem;">
            👤 ${studentName}
          </h4>
          ${
            createdAt
              ? `<p style="color: #64748b; font-size: 0.875rem; margin: 0;">📅 ${createdAt}</p>`
              : ""
          }
        </div>
        <span style="background: #fbbf24; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
          ⏳ Pending
        </span>
      </div>
      
      <div style="margin-bottom: 1rem;">
        <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #475569;">Topik Penelitian:</p>
        <div class="publication-tags">
          ${(request.topic || "")
            .split(",")
            .map(
              (topic) => `<span class="publication-tag">${topic.trim()}</span>`
            )
            .join("")}
        </div>
      </div>

      ${
        request.message
          ? `
        <div style="margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #667eea;">
          <p style="margin: 0 0 0.5rem 0; font-weight: 600; color: #475569;">Pesan:</p>
          <p style="margin: 0; color: #64748b; font-style: italic;">"${request.message}"</p>
        </div>
      `
          : ""
      }

      <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
        <button class="btn btn-danger btn-reject" data-request-id="${
          request.id
        }" data-student-name="${studentName}">
          ❌ Tolak
        </button>
        <button class="btn btn-success btn-accept" data-request-id="${
          request.id
        }" data-student-name="${studentName}">
          ✅ Terima
        </button>
      </div>
    </div>
  `;
}

function setupEventListeners() {
  // Close error
  document.getElementById("closeError")?.addEventListener("click", () => {
    state.error = null;
    renderUI();
  });

  // Accept buttons
  document.querySelectorAll(".btn-accept").forEach((btn) => {
    btn.addEventListener("click", () => {
      const requestId = (btn as HTMLElement).dataset.requestId;
      const studentName = (btn as HTMLElement).dataset.studentName;
      if (requestId) {
        showConfirmModal(
          "Terima Mahasiswa",
          `Apakah Anda yakin ingin menerima ${studentName} sebagai mahasiswa bimbingan?`,
          () => handleAcceptRequest(requestId)
        );
      }
    });
  });

  // Reject buttons
  document.querySelectorAll(".btn-reject").forEach((btn) => {
    btn.addEventListener("click", () => {
      const requestId = (btn as HTMLElement).dataset.requestId;
      const studentName = (btn as HTMLElement).dataset.studentName;
      if (requestId) {
        showConfirmModal(
          "Tolak Mahasiswa",
          `Apakah Anda yakin ingin menolak pengajuan dari ${studentName}?`,
          () => handleRejectRequest(requestId)
        );
      }
    });
  });

  // Modal close buttons
  document
    .getElementById("closeConfirmModal")
    ?.addEventListener("click", closeConfirmModal);
  document
    .getElementById("cancelConfirm")
    ?.addEventListener("click", closeConfirmModal);

  // Close modal when clicking outside
  const modal = document.getElementById("confirmModal");
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeConfirmModal();
    }
  });
}

let confirmCallback: (() => void) | null = null;

function showConfirmModal(
  title: string,
  message: string,
  callback: () => void
) {
  const modal = document.getElementById("confirmModal");
  const titleEl = document.getElementById("confirmModalTitle");
  const messageEl = document.getElementById("confirmModalMessage");
  const confirmBtn = document.getElementById("confirmAction");

  if (!modal || !titleEl || !messageEl) return;

  titleEl.textContent = title;
  messageEl.textContent = message;
  confirmCallback = callback;

  confirmBtn?.removeEventListener("click", handleConfirmAction);
  confirmBtn?.addEventListener("click", handleConfirmAction);

  modal.style.display = "flex";
}

function closeConfirmModal() {
  const modal = document.getElementById("confirmModal");
  if (modal) {
    modal.style.display = "none";
  }
  confirmCallback = null;
}

function handleConfirmAction() {
  if (confirmCallback) {
    confirmCallback();
  }
  closeConfirmModal();
}

async function handleAcceptRequest(requestId: string) {
  const confirmBtn = document.getElementById(
    "confirmAction"
  ) as HTMLButtonElement;
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Memproses...";
  }

  try {
    const response = await api.acceptSupervisionRequest(requestId);
    console.log("Accept response:", response);

    // 🔽 INI ADALAH LOKASI PERUBAHAN #5 (SUDAH BENAR)
    await loadSupervisionRequests(); // refresh pengajuan
    await loadMyStudents();          // masuk ke list bimbingan
    renderUI();                      // render ulang UI

    showSuccessMessage(
      "Mahasiswa berhasil diterima sebagai mahasiswa bimbingan."
    );

  } catch (error) {
    console.error("Error accepting request:", error);
    let errorMessage = "Gagal menerima mahasiswa. Silakan coba lagi.";

    if (error instanceof ApiError) {
      errorMessage = error.message;
    } else if (error && typeof error === "object") {
      // Try to extract message from error object
      const err = error as any;
      if (err.message) {
        errorMessage = err.message;
      } else if (err.detail) {
        errorMessage =
          typeof err.detail === "string"
            ? err.detail
            : JSON.stringify(err.detail);
      } else if (err.error) {
        errorMessage =
          typeof err.error === "string" ? err.error : JSON.stringify(err.error);
      } else {
        errorMessage = `Gagal menerima mahasiswa: ${JSON.stringify(error)}`;
      }
    }

    state.error = errorMessage;
    renderUI();
  }
}

async function handleRejectRequest(requestId: string) {
  const confirmBtn = document.getElementById(
    "confirmAction"
  ) as HTMLButtonElement;
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Memproses...";
  }

  try {
    const response = await api.rejectSupervisionRequest(requestId);
    console.log("Reject response:", response);

    showSuccessMessage("Pengajuan mahasiswa berhasil ditolak.");
    await loadSupervisionRequests();
    renderUI();
  } catch (error) {
    console.error("Error rejecting request:", error);
    let errorMessage = "Gagal menolak pengajuan. Silakan coba lagi.";

    if (error instanceof ApiError) {
      errorMessage = error.message;
    } else if (error && typeof error === "object") {
      // Try to extract message from error object
      const err = error as any;
      if (err.message) {
        errorMessage = err.message;
      } else if (err.detail) {
        errorMessage =
          typeof err.detail === "string"
            ? err.detail
            : JSON.stringify(err.detail);
      } else if (err.error) {
        errorMessage =
          typeof err.error === "string" ? err.error : JSON.stringify(err.error);
      } else {
        errorMessage = `Gagal menolak pengajuan: ${JSON.stringify(error)}`;
      }
    }

    state.error = errorMessage;
    renderUI();
  }
}

function showSuccessMessage(message: string) {
  const existingAlert = document.querySelector(".alert-success");
  if (existingAlert) {
    existingAlert.remove();
  }

  const dashboardContainer = document.querySelector(".dashboard-container");
  if (!dashboardContainer) return;

  const alertHtml = `
    <div class="alert alert-success" style="background-color: #d1fae5; color: #065f46; margin-bottom: 1rem;">
      ${message}
      <button class="close-btn" onclick="this.parentElement.remove()">×</button>
    </div>
  `;

  dashboardContainer.insertAdjacentHTML("afterbegin", alertHtml);

  setTimeout(() => {
    document.querySelector(".alert-success")?.remove();
  }, 5000);
}
