import { getUser } from '../auth';
import { setRoute } from '../router';
import { renderHeader, setupHeaderListeners } from '../components/header';

interface ProfileState {
  interests: string[];
  inputValue: string;
  error: string | null;
}

const state: ProfileState = {
  interests: [],
  inputValue: '',
  error: null,
};

// Store onLogout callback
let logoutCallback: (() => void) | null = null;

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
    localStorage.setItem(`interests_${user.id}`, JSON.stringify(state.interests));
  }
}

export function renderProfileMahasiswa(onLogout: () => void) {
  const user = getUser();
  if (!user) {
    setRoute('login');
    return;
  }

  // Store logout callback
  logoutCallback = onLogout;

  // Load saved interests
  loadInterests();

  renderUI();
}

function renderUI() {
  const user = getUser();
  if (!user) return;

  const app = document.querySelector<HTMLDivElement>('#app')!;

  // Get user additional data - try multiple possible field names
  const nim = (user as any).nim || (user as any).NIM || '';
  const major = (user as any).major || (user as any).Major || (user as any).program_studi || '';
  const noHp = (user as any).noHp || (user as any).noHP || (user as any).phone || (user as any).phone_number || '';
  const email = user.email || (user as any).email_address || '';
  // Make sure name is not email - try name_mahasiswa first for mahasiswa
  const userName = (user as any).name_mahasiswa || 
                   (user.name && user.name !== email ? user.name : "") || 
                   (user as any).full_name || 
                   '';

  app.innerHTML = `
    <!-- Header -->
    ${renderHeader('profile')}

    <div class="dashboard-container">
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
                  value="${userName}" 
                  disabled
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
                  value="${email}" 
                  disabled
                />
              </div>
              
              <div class="profile-form-group">
                <label for="profilePhone">Nomor Telepon</label>
                <input 
                  type="text" 
                  id="profilePhone" 
                  class="profile-input" 
                  value="${noHp}" 
                  disabled
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
                  value="${major}" 
                  disabled
                />
              </div>
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
          
          ${state.error ? `
            <div class="alert alert-error">
              <strong>Error:</strong> ${state.error}
              <button id="closeError" class="close-btn">×</button>
            </div>
          ` : ''}
          
          <div class="interests-input-container">
            <div class="interests-tags">
              ${state.interests.map((interest, index) => `
                <span class="interest-tag">
                  ${interest}
                  <button class="tag-remove" data-index="${index}">×</button>
                </span>
              `).join('')}
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

  if (logoutCallback) {
    setupEventListeners(logoutCallback);
    // Setup header listeners with navigation
    setupHeaderListeners({ 
      onLogout: logoutCallback,
      onProfile: () => {
        // Already on profile page
      },
      onDashboard: () => {
        setRoute('dashboard');
        window.dispatchEvent(new CustomEvent('routechange'));
      }
    });
  }
}

function setupEventListeners(onLogout: () => void) {
  // Add interest
  const addBtn = document.getElementById('addInterestBtn');
  const interestInput = document.getElementById('interestInput') as HTMLInputElement;

  addBtn?.addEventListener('click', handleAddInterest);
  interestInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddInterest();
    }
  });

  // Remove interest tags
  document.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt((e.target as HTMLElement).dataset.index || '0');
      state.interests.splice(index, 1);
      saveInterests();
      renderUI();
    });
  });

  // Close error
  document.getElementById('closeError')?.addEventListener('click', () => {
    state.error = null;
    renderUI();
  });
}

function handleAddInterest() {
  const interestInput = document.getElementById('interestInput') as HTMLInputElement;
  const value = interestInput?.value.trim();

  if (!value) {
    state.error = 'Minat penelitian tidak boleh kosong';
    renderUI();
    return;
  }

  if (state.interests.includes(value)) {
    state.error = 'Minat penelitian ini sudah ditambahkan';
    renderUI();
    return;
  }

  state.interests.push(value);
  state.inputValue = '';
  state.error = null;
  if (interestInput) {
    interestInput.value = '';
  }
  
  saveInterests();
  renderUI();
}

