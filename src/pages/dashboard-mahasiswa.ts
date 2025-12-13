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

// Save interests to localStorage
function saveInterests() {
  const user = getUser();
  if (!user) return;

  localStorage.setItem(`interests_${user.id}`, JSON.stringify(state.interests));
}

let hasSubmitted = false;

export function renderDashboardMahasiswa() {
  const user = getUser();
  if (!user) {
    setRoute("login");
    return;
  }
  
  const submissionKeyPrefix = `submission_status_${user.id}_`;

  hasSubmitted = localStorage.getItem("submission_status") === "pending";

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

    <!-- Lecturer Profile Modal -->
    <div id="lecturerModal" class="modal" style="display: none;">
      <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
          <h3 id="modalLecturerName">Profil Dosen</h3>
          <button id="closeModal" class="close-btn">×</button>
        </div>
        <div id="modalLecturerContent" class="modal-body">
          <!-- Content will be dynamically inserted -->
        </div>
      </div>
    </div>

    <!-- Submission Confirmation Modal -->
    <div id="submissionModal" class="modal" style="display: none;">
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3>Ajukan Dosen Pembimbing</h3>
          <button id="closeSubmissionModal" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <div style="padding: 1rem;">
            <p style="margin-bottom: 1rem;">
              Anda akan mengajukan <strong id="submissionDosenName"></strong> sebagai dosen pembimbing.
            </p>
            
            <div style="margin-bottom: 1rem;">
              <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #666">Topik Penelitian:</label>
              <div id="submissionTopics" class="publication-tags" style="background: #f8f9fa; padding: 0.75rem; border-radius: 8px;">
                <!-- Topics will be inserted here -->
              </div>
            </div>

            <div style="margin-bottom: 1rem;">
              <label for="submissionMessage" style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #666">
                Pesan untuk Dosen (Opsional):
              </label>
              <textarea 
                id="submissionMessage" 
                rows="4" 
                class="form-input" 
                style="width: 100%; background-color: white; color: black; resize: vertical;"
                placeholder="Tuliskan pesan Anda kepada dosen...">
              </textarea>
            </div>

            <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem;">
              <button id="cancelSubmission" class="btn btn-secondary">Batal</button>
              <button id="confirmSubmission" class="btn btn-success">Ajukan Sekarang</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const applyBtn = document.getElementById("applyBtn") as HTMLButtonElement;

  if (applyBtn) {
    if (hasSubmitted) {
      applyBtn.textContent = "Menunggu Konfirmasi";
      applyBtn.disabled = true;
      applyBtn.className =
        "bg-yellow-400 text-black cursor-not-allowed px-4 py-2 rounded";
    } else {
      applyBtn.textContent = "Ajukan Dosen";
      applyBtn.disabled = false;
      applyBtn.className =
        "bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded";
    }
  }


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

  // Calculate match percentage (score normalized to 0-100%)
  const lecturerWithScore = lecturer as any;
  const score = lecturerWithScore.score || 0;
  const maxPossibleScore = state.interests.length * 100 + 50 + 20; // max exact matches + publication bonus + active bonus
  const matchPercentage = Math.min(
    Math.round((score / maxPossibleScore) * 100),
    100
  );

  // Get match details
  const matchDetails = lecturerWithScore.matchDetails || {
    exactMatches: 0,
    partialMatches: 0,
    publicationMatches: 0,
    totalMatches: 0,
  };

  // Determine match level badge
  let matchBadge = "";
  let matchColor = "";
  if (matchPercentage >= 80) {
    matchBadge = "🌟 Sangat Cocok";
    matchColor = "#10b981"; // green
  } else if (matchPercentage >= 60) {
    matchBadge = "✨ Cocok";
    matchColor = "#3b82f6"; // blue
  } else if (matchPercentage >= 40) {
    matchBadge = "👍 Cukup Cocok";
    matchColor = "#f59e0b"; // orange
  } else {
    matchBadge = "💡 Mungkin Cocok";
    matchColor = "#6b7280"; // gray
  }

  return `
    <div class="lecturer-recommendation-card">
      <div class="lecturer-card-header">
        <div>
          <h3 class="lecturer-name">${lecturer.name}</h3>
          ${
            matchPercentage > 30
              ? `
          <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
            <span style="background: ${matchColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;">
              ${matchBadge}
            </span>
            <span style="color: #64748b; font-size: 0.85rem;">
              ${matchPercentage}% Match • ${matchDetails.totalMatches} keyword match
            </span>
          </div>
          `
              : ""
          }
        </div>
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
                .slice(0, 3)
                .map((pub) => {
                  const title = pub.isTitle || pub.title || "N/A";
                  const topic = pub.isTopic || pub.topic || "";
                  const year = pub.isYear || pub.year || "";
                  const domain = pub.isDomain || pub.domain || "";
                  const accreditation =
                    pub.isAccreditation || pub.accreditation || "";
                  const journal = pub.journal || "";

                  // Create tags from topic, domain, and accreditation
                  const tags = [];
                  if (topic) tags.push(topic);
                  if (domain && !domain.startsWith("http")) tags.push(domain);
                  if (accreditation) tags.push(accreditation);

                  return `
                <div class="publication-item">
                  <h4 class="publication-card-title">${title}</h4>
                  <p class="publication-card-meta">
                    ${
                      journal
                        ? `${journal}${year ? ` • ${year}` : ""}`
                        : year
                        ? `Tahun: ${year}`
                        : ""
                    }
                  </p>
                  ${
                    domain && domain.startsWith("http")
                      ? `
                    <p class="publication-link" style="font-size: 0.85rem; color: #667eea; margin: 0.5rem 0;">
                      <a href="${domain}" target="_blank" rel="noopener noreferrer">${domain}</a>
                    </p>
                  `
                      : ""
                  }
                  ${
                    tags.length > 0
                      ? `
                    <div class="publication-tags">
                      ${tags
                        .map(
                          (tag) => `<span class="publication-tag">${tag}</span>`
                        )
                        .join("")}
                    </div>
                  `
                      : ""
                  }
                </div>
              `;
                })
                .join("")}
              ${
                publikasi.length > 3
                  ? `
                <p class="publication-more">+${
                  publikasi.length - 3
                } publikasi lainnya</p>
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
          lecturer.id || lecturer._id
        }">
          Lihat Profil Lengkap Dosen
        </button>
        ${(() => {
          // Determine if current user (mahasiswa) has already applied to this lecturer
          try {
            const userJson = localStorage.getItem("user");
            const currentUser = userJson ? JSON.parse(userJson) : null;
            const myId = currentUser?.id ?? currentUser?.user_id ?? currentUser?._id;

            const applied = (() => {
              // Check common fields that may indicate a student applied: isMahasiswa (array of ids), isApplied, applicants, requesters
              const candidates: any[] = [];
              if (lecturer.isMahasiswa) candidates.push(lecturer.isMahasiswa);
              if ((lecturer as any).isApplied) candidates.push((lecturer as any).isApplied);
              if ((lecturer as any).applicants) candidates.push((lecturer as any).applicants);
              if ((lecturer as any).requesters) candidates.push((lecturer as any).requesters);

              // Also check local optimistic storage for applied requests by this user
              try {
                const userJson = localStorage.getItem("user");
                const currentUser = userJson ? JSON.parse(userJson) : null;
                const myId = currentUser?.id ?? currentUser?.user_id ?? currentUser?._id;
                if (myId) {
                  const key = `applied_requests_${myId}`;
                  const stored = localStorage.getItem(key);
                  if (stored) {
                    const arr = JSON.parse(stored || "[]");
                    const lecId = lecturer.id ?? lecturer._id;
                    if (lecId && Array.isArray(arr) && arr.some((v: any) => String(v) === String(lecId))) {
                      return true;
                    }
                  }
                }
              } catch (e) {
                // ignore
              }

              for (const c of candidates) {
                if (!c) continue;
                if (Array.isArray(c)) {
                  if (c.some((v: any) => String(v) === String(myId))) return true;
                } else if (typeof c === "string" || typeof c === "number") {
                  if (String(c) === String(myId)) return true;
                }
              }

              return false;
            })();

            if (applied) {
              return `
                <button class="btn btn-warning btn-applied" disabled data-applied="1">
                  🔶 Sudah Mengajukan
                </button>
              `;
            }
          } catch (e) {
            // ignore parsing errors and fallthrough to normal button
          }
          
          const user = getUser();
          const submissionKey = `submission_status_${user?.id}_${lecturer.id || lecturer._id}`;
          const isPending = localStorage.getItem(submissionKey) === "pending";

          if (isPending) {
            return `
              <button class="btn btn-warning" disabled>
                ⏳ Menunggu Konfirmasi
              </button>
            `;
          }

          return `
            <button class="btn btn-success btn-submit" data-submit-lecturer-id="${
              lecturer.id || lecturer._id
            }" data-lecturer-name="${lecturer.name}">
              Ajukan Dosen
            </button>
          `;
        })()}
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
      saveInterests(); // Save to localStorage
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

  // Lecturer card actions - View Profile
  document.querySelectorAll("[data-lecturer-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLElement).dataset.lecturerId;
      const lecturer = state.recommendations.find(
        (l) => String(l.id || l._id) === id
      );
      if (lecturer) {
        openLecturerModal(lecturer);
      }
    });
  });

  // Close modal
  document
    .getElementById("closeModal")
    ?.addEventListener("click", closeLecturerModal);

  // Close modal when clicking outside
  const modal = document.getElementById("lecturerModal");
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeLecturerModal();
    }
  });

  // Modal ajukan dosen button
  document.getElementById("modalAjukanBtn")?.addEventListener("click", () => {
    const btn = document.getElementById("modalAjukanBtn");
    if (!btn) return;

    const id = btn.getAttribute("data-modal-lecturer-id");
    const name = btn.getAttribute("data-modal-lecturer-name");

    closeLecturerModal();

    if (id && name) {
      openSubmissionModal(id, name);
    }
  });

  // Close submission modal
  document
    .getElementById("closeSubmissionModal")
    ?.addEventListener("click", closeSubmissionModal);

  document
    .getElementById("cancelSubmission")
    ?.addEventListener("click", closeSubmissionModal);

  // Confirm submission
  document
    .getElementById("confirmSubmission")
    ?.addEventListener("click", handleConfirmSubmission);

  // Close submission modal when clicking outside
  const submissionModal = document.getElementById("submissionModal");
  submissionModal?.addEventListener("click", (e) => {
    if (e.target === submissionModal) {
      closeSubmissionModal();
    }
  });

  // Lecturer card actions - Submit Request (Ajukan Dosen)
  document.querySelectorAll("[data-submit-lecturer-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      // If button marked as applied, show info instead of opening submission
      const isApplied = (btn as HTMLElement).dataset.applied;
      if (isApplied === "1") {
        showErrorModal("Pengajuan", "Anda telah mengajukan topik terkait. Silakan cek halaman profil untuk melihat status pengajuan atau hubungi admin.");
        return;
      }

      const id = (btn as HTMLElement).dataset.submitLecturerId;
      const name = (btn as HTMLElement).dataset.lecturerName;
      if (id && name) {
        openSubmissionModal(id, name);
      }
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
  saveInterests(); // Save to localStorage
  state.inputValue = "";
  interestInput.value = "";

  loadRecommendations();
  renderUI();
}

