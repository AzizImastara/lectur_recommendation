import { getUser } from "../auth";
import { setRoute } from "../router";
import { renderHeader, setupHeaderListeners } from "../components/header";
import { api, ApiError, type Publication } from "../api";

interface ProfileState {
  expertise: string[];
  publications: Publication[];
  supervisedStudents: any[];
  inputValue: string;
  error: string | null;
  success: string | null;
  loading: boolean;
  editingPublication: string | number | null;
  isEditingProfile: boolean;
}

const state: ProfileState = {
  expertise: [],
  publications: [],
  supervisedStudents: [],
  inputValue: "",
  error: null,
  success: null,
  loading: false,
  editingPublication: null,
  isEditingProfile: false,
};

// Load expertise from localStorage
function loadExpertise(): void {
  const user = getUser();
  if (user) {
    const saved = localStorage.getItem(`expertise_${user.id}`);
    if (saved) {
      try {
        state.expertise = JSON.parse(saved);
      } catch {
        state.expertise = [];
      }
    }
  }
}

// Save expertise to localStorage
function saveExpertise(): void {
  const user = getUser();
  if (user) {
    localStorage.setItem(
      `expertise_${user.id}`,
      JSON.stringify(state.expertise)
    );
  }
}

// Sync expertise to backend API using isTopic field
async function syncExpertiseToBackend(): Promise<void> {
  try {
    const expertiseString = state.expertise.join(","); // Format: "svm,ml,ai"
    await api.updateMyProfileDosen({
      isTopic: expertiseString as any, // Backend expects string, not array
    });
    console.log("✓ Expertise synced to backend (isTopic):", expertiseString);
  } catch (error) {
    console.warn("Failed to sync expertise to backend:", error);
    // Don't show error to user, just log it
  }
}

// Sync publication topics to dosen isTopic field
async function syncPublicationTopicsToDosenTopic(): Promise<void> {
  try {
    // Ambil semua topik dari publikasi
    const publicationTopics = state.publications
      .map((pub) => {
        const topic = (pub as any).isTopic || pub.topic || "";
        return topic.toLowerCase().trim();
      })
      .filter((topic) => topic); // Remove empty strings

    // Gabungkan dengan expertise yang sudah ada (dari manual input)
    const allTopics = [...state.expertise.map((e) => e.toLowerCase())];

    // Tambahkan topik publikasi yang belum ada
    publicationTopics.forEach((pubTopic) => {
      if (!allTopics.includes(pubTopic)) {
        allTopics.push(pubTopic);
      }
    });

    // Update ke backend
    const topicsString = allTopics.join(",");
    await api.updateMyProfileDosen({
      isTopic: topicsString as any,
    });

    console.log("✓ Publication topics synced to dosen isTopic:", topicsString);

    // Update state.expertise agar UI update
    state.expertise = allTopics;
    saveExpertise();
  } catch (error) {
    console.warn("Failed to sync publication topics:", error);
  }
}

// Load publications from API
async function loadPublications(): Promise<void> {
  state.loading = true;
  state.error = null;
  renderUI();

  try {
    const response = await api.getMyPublications();
    let publications: any[] = [];

    if (response && typeof response === "object") {
      if (Array.isArray(response)) {
        publications = response;
      } else if (
        (response as any).data &&
        Array.isArray((response as any).data)
      ) {
        publications = (response as any).data;
      } else if (
        (response as any).publications &&
        Array.isArray((response as any).publications)
      ) {
        publications = (response as any).publications;
      } else {
        publications =
          response && Object.keys(response).length > 0 ? [response] : [];
      }
    }

    publications = publications.map((pub: any) => {
      return {
        id: pub._id || pub.id,
        isTitle: pub.isTitle || pub.title,
        isTopic: pub.isTopic || pub.topic,
        isYear: pub.isYear || pub.year,
        isDomain: pub.isDomain || pub.domain,
        isAccreditation: pub.isAccreditation || pub.accreditation,
        ...pub, // Keep all original fields
      };
    });

    state.publications = publications;
  } catch (error) {
    if (error instanceof ApiError) {
      state.error = error.message;
    } else {
      state.error = "Gagal memuat publikasi";
    }
    console.error("Error loading publications:", error);
  } finally {
    state.loading = false;
    renderUI();
  }
}

