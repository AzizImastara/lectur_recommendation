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
};

// Store onLogout callback
let logoutCallback: (() => void) | null = null;

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

// Load publications from API
async function loadPublications(): Promise<void> {
  state.loading = true;
  state.error = null;
  renderUI();

  try {
    // console.log("Loading publications...");
    const response = await api.getMyPublications();
    // console.log("Loaded publications response:", response);

    // Handle different response formats
    let publications: any[] = [];

    // Check if response has pagination structure (data array)
    if (response && typeof response === "object") {
      if (Array.isArray(response)) {
        // Direct array response
        publications = response;
      } else if (
        (response as any).data &&
        Array.isArray((response as any).data)
      ) {
        // Paginated response with data array
        publications = (response as any).data;
      } else if (
        (response as any).publications &&
        Array.isArray((response as any).publications)
      ) {
        // Response with publications key
        publications = (response as any).publications;
      } else {
        // Try to use response as single publication or extract from object
        publications = [response];
      }
    }

    // Transform publications to match expected format
    publications = publications.map((pub: any) => ({
      id: pub._id || pub.id,
      title: pub.isTitle || pub.title,
      topic: pub.isTopic || pub.topic,
      year: pub.isYear || pub.year,
      domain: pub.isDomain || pub.domain,
      accreditation: pub.isAccreditation || pub.accreditation,
      journal: pub.journal || pub.isDomain, // Use domain as journal if available
      ...pub, // Keep all original fields
    }));

    // console.log("Transformed publications:", publications);
    state.publications = publications;
    // console.log("State publications after load:", state.publications);
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

// Load supervised students (mock data for now, can be replaced with API call)
function loadSupervisedStudents(): void {
  // TODO: Replace with actual API call when available
  // For now, using mock data
  state.supervisedStudents = [
    {
      id: 1,
      name: "Gabriel Oye",
      email: "geby@student.telkomuniversity.ac.id",
      researchTitle: "Klasifikasi bahlil goblin atau gokil",
    },
  ];
}

export function renderProfileDosen(onLogout: () => void) {
  const user = getUser();
  if (!user) {
    setRoute("login");
    return;
  }

  // Store logout callback
  logoutCallback = onLogout;

  // Load saved data
  loadExpertise();
  loadPublications();
  loadSupervisedStudents();

  renderUI();
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
  // Make sure name is not email - try name_dosen first for dosen
  const userName =
    (user as any).name_dosen ||
    (user.name && user.name !== email ? user.name : "") ||
    (user as any).full_name ||
    "";

  app.innerHTML = `
    <!-- Header -->
    ${renderHeader("profile")}

    <div class="dashboard-container">
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
                <label for="profileNIDN">NIDN</label>
                <input 
                  type="text" 
                  id="profileNIDN" 
                  class="profile-input" 
                  value="${nidn}" 
                  disabled
                />
              </div>
              
              <div class="profile-form-group">
                <label for="profileMajor">Program Studi</label>
                <input 
                  type="text" 
                  id="profileMajor" 
                  class="profile-input" 
                  value="${major}" 
                  disabled
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Expertise Fields Section -->
      <section class="interests-section">
        <div class="interests-card">
          <h2 class="section-title-large">Sesuaikan Bidang Keahlian!</h2>
          <p class="section-subtitle">
            Bidang keahlian Anda membantu mahasiswa menemukan Anda
          </p>
          
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
              <strong>Error:</strong> ${state.error}
              <button id="closeErrorPub" class="close-btn">×</button>
            </div>
          `
              : ""
          }
          ${
            state.success && state.success.includes("Publikasi")
              ? `
            <div class="alert alert-success" style="background-color: #B8FFBA; color: black;">
              <strong>Sukses:</strong> ${state.success}
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
            <label for="pubTitle">Judul Publikasi <span style="color: red;">*</span></label>
            <input 
              type="text" 
              id="pubTitle" 
              class="form-input" 
              required
              placeholder="Masukkan judul publikasi"
              style="background-color: white; color: black;"
            />
          </div>
          <div class="form-group">
            <label for="pubTopic">Topik <span style="color: red;">*</span></label>
            <input 
              type="text" 
              id="pubTopic" 
              class="form-input" 
              required
              placeholder="Masukkan topik publikasi"
              style="background-color: white; color: black;"
            />
          </div>
          <div class="form-group">
            <label for="pubYear">Tahun <span style="color: red;">*</span></label>
            <input 
              type="number" 
              id="pubYear" 
              class="form-input" 
              required
              placeholder="Tahun publikasi"
              min="1900"
              max="${new Date().getFullYear()}"
              style="background-color: white; color: black;"
            />
          </div>
          <div class="form-group">
            <label for="pubDomain">Domain</label>
            <input 
              type="text" 
              id="pubDomain" 
              class="form-input" 
              placeholder="Domain penelitian"
              style="background-color: white; color: black;"
            />
          </div>
          <div class="form-group">
            <label for="pubAccreditation">Akreditasi</label>
            <input 
              type="text" 
              id="pubAccreditation" 
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

  if (logoutCallback) {
    setupEventListeners(logoutCallback);
    setupHeaderListeners({
      onLogout: logoutCallback,
      onProfile: () => {
        // Already on profile page
      },
      onDashboard: () => {
        setRoute("dashboard");
        window.dispatchEvent(new CustomEvent("routechange"));
      },
    });
  }
}

function renderPublicationCard(pub: Publication | any): string {
  // Support both old format (title, journal, year) and new format (isTitle, isTopic, isYear, etc.)
  const pubId = pub.id || pub._id || "unknown";
  const title = pub.title || pub.isTitle || "N/A";
  const topic = pub.topic || pub.isTopic || "";
  const year = pub.year || pub.isYear || null;
  const domain = pub.domain || pub.isDomain || "";
  const accreditation = pub.accreditation || pub.isAccreditation || "";
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

function setupEventListeners(_onLogout: () => void) {
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
    btn.addEventListener("click", (e) => {
      const index = parseInt((e.target as HTMLElement).dataset.index || "0");
      state.expertise.splice(index, 1);
      saveExpertise();
      renderUI();
    });
  });

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

function handleAddExpertise() {
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
  renderUI();
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
      (document.getElementById("pubTitle") as HTMLInputElement).value =
        pub.title || (pub as any).isTitle || "";
      (document.getElementById("pubTopic") as HTMLInputElement).value =
        (pub as any).isTopic || (pub as any).topic || "";
      (document.getElementById("pubYear") as HTMLInputElement).value =
        pub.year?.toString() || (pub as any).isYear?.toString() || "";
      (document.getElementById("pubDomain") as HTMLInputElement).value =
        (pub as any).isDomain || (pub as any).domain || "";
      (document.getElementById("pubAccreditation") as HTMLInputElement).value =
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
    document.getElementById("pubTitle") as HTMLInputElement
  ).value.trim();
  const isTopic = (
    document.getElementById("pubTopic") as HTMLInputElement
  ).value.trim();
  const isYear = parseInt(
    (document.getElementById("pubYear") as HTMLInputElement).value
  );
  const isDomain = (
    document.getElementById("pubDomain") as HTMLInputElement
  ).value.trim();
  const isAccreditation = (
    document.getElementById("pubAccreditation") as HTMLInputElement
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

    console.log("Sending publication data:", publicationData);

    let response;
    if (state.editingPublication) {
      // Untuk update, mungkin perlu format yang berbeda atau endpoint yang berbeda
      // Sementara menggunakan format yang sama
      // Convert string ID to number if needed, or use as string
      const pubId =
        typeof state.editingPublication === "string"
          ? state.editingPublication
          : state.editingPublication;
      response = await api.updatePublication(pubId as any, publicationData);
      state.success = "Publikasi berhasil diperbarui!";
    } else {
      response = await api.addPublication(publicationData);
      state.success = "Publikasi berhasil ditambahkan!";
    }

    // console.log("Publication response:", response);

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