// Store current submission data
let currentSubmission: { lecturerId: string; lecturerName: string } | null =
  null;

function openSubmissionModal(lecturerId: string, lecturerName: string) {
  currentSubmission = { lecturerId, lecturerName };

  const modal = document.getElementById("submissionModal");
  const dosenNameEl = document.getElementById("submissionDosenName");
  const topicsEl = document.getElementById("submissionTopics");
  const messageEl = document.getElementById(
    "submissionMessage"
  ) as HTMLTextAreaElement;

  if (!modal || !dosenNameEl || !topicsEl) return;

  dosenNameEl.textContent = lecturerName;
  topicsEl.innerHTML = state.interests
    .map((topic) => `<span class="publication-tag">${topic}</span>`)
    .join("");

  if (messageEl) {
    messageEl.value = `Saya tertarik untuk melakukan penelitian dengan topik: ${state.interests.join(
      ", "
    )}. Mohon kesediaannya untuk menjadi dosen pembimbing saya.`;
  }

  modal.style.display = "flex";
}

function closeSubmissionModal() {
  const modal = document.getElementById("submissionModal");
  if (modal) {
    modal.style.display = "none";
  }
  currentSubmission = null;
}

async function handleConfirmSubmission() {
  if (!currentSubmission) return;

  const message =
    (document.getElementById("submissionMessage") as HTMLTextAreaElement)
      ?.value || "";

  try {
    await api.submitSupervisionRequest(currentSubmission.lecturerId, {
      topic: state.interests.join(", "),
      message,
    });

    localStorage.setItem("submission_status", "pending");
    const user = getUser();
    if (user) {
      const submissionKey = `submission_status_${user.id}_${currentSubmission.lecturerId}`;
      localStorage.setItem(submissionKey, "pending");
    }

    closeSubmissionModal();
    
    showSuccessModal(
      "Pengajuan Berhasil",
      "Pengajuan telah dikirim dan akan langsung muncul di dashboard dosen."
    );

  } catch (error) {
    if (error instanceof ApiError) {
      showErrorModal(
        "Pengajuan Gagal",
        error.message.includes("already")
          ? "Anda sudah memiliki pengajuan aktif. Silakan tunggu keputusan dosen."
          : error.message
      );
    } else {
      showErrorModal(
        "Pengajuan Gagal",
        "Terjadi kesalahan pada sistem."
      );
    }
  }
}