function loadSupervisedStudents(): void {
  state.supervisedStudents = [
    {
      id: 1,
      name: "Gabriel Oye",
      email: "geby@student.telkomuniversity.ac.id",
      researchTitle: "Klasifikasi bahlil goblin atau gokil",
    },
  ];
}

export async function renderProfileDosen() {
  const user = getUser();
  if (!user) {
    setRoute("login");
    return;
  }

  // Load saved data from localStorage first (fast)
  loadExpertise();

  // Load data from API
  await loadProfileFromBackend();
  loadPublications();
  loadSupervisedStudents();

  renderUI();
}

// Load profile data including expertise from backend
async function loadProfileFromBackend(): Promise<void> {
  try {
    const profile = await api.getMyProfileDosen();
    console.log("Loaded profile from backend:", profile);
    console.log("All profile keys:", Object.keys(profile));

    // Backend menggunakan isTopic untuk menyimpan expertise
    const expertiseField = profile.isTopic || null;

    console.log("Expertise field (isTopic):", expertiseField);

    // Update expertise dari backend jika tersedia
    if (expertiseField) {
      if (Array.isArray(expertiseField)) {
        state.expertise = expertiseField;
        console.log("✓ Loaded expertise as array:", state.expertise);
      } else if (typeof expertiseField === "string") {
        // Jika string, split by comma
        state.expertise = (expertiseField as string)
          .split(",")
          .map((s: string) => s.trim())
          .filter((s: string) => s);
        console.log("✓ Loaded expertise from string:", state.expertise);
      }
      saveExpertise(); // Save to localStorage
    } else {
      console.log("⚠ No expertise field found in backend response");
    }
  } catch (error) {
    console.warn("Failed to load profile from backend:", error);
    // Fallback to localStorage data (already loaded)
  }
}

function renderUI() {
  const user = getUser();
  if (!user) return;

  const app = document.querySelector<HTMLDivElement>("#app")!;

  // Get user additional data - try multiple possible field names
  const nidn = (user as any).nidn || (user as any).NIDN || "";
  const major =
    (user as any).major ||
    (user as any).Major ||
    (user as any).program_studi ||
    "";
  const email = user.email || (user as any).email_address || "";
  // Get name from user object, prioritizing actual name over email
  const userName = user.name || "";

  app.innerHTML = `
    <!-- Header -->
    ${renderHeader("profile")}

    <div class="dashboard-container">
      ${
        state.error &&
        !state.error.includes("publikasi") &&
        !state.error.includes("keahlian")
          ? `
        <div class="alert alert-error">
          ${state.error}
          <button id="closeErrorProfile" class="close-btn">×</button>
        </div>
      `
          : ""
      }

      ${
        state.success && !state.success.includes("Publikasi")
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
          <p class="section-subtitle">Kelola profile dan topik Anda!</p>
          
          <div class="profile-form">
            <div class="profile-form-row">
              <div class="profile-form-group">
                <label for="profileName">Nama</label>
                <input 
                  type="text" 
                  id="profileName" 
                  class="profile-input" 
                  ${
                    state.isEditingProfile
                      ? 'style="background-color: white; color: black;"'
                      : ""
                  }
                  value="${userName}" 
                  ${!state.isEditingProfile ? "disabled" : "required"}
                />
              </div>
              
              <div class="profile-form-group">
                <label for="profileEmail">Email</label>
                <input 
                  type="email" 
                  id="profileEmail" 
                  class="profile-input" 
                  ${
                    state.isEditingProfile
                      ? 'style="background-color: white; color: black;"'
                      : ""
                  }
                  value="${email}" 
                  ${!state.isEditingProfile ? "disabled" : "required"}
                />
              </div>
            </div>

            <div class="profile-form-row">
              <div class="profile-form-group">
                <label for="profileNIDN">NIDN</label>
                <input 
                  type="text" 
                  id="profileNIDN" 
                  class="profile-input" 
                  ${
                    state.isEditingProfile
                      ? 'style="background-color: white; color: black;"'
                      : ""
                  }
                  value="${nidn}" 
                  ${!state.isEditingProfile ? "disabled" : ""}
                  minlength="10"
                />
              </div>
              
              <div class="profile-form-group">
                <label for="profileMajor">Program Studi</label>
                <input 
                  type="text" 
                  id="profileMajor" 
                  class="profile-input" 
                  ${
                    state.isEditingProfile
                      ? 'style="background-color: white; color: black;"'
                      : ""
                  }
                  value="${major}" 
                  ${!state.isEditingProfile ? "disabled" : ""}
                />
              </div>
            </div>

            <div class="profile-actions">
              ${
                !state.isEditingProfile
                  ? `<button class="btn btn-success" id="btnEditProfile">✏️ Edit Profil</button>`
                  : `
                <button type="button" class="btn btn-secondary" id="btnCancelEditProfile">Batal</button>
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

      <!-- Expertise Fields Section -->
      <section class="interests-section">
        <div class="interests-card">
          <h2 class="section-title-large">Sesuaikan Bidang Keahlian!</h2>
          <p class="section-subtitle">
            Bidang keahlian Anda membantu mahasiswa menemukan Anda. <strong>Klik "Simpan Profil" di atas untuk menyimpan ke sistem.</strong>
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
              ${state.expertise
                .map(
                  (exp, index) => `
                <span class="interest-tag">
                  ${exp}
                  <button class="tag-remove" data-index="${index}">×</button>
                </span>
              `
                )
                .join("")}
            </div>
            <div class="interests-input-group">
              <input 
                type="text" 
                id="expertiseInput"
                class="interest-input"
                style="background-color: white; color: black;"
                placeholder="Contoh: Cybersecurity, Machine Learning, Support Vector Machine, Dsb.."
                value="${state.inputValue}"
              />
              <button id="addExpertiseBtn" class="btn btn-success">
                + Tambah
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Publications Section -->
      <section class="publications-section">
        <div class="publications-card">
          <div class="publications-header">
            <div>
              <h2 class="section-title-large">Publikasi Anda!</h2>
              <p class="section-subtitle">Karya penelitian Anda yang dipublikasikan</p>
            </div>
            <button id="addPublicationBtn" class="btn btn-success">
              + Tambah Publikasi
            </button>
          </div>

          ${
            state.error && state.error.includes("publikasi")
              ? `
            <div class="alert alert-error">
              ${state.error}
              <button id="closeErrorPub" class="close-btn">×</button>
            </div>
          `
              : ""
          }
          ${
            state.success && state.success.includes("Publikasi")
              ? `
            <div class="alert alert-success" style="background-color: #B8FFBA; color: black;">
              ${state.success}
              <button id="closeSuccessPub" class="close-btn">×</button>
            </div>
          `
              : ""
          }
          ${
            state.loading
              ? `
            <div class="loading">
              <div class="spinner"></div>
              <p>Memuat publikasi...</p>
            </div>
          `
              : state.publications.length > 0
              ? `
            <div class="publications-list-container">
              ${state.publications
                .map((pub) => renderPublicationCard(pub))
                .join("")}
            </div>
          `
              : `
            <p class="no-data">Belum ada publikasi. Tambahkan publikasi pertama Anda!</p>
          `
          }
        </div>
      </section>

      <!-- Supervised Students Section -->
      <section class="students-section">
        <div class="students-card">
          <h2 class="section-title-large">Mahasiswa Bimbingan Anda!</h2>
          <p class="section-subtitle">Berikut adalah mahasiswa yang Anda bimbing</p>
          
          ${
            state.supervisedStudents.length > 0
              ? `
            <div class="students-list">
              ${state.supervisedStudents
                .map((student) => renderStudentCard(student))
                .join("")}
            </div>
          `
              : `
            <p class="no-data">Belum ada mahasiswa bimbingan.</p>
          `
          }
        </div>
      </section>
    </div>

    <!-- Publication Modal -->
    <div id="publicationModal" class="modal" style="display: none;">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="modalTitle">Tambah Publikasi</h3>
          <button id="closeModal" class="close-btn">×</button>
        </div>
        <form id="publicationForm" class="modal-form">
          <div class="form-group">
            <label for="isTitle">Judul Publikasi <span style="color: red;">*</span></label>
            <input 
              type="text" 
              id="isTitle" 
              class="form-input" 
              required
              placeholder="Masukkan judul publikasi"
              style="background-color: white; color: black;"
            />
          </div>
          <div class="form-group">
            <label for="isTopic">Topik <span style="color: red;">*</span></label>
            <input 
              type="text" 
              id="isTopic" 
              class="form-input" 
              required
              placeholder="Masukkan topik publikasi"
              style="background-color: white; color: black;"
            />
          </div>
          <div class="form-group">
            <label for="isYear">Tahun <span style="color: red;">*</span></label>
            <input 
              type="number" 
              id="isYear" 
              class="form-input" 
              required
              placeholder="Tahun publikasi"
              min="1900"
              max="${new Date().getFullYear()}"
              style="background-color: white; color: black;"
            />
          </div>
          <div class="form-group">
            <label for="isDomain">Domain</label>
            <input 
              type="text" 
              id="isDomain" 
              class="form-input" 
              placeholder="Domain penelitian"
              style="background-color: white; color: black;"
            />
          </div>
          <div class="form-group">
            <label for="isAccreditation">Akreditasi</label>
            <input 
              type="text" 
              id="isAccreditation" 
              class="form-input" 
              placeholder="Tingkat akreditasi"
              style="background-color: white; color: black;"
            />
          </div>
          <div class="modal-actions">
            <button type="button" id="cancelBtn" class="btn btn-secondary">Batal</button>
            <button type="submit" class="btn btn-primary">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  `;

  setupEventListeners();
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

function renderPublicationCard(pub: Publication | any): string {
  // Use API format (isTitle, isTopic, isYear, etc.) as priority
  const pubId = pub.id || pub._id || "unknown";
  const title = pub.isTitle || pub.title || "N/A";
  const topic = pub.isTopic || pub.topic || "";
  const year = pub.isYear || pub.year || null;
  const domain = pub.isDomain || pub.domain || "";
  const accreditation = pub.isAccreditation || pub.accreditation || "";
  const journal = pub.journal || "";

  // Create tags from topic, domain, and accreditation
  const tags: string[] = [];
  if (topic) tags.push(topic);
  if (domain && !domain.startsWith("http")) tags.push(domain); // Don't show URLs as tags
  if (accreditation) tags.push(accreditation);

  return `
    <div class="publication-card" data-id="${pubId}">
      <div class="publication-card-content">
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
                (tag: string) => `
              <span class="publication-tag">${tag}</span>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }
      </div>
      <div class="publication-card-actions">
        <button class="btn btn-success btn-sm edit-publication" data-id="${pubId}">
          Edit
        </button>
        <button class="btn btn-danger btn-sm delete-publication" data-id="${pubId}">
          Hapus
        </button>
      </div>
    </div>
  `;
}