function showSuccessModal(title: string, message: string) {
  const existingModal = document.getElementById("alertModal");
  if (existingModal) {
    existingModal.remove();
  }

  const modalHtml = `
    <div id="alertModal" class="modal" style="display: flex;">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3 style="color: #10b981;">✅ ${title}</h3>
        </div>
        <div class="modal-body">
          <p>${message}</p>
          <div style="text-align: right;">
            <button id="closeAlertModal" class="btn btn-success">OK</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  document.getElementById("closeAlertModal")?.addEventListener("click", () => {
    document.getElementById("alertModal")?.remove();
  });
}

function showErrorModal(title: string, message: string) {
  const existingModal = document.getElementById("alertModal");
  if (existingModal) {
    existingModal.remove();
  }

  const modalHtml = `
    <div id="alertModal" class="modal" style="display: flex;">
      <div class="modal-content" style="max-width: 500px;">
        <div class="modal-header">
          <h3 style="color: #ef4444;">❌ ${title}</h3>
        </div>
        <div class="modal-body">
          <p style="padding: 1rem; color: #64748b;">${message}</p>
          <div style="text-align: right; padding: 0 1rem 1rem;">
            <button id="closeAlertModal" class="btn btn-secondary">Tutup</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);

  document.getElementById("closeAlertModal")?.addEventListener("click", () => {
    document.getElementById("alertModal")?.remove();
  });
}

function openLecturerModal(lecturer: Lecturer) {
  const modal = document.getElementById("lecturerModal");
  const modalName = document.getElementById("modalLecturerName");
  const modalContent = document.getElementById("modalLecturerContent");

  if (!modal || !modalName || !modalContent) return;

  modalName.textContent = `Profil Dosen - ${lecturer.name}`;

  const bidangPenelitian =
    lecturer.bidang_penelitian ||
    (lecturer.expertise ? [lecturer.expertise] : []);
  const publikasi = lecturer.publikasi || [];
  const isTopic = Array.isArray(lecturer.isTopic)
    ? lecturer.isTopic
    : typeof lecturer.isTopic === "string"
    ? (lecturer.isTopic as string).split(",").map((t: string) => t.trim())
    : [];

  modalContent.innerHTML = `
    <div>
      <!-- Basic Info -->
      <div style="margin-bottom: 1.5rem;">
        <h4 style="color: #667eea; margin: 0;">Informasi Dasar</h4>
        ${
          lecturer.email
            ? `<p><strong>Email:</strong> ${lecturer.email}</p>`
            : ""
        }
        ${
          lecturer.department
            ? `<p><strong>Departemen:</strong> ${lecturer.department}</p>`
            : ""
        }
        ${
          lecturer.major
            ? `<p><strong>Program Studi:</strong> ${lecturer.major}</p>`
            : ""
        }
        ${lecturer.nidn ? `<p><strong>NIDN:</strong> ${lecturer.nidn}</p>` : ""}
        ${
          lecturer.noHp
            ? `<p><strong>No. HP:</strong> ${lecturer.noHp}</p>`
            : ""
        }
      </div>

      <!-- Bidang Keahlian -->
      ${
        isTopic.length > 0
          ? `
        <div style="margin-bottom: 1.5rem;">
          <h4 style="color: #667eea; margin-bottom: 0.5rem;">Bidang Keahlian</h4>
          <div class="publication-tags">
            ${isTopic
              .map(
                (topic: string) =>
                  `<span class="publication-tag">${topic}</span>`
              )
              .join("")}
          </div>
        </div>
      `
          : ""
      }

      <!-- Bidang Penelitian -->
      ${
        bidangPenelitian.length > 0
          ? `
        <div style="margin-bottom: 1.5rem;">
          <h4 style="color: #667eea; margin-bottom: 0.5rem;">Bidang Penelitian</h4>
          <div class="research-tags">
            ${bidangPenelitian
              .map((field) => `<span class="research-tag">${field}</span>`)
              .join("")}
          </div>
        </div>
      `
          : ""
      }

      <!-- Publikasi -->
      ${
        publikasi.length > 0
          ? `
        <div style="margin-bottom: 1.5rem;">
          <h4 style="color: #667eea; margin-bottom: 0.5rem;">Publikasi (${
            publikasi.length
          })</h4>
          <div class="publications-list" style="max-height: 400px; overflow-y: auto;">
            ${publikasi
              .map((pub) => {
                const title = pub.isTitle || pub.title || "N/A";
                const topic = pub.isTopic || pub.topic || "";
                const year = pub.isYear || pub.year || "";
                const domain = pub.isDomain || pub.domain || "";
                const accreditation =
                  pub.isAccreditation || pub.accreditation || "";
                const journal = pub.journal || "";

                const tags = [];
                if (topic) tags.push(topic);
                if (domain && !domain.startsWith("http")) tags.push(domain);
                if (accreditation) tags.push(accreditation);

                return `
                <div class="publication-item" style="margin-bottom: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
                  <h4 class="publication-card-title" style="margin-bottom: 0.5rem;">${title}</h4>
                  <p class="publication-card-meta" style="color: #64748b; font-size: 0.9rem;">
                    ${
                      journal
                        ? `${journal}${year ? ` • ${year}` : ""}`
                        : year
                        ? `Tahun: ${year}`
                        : ""
                    }
                  </p>
                  ${
                    domain && domain.startsWith("http")
                      ? `
                    <p class="publication-link" style="font-size: 0.85rem; color: #667eea; margin: 0.5rem 0;">
                      <a href="${domain}" target="_blank" rel="noopener noreferrer">${domain}</a>
                    </p>
                  `
                      : ""
                  }
                  ${
                    tags.length > 0
                      ? `
                    <div class="publication-tags" style="margin-top: 0.5rem;">
                      ${tags
                        .map(
                          (tag) => `<span class="publication-tag">${tag}</span>`
                        )
                        .join("")}
                    </div>
                  `
                      : ""
                  }
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      `
          : `<p style="color: #64748b; font-style: italic;">Belum ada publikasi.</p>`
      }
    </div>
  `;

  modal.style.display = "flex";
}

function closeLecturerModal() {
  const modal = document.getElementById("lecturerModal");
  if (modal) {
    modal.style.display = "none";
  }
}

async function loadRecommendations() {
  const user = getUser();
  if (!user || state.interests.length === 0) return;

  state.loading = true;
  state.error = null;
  renderUI();

  try {
    // Ambil semua dosen dari API - gunakan getAllDosen() untuk endpoint /user/dosen
    const response = await api.getAllDosen();
    // Handle different response formats
    let allLecturers: Lecturer[] = [];
    if (Array.isArray(response)) {
      allLecturers = response;
    } else if (response && typeof response === "object") {
      // Check for common response structures
      if ((response as any).data && Array.isArray((response as any).data)) {
        allLecturers = (response as any).data;
      } else if (
        (response as any).lecturers &&
        Array.isArray((response as any).lecturers)
      ) {
        allLecturers = (response as any).lecturers;
      } else if (
        (response as any).dosen &&
        Array.isArray((response as any).dosen)
      ) {
        allLecturers = (response as any).dosen;
      }
    }

    // Ambil semua publikasi dari API
    try {
      const publicationsResponse = await api.getAllPublications();
      let allPublications: any[] = [];

      if (Array.isArray(publicationsResponse)) {
        allPublications = publicationsResponse;
      } else if (
        publicationsResponse &&
        typeof publicationsResponse === "object"
      ) {
        if (
          (publicationsResponse as any).data &&
          Array.isArray((publicationsResponse as any).data)
        ) {
          allPublications = (publicationsResponse as any).data;
        }
      }

      // Map publikasi to lecturers berdasarkan isPublish IDs
      allLecturers = allLecturers.map((lecturer) => {
        const isPublish = lecturer.isPublish || [];
        const publikasiIds = Array.isArray(isPublish) ? isPublish : [];

        // Find publications yang ID-nya ada di isPublish dosen ini
        const lecturerPublications = allPublications.filter((pub) => {
          const pubId = pub._id || pub.id;
          return publikasiIds.includes(pubId);
        });

        return {
          ...lecturer,
          publikasi: lecturerPublications,
        };
      });
    } catch (pubError) {
      // Continue without publications
    }

    // === SISTEM REKOMENDASI DENGAN SCORING ===
    // Konversi semua keyword mahasiswa ke lowercase
    const keywords = state.interests.map((k) => k.toLowerCase());

    // Hitung skor untuk setiap dosen
    interface ScoredLecturer extends Lecturer {
      score: number;
      matchDetails: {
        exactMatches: number;
        partialMatches: number;
        publicationMatches: number;
        totalMatches: number;
      };
    }

    const scoredLecturers: ScoredLecturer[] = allLecturers.map((lecturer) => {
      let score = 0;
      let exactMatches = 0;
      let partialMatches = 0;
      let publicationMatches = 0;

      // Parse isTopic dosen
      const isTopicString = lecturer.isTopic || "";
      let dosenTopics: string[] = [];

      if (isTopicString) {
        if (typeof isTopicString === "string") {
          dosenTopics = (isTopicString as string)
            .split(",")
            .map((t: string) => t.trim().toLowerCase());
        } else if (Array.isArray(isTopicString)) {
          dosenTopics = isTopicString.map((t: any) =>
            String(t).trim().toLowerCase()
          );
        }
      }

      // 1. EXACT MATCH di expertise dosen (bobot: 100 poin per match)
      keywords.forEach((keyword) => {
        if (dosenTopics.includes(keyword)) {
          exactMatches++;
          score += 100;
        }
      });

      // 2. PARTIAL MATCH di expertise dosen (bobot: 50 poin per match)
      keywords.forEach((keyword) => {
        dosenTopics.forEach((topic) => {
          if (
            !dosenTopics.includes(keyword) && // bukan exact match
            (topic.includes(keyword) || keyword.includes(topic))
          ) {
            partialMatches++;
            score += 50;
          }
        });
      });

      // 3. MATCH di publikasi (bobot: 30 poin per publikasi)
      const publikasi = lecturer.publikasi || [];
      publikasi.forEach((pub) => {
        const pubTopic = (pub.isTopic || pub.topic || "").toLowerCase();
        keywords.forEach((keyword) => {
          if (pubTopic.includes(keyword) || keyword.includes(pubTopic)) {
            publicationMatches++;
            score += 30;
          }
        });
      });

      // 4. BONUS: Jumlah publikasi total (bobot: 5 poin per publikasi, max 50)
      const publicationBonus = Math.min(publikasi.length * 5, 50);
      score += publicationBonus;

      // 5. BONUS: Dosen aktif (bobot: 20 poin)
      if (lecturer.isActive) {
        score += 20;
      }

      const totalMatches = exactMatches + partialMatches + publicationMatches;

      return {
        ...lecturer,
        score,
        matchDetails: {
          exactMatches,
          partialMatches,
          publicationMatches,
          totalMatches,
        },
      };
    });

    // Filter hanya dosen yang memiliki score > 0 (ada match)
    let matchedLecturers = scoredLecturers.filter((l) => l.score > 0);

    // Urutkan berdasarkan score tertinggi
    matchedLecturers.sort((a, b) => b.score - a.score);

    // Filter hanya dosen dengan match percentage > 30%
    const maxPossibleScore = state.interests.length * 100 + 50 + 20;
    matchedLecturers = matchedLecturers.filter((lecturer) => {
      const matchPercentage = Math.min(
        Math.round((lecturer.score / maxPossibleScore) * 100),
        100
      );
      return matchPercentage > 30;
    });

    state.recommendations = matchedLecturers;

    if (state.recommendations.length === 0) {
      state.error =
        "Tidak ada dosen yang cocok dengan minat penelitian Anda. Coba keyword lain.";
    }
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