function renderStudentCard(student: any): string {
  return `
    <div class="student-card">
      <div class="student-info">
        <h4 class="student-name">${student.name}</h4>
        <p class="student-email">
          <span>✉</span> ${student.email}
        </p>
        ${
          student.researchTitle
            ? `
          <p class="student-research">
            <strong>Judul penelitian:</strong> ${student.researchTitle}
          </p>
        `
            : ""
        }
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

  // Close success
  document.getElementById("closeSuccess")?.addEventListener("click", () => {
    state.success = null;
    renderUI();
  });

  // Close alerts for profile section
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

  // Close success in publications section
  document.getElementById("closeSuccessPub")?.addEventListener("click", () => {
    state.success = null;
    renderUI();
  });

  // Close error in publications section
  document.getElementById("closeErrorPub")?.addEventListener("click", () => {
    state.error = null;
    renderUI();
  });

  // Edit profile button
  document.getElementById("btnEditProfile")?.addEventListener("click", () => {
    state.isEditingProfile = true;
    state.error = null;
    state.success = null;
    renderUI();
  });

  // Cancel edit profile button
  document
    .getElementById("btnCancelEditProfile")
    ?.addEventListener("click", () => {
      state.isEditingProfile = false;
      state.error = null;
      renderUI();
    });

  // Save profile button
  document
    .getElementById("btnSaveProfile")
    ?.addEventListener("click", handleSaveProfile);

  // Add expertise
  const addBtn = document.getElementById("addExpertiseBtn");
  const expertiseInput = document.getElementById(
    "expertiseInput"
  ) as HTMLInputElement;

  addBtn?.addEventListener("click", handleAddExpertise);
  expertiseInput?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddExpertise();
    }
  });

  // Remove expertise tags
  document.querySelectorAll(".tag-remove").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const index = parseInt((e.target as HTMLElement).dataset.index || "0");
      state.expertise.splice(index, 1);
      saveExpertise();
      await syncExpertiseToBackend(); // Sync ke backend immediately
      renderUI();
    });
  });

  // Publication modals
  document
    .getElementById("addPublicationBtn")
    ?.addEventListener("click", () => {
      openPublicationModal();
    });

  document
    .getElementById("closeModal")
    ?.addEventListener("click", closePublicationModal);
  document
    .getElementById("cancelBtn")
    ?.addEventListener("click", closePublicationModal);

  // Publication form submit
  document
    .getElementById("publicationForm")
    ?.addEventListener("submit", handlePublicationSubmit);

  // Edit publication
  document.querySelectorAll(".edit-publication").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = (e.target as HTMLElement).dataset.id || "";
      openPublicationModal(id);
    });
  });

  // Delete publication
  document.querySelectorAll(".delete-publication").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = (e.target as HTMLElement).dataset.id || "";
      if (confirm("Apakah Anda yakin ingin menghapus publikasi ini?")) {
        await handleDeletePublication(id);
      }
    });
  });

  // Close modal when clicking outside
  const modal = document.getElementById("publicationModal");
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closePublicationModal();
    }
  });
}

async function handleAddExpertise() {
  const expertiseInput = document.getElementById(
    "expertiseInput"
  ) as HTMLInputElement;
  const value = expertiseInput?.value.trim();

  if (!value) {
    state.error = "Bidang keahlian tidak boleh kosong";
    renderUI();
    return;
  }

  if (state.expertise.includes(value)) {
    state.error = "Bidang keahlian ini sudah ditambahkan";
    renderUI();
    return;
  }

  state.expertise.push(value);
  state.inputValue = "";
  state.error = null;
  if (expertiseInput) {
    expertiseInput.value = "";
  }

  saveExpertise();
  await syncExpertiseToBackend(); // Sync ke backend immediately
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
  const nidn = (document.getElementById("profileNIDN") as HTMLInputElement)
    ?.value;
  const major = (document.getElementById("profileMajor") as HTMLInputElement)
    ?.value;

  if (!name || !email) {
    state.error = "Nama dan Email harus diisi";
    renderUI();
    return;
  }

  if (nidn && nidn.length < 10) {
    state.error = "NIDN minimal 10 karakter";
    renderUI();
    return;
  }

  state.loading = true;
  state.error = null;
  state.success = null;
  renderUI();

  try {
    // Update profile via API (termasuk expertise)
    const updateData: any = {
      name,
      email,
      nidn,
      major,
    };

    // Backend menggunakan isTopic untuk expertise (format: comma-separated string)
    if (state.expertise.length > 0) {
      updateData.isTopic = state.expertise.join(","); // Format: "ai,ml,nlp"
      console.log(
        "Sending expertise to backend (isTopic):",
        updateData.isTopic
      );
    }

    console.log("Update data being sent:", updateData);

    // Call API to update own profile
    const response = await api.updateMyProfileDosen(updateData);
    console.log("Profile update response:", response);

    // Update local user data after successful API call
    const updatedUser = {
      ...user,
      name,
      email,
      nidn,
      major,
    };
    localStorage.setItem("user", JSON.stringify(updatedUser));

    const expertiseInfo =
      state.expertise.length > 0
        ? ` (${state.expertise.length} bidang keahlian tersimpan)`
        : "";
    state.success = `Profil berhasil diperbarui${expertiseInfo}`;
    state.isEditingProfile = false;

    // Reload profile untuk verify data tersimpan
    await loadProfileFromBackend();
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

function openPublicationModal(publicationId?: string | number) {
  const modal = document.getElementById("publicationModal");
  const modalTitle = document.getElementById("modalTitle");
  const form = document.getElementById("publicationForm") as HTMLFormElement;

  if (publicationId) {
    const pub = state.publications.find((p) => p.id === publicationId);
    if (pub) {
      state.editingPublication = publicationId;
      if (modalTitle) modalTitle.textContent = "Edit Publikasi";
      (document.getElementById("isTitle") as HTMLInputElement).value =
        (pub as any).isTitle || pub.title || "";
      (document.getElementById("isTopic") as HTMLInputElement).value =
        (pub as any).isTopic || (pub as any).topic || "";
      (document.getElementById("isYear") as HTMLInputElement).value =
        (pub as any).isYear?.toString() || pub.year?.toString() || "";
      (document.getElementById("isDomain") as HTMLInputElement).value =
        (pub as any).isDomain || (pub as any).domain || "";
      (document.getElementById("isAccreditation") as HTMLInputElement).value =
        (pub as any).isAccreditation || (pub as any).accreditation || "";
    }
  } else {
    state.editingPublication = null;
    if (modalTitle) modalTitle.textContent = "Tambah Publikasi";
    form.reset();
  }

  if (modal) {
    modal.style.display = "flex";
  }
}

function closePublicationModal() {
  const modal = document.getElementById("publicationModal");
  if (modal) {
    modal.style.display = "none";
  }
  state.editingPublication = null;
}

async function handlePublicationSubmit(e: Event) {
  e.preventDefault();

  const isTitle = (
    document.getElementById("isTitle") as HTMLInputElement
  ).value.trim();
  const isTopic = (
    document.getElementById("isTopic") as HTMLInputElement
  ).value.trim();
  const isYear = parseInt(
    (document.getElementById("isYear") as HTMLInputElement).value
  );
  const isDomain = (
    document.getElementById("isDomain") as HTMLInputElement
  ).value.trim();
  const isAccreditation = (
    document.getElementById("isAccreditation") as HTMLInputElement
  ).value.trim();

  if (!isTitle || !isTopic || !isYear) {
    state.error = "Judul, Topik, dan Tahun wajib diisi";
    renderUI();
    return;
  }

  state.loading = true;
  state.error = null;
  state.success = null;
  renderUI();

  try {
    // Format data sesuai dengan API endpoint yang benar
    const publicationData: any = {
      isTitle,
      isTopic,
      isYear,
    };

    // Only include optional fields if they have values
    if (isDomain) {
      publicationData.isDomain = isDomain;
    }
    if (isAccreditation) {
      publicationData.isAccreditation = isAccreditation;
    }

    // console.log("Sending publication data:", publicationData);

    if (state.editingPublication) {
      const pubId =
        typeof state.editingPublication === "string"
          ? state.editingPublication
          : state.editingPublication;
      await api.updatePublication(pubId as any, publicationData);
      state.success = "Publikasi berhasil diperbarui!";
    } else {
      await api.addPublication(publicationData);
      state.success = "Publikasi berhasil ditambahkan!";
    }

    // Auto-sync: Tambahkan topik publikasi ke isTopic dosen
    await syncPublicationTopicsToDosenTopic();

    closePublicationModal();

    // Reload publications after a short delay to ensure backend has processed
    setTimeout(async () => {
      await loadPublications();
      // Clear success message after 3 seconds
      setTimeout(() => {
        state.success = null;
        renderUI();
      }, 3000);
    }, 500);
  } catch (error) {
    if (error instanceof ApiError) {
      state.error = error.message;
      console.error("API Error:", error.message, error.status, error.data);
    } else {
      state.error = "Gagal menyimpan publikasi";
      console.error("Error saving publication:", error);
    }
    state.loading = false;
    renderUI();
  }
}

async function handleDeletePublication(id: string | number) {
  state.loading = true;
  state.error = null;
  renderUI();

  try {
    // API might expect number, but we'll pass as any to handle both string and number
    await api.deletePublication(id as any);
    await loadPublications();

    // Auto-sync: Update isTopic dosen setelah publikasi dihapus
    await syncPublicationTopicsToDosenTopic();
  } catch (error) {
    if (error instanceof ApiError) {
      state.error = error.message;
    } else {
      state.error = "Gagal menghapus publikasi";
    }
    console.error("Error deleting publication:", error);
    renderUI();
  }
}
