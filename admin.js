// --- Configuration ---
const TOTAL_SLOTS = 1000;
const INITIAL_FILLED_COUNT = 47;
const PRICE_PER_SITE = 1500;

// --- API & Cloud Storage Helpers ---
const API_URL = '/.netlify/functions/api';

async function fetchFromStore(key, defaultValue) {
  try {
    const res = await fetch(`${API_URL}?key=${key}`);
    if (res.ok) {
      const data = await res.json();
      return data !== null ? data : defaultValue;
    }
  } catch (err) {
    console.warn(`Failed to fetch ${key} from Netlify Blobs, falling back to localStorage:`, err);
  }
  
  // Fallback to localStorage
  const localData = localStorage.getItem(key);
  return localData ? JSON.parse(localData) : defaultValue;
}

async function saveToStore(key, value) {
  // Save to localStorage immediately as a local copy/backup
  localStorage.setItem(key, JSON.stringify(value));
  
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': '6032.,Elif.' // Existing admin password for lightweight verification
      },
      body: JSON.stringify({ key, value })
    });
    if (res.ok) {
      console.log(`Saved ${key} to Netlify Blobs successfully.`);
      return true;
    }
  } catch (err) {
    console.error(`Failed to save ${key} to Netlify Blobs:`, err);
  }
  return false;
}

// --- State & Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Admin JS Initializing...');
  await initAdmin();
});

async function initAdmin() {
  // Selectors inside init to ensure DOM is ready
  const navItems = document.querySelectorAll('.nav-item[data-view]');
  const views = document.querySelectorAll('.view');
  const viewTitle = document.querySelector('#viewTitle');
  
  // Navigation Handler
  navItems.forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      console.log('Switching to view:', targetView);

      // Update Sidebar UI
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Show Correct View
      views.forEach(view => view.classList.remove('active'));
      const activeView = document.querySelector(`#view-${targetView}`);
      if (activeView) activeView.classList.add('active');

      // Update Header Title
      if (viewTitle) viewTitle.textContent = item.textContent.trim().replace('!', '');

      // Refresh Data
      await updateDashboardData();
    });
  });

  // Slot Update Form Handler
  const quickSlotForm = document.querySelector('#quickSlotForm');
  if (quickSlotForm) {
    quickSlotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('Slot update form submitted');
      
      const no = document.querySelector('#slotNo').value;
      const name = document.querySelector('#slotFirmName').value;
      const url = document.querySelector('#slotUrl').value;
      const logoInput = document.querySelector('#slotLogo');

      if (!no || no < 1 || no > 1000) {
        alert('Lütfen 1-1000 arası geçerli bir numara girin.');
        return;
      }

      let logoData = null;
      if (logoInput.files && logoInput.files[0]) {
        try {
          logoData = await convertToBase64(logoInput.files[0]);
        } catch (err) {
          console.error('Logo conversion error:', err);
        }
      }

      const grid = await fetchFromStore('firmsGrid', {});
      
      // Keep existing logo if no new logo is uploaded
      const existingLogo = grid[no] ? grid[no].logo : null;
      
      grid[no] = { 
        name, 
        url, 
        logo: logoData || existingLogo,
        icon: '✅' 
      };
      
      await saveToStore('firmsGrid', grid);
      console.log('Slot updated in Netlify Blobs:', no);
      
      await updateDashboardData();
      window.alert(`Slot #${no} başarıyla güncellendi!`);
      quickSlotForm.reset();
    });
  }

  // Customer Handlers
  const addCustomerBtn = document.querySelector('#addCustomerBtn');
  const customerDetailPanel = document.querySelector('#customerDetailPanel');
  const customerDetailForm = document.querySelector('#customerDetailForm');

  if (addCustomerBtn) {
    addCustomerBtn.addEventListener('click', () => {
      if (customerDetailForm) customerDetailForm.reset();
      document.querySelector('#custId').value = '';
      document.querySelector('#detailTitle').textContent = 'Yeni Müşteri Ekle';
      if (customerDetailPanel) customerDetailPanel.style.display = 'block';
    });
  }

  if (customerDetailForm) {
    customerDetailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.querySelector('#custId').value;
      const customers = await fetchFromStore('customers', []);
      
      const customerData = {
        id: id ? parseInt(id) : Date.now(),
        custName: document.querySelector('#custName').value,
        custDomain: document.querySelector('#custDomain').value,
        custDomainStart: document.querySelector('#custDomainStart').value,
        custDomainEnd: document.querySelector('#custDomainEnd').value,
        custHosting: document.querySelector('#custHosting').value,
        custHostingEnd: document.querySelector('#custHostingEnd').value,
        custNotes: document.querySelector('#custNotes').value,
        custPaymentStatus: document.querySelector('#custPaymentStatus').value,
        custSupportStatus: document.querySelector('#custSupportStatus').value
      };

      if (id) {
        const idx = customers.findIndex(c => c.id == id);
        if (idx !== -1) customers[idx] = customerData;
      } else {
        customers.push(customerData);
      }

      await saveToStore('customers', customers);
      await updateDashboardData();
      if (customerDetailPanel) customerDetailPanel.style.display = 'none';
      alert('Müşteri bilgileri kaydedildi.');
    });
  }

  // Clear Applications
  const clearAppsBtn = document.querySelector('#clearApps');
  if (clearAppsBtn) {
    clearAppsBtn.addEventListener('click', async () => {
      if (confirm('Tüm başvuruları silmek istediğinize emin misiniz?')) {
        await saveToStore('applications', []);
        await updateDashboardData();
      }
    });
  }

  // Agenda Handler
  const agendaForm = document.querySelector('#agendaForm');
  if (agendaForm) {
    agendaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = document.querySelector('#agendaInput').value;
      const date = document.querySelector('#agendaDate').value;
      
      const agenda = await fetchFromStore('agenda', []);
      agenda.push({
        id: Date.now(),
        text,
        date,
        completed: false
      });
      
      await saveToStore('agenda', agenda);
      agendaForm.reset();
      await updateDashboardData();
    });
  }

  // Settings Handler
  const settingsForm = document.querySelector('#settingsForm');
  if (settingsForm) {
    // Load current settings
    const settings = await fetchFromStore('siteSettings', {
      email: 'info@kolaywebci.com',
      phone: '0555 123 45 67',
      whatsapp: '905551234567'
    });
    
    document.querySelector('#setEmail').value = settings.email;
    document.querySelector('#setPhone').value = settings.phone;
    document.querySelector('#setWhatsapp').value = settings.whatsapp;

    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newSettings = {
        email: document.querySelector('#setEmail').value,
        phone: document.querySelector('#setPhone').value,
        whatsapp: document.querySelector('#setWhatsapp').value
      };
      
      await saveToStore('siteSettings', newSettings);
      alert('Ayarlar kaydedildi. Değişiklikler anasayfada görünecektir.');
    });
  }

  // Portfolio Handlers
  const addPortfolioBtn = document.querySelector('#addPortfolioBtn');
  const portfolioDetailPanel = document.querySelector('#portfolioDetailPanel');
  const portfolioDetailForm = document.querySelector('#portfolioDetailForm');

  if (addPortfolioBtn) {
    addPortfolioBtn.addEventListener('click', () => {
      if (portfolioDetailForm) portfolioDetailForm.reset();
      document.querySelector('#portId').value = '';
      document.querySelector('#portfolioDetailTitle').textContent = 'Yeni Referans Ekle';
      if (portfolioDetailPanel) portfolioDetailPanel.style.display = 'block';
    });
  }

  if (portfolioDetailForm) {
    portfolioDetailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = document.querySelector('#portId').value;
      const name = document.querySelector('#portName').value;
      const subtitle = document.querySelector('#portSubtitle').value;
      const url = document.querySelector('#portUrl').value;
      const imageInput = document.querySelector('#portImage');
      const imageFileInput = document.querySelector('#portImageFile');

      let logoData = imageInput.value;

      if (imageFileInput.files && imageFileInput.files[0]) {
        try {
          logoData = await convertToBase64(imageFileInput.files[0]);
        } catch (err) {
          console.error('Portfolio image conversion error:', err);
        }
      }

      const portfolio = await fetchFromStore('sitePortfolio', []);
      
      const projectData = {
        id: id ? parseInt(id) : Date.now(),
        name,
        subtitle,
        image: logoData || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=600',
        url
      };

      if (id) {
        const idx = portfolio.findIndex(p => p.id == id);
        if (idx !== -1) portfolio[idx] = projectData;
      } else {
        portfolio.push(projectData);
      }

      await saveToStore('sitePortfolio', portfolio);
      await updateDashboardData();
      if (portfolioDetailPanel) portfolioDetailPanel.style.display = 'none';
      alert('Referans bilgileri kaydedildi.');
    });
  }

  // --- Promo Handler ---
  const promoForm = document.querySelector('#promoForm');
  if (promoForm) {
    // Load current promo settings
    const promo = await fetchFromStore('dailyPromo', {
      active: false,
      firmName: '',
      url: '',
      text: '',
      image: ''
    });

    document.querySelector('#promoActive').checked = promo.active;
    document.querySelector('#promoFirmName').value = promo.firmName || '';
    document.querySelector('#promoUrl').value = promo.url || '';
    document.querySelector('#promoText').value = promo.text || '';
    document.querySelector('#promoImage').value = promo.image || '';

    // Function to update admin preview
    const updateAdminPromoPreview = () => {
      const active = document.querySelector('#promoActive').checked;
      const firmName = document.querySelector('#promoFirmName').value;
      const url = document.querySelector('#promoUrl').value;
      const text = document.querySelector('#promoText').value;
      const img = document.querySelector('#promoImage').value || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=600';

      const previewDiv = document.querySelector('#adminPromoPreview');
      const emptyMsg = document.querySelector('#adminPromoPreviewEmpty');

      if (active && firmName) {
        document.querySelector('#adminPromoPreviewTitle').textContent = firmName;
        document.querySelector('#adminPromoPreviewText').textContent = text || 'Lütfen tanıtım yazısı girin.';
        document.querySelector('#adminPromoPreviewImg').src = img;
        
        previewDiv.style.display = 'block';
        emptyMsg.style.display = 'none';
      } else {
        previewDiv.style.display = 'none';
        emptyMsg.style.display = 'block';
      }
    };

    // Initial preview update
    updateAdminPromoPreview();

    // Listen to changes for live preview
    document.querySelector('#promoActive').addEventListener('change', updateAdminPromoPreview);
    document.querySelector('#promoFirmName').addEventListener('input', updateAdminPromoPreview);
    document.querySelector('#promoText').addEventListener('input', updateAdminPromoPreview);
    document.querySelector('#promoImage').addEventListener('input', updateAdminPromoPreview);

    // Image file input change listener
    const promoImageFileInput = document.querySelector('#promoImageFile');
    if (promoImageFileInput) {
      promoImageFileInput.addEventListener('change', async () => {
        if (promoImageFileInput.files && promoImageFileInput.files[0]) {
          try {
            const base64Data = await convertToBase64(promoImageFileInput.files[0]);
            document.querySelector('#promoImage').value = base64Data;
            updateAdminPromoPreview();
          } catch (err) {
            console.error('Promo image conversion error:', err);
          }
        }
      });
    }

    promoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const active = document.querySelector('#promoActive').checked;
      const firmName = document.querySelector('#promoFirmName').value.trim();
      const url = document.querySelector('#promoUrl').value.trim();
      const text = document.querySelector('#promoText').value.trim();
      const image = document.querySelector('#promoImage').value.trim();

      const newPromo = {
        active,
        firmName,
        url,
        text,
        image
      };

      await saveToStore('dailyPromo', newPromo);
      alert('Günün tanıtım reklamı ayarları başarıyla kaydedildi.');
      updateAdminPromoPreview();
    });
  }
}

// Helper: Convert File to Base64
function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// --- Data Refresh Logic ---
async function updateDashboardData() {
  console.log('Refreshing Dashboard Data...');
  
  const apps = await fetchFromStore('applications', []);
  const customers = await fetchFromStore('customers', []);
  
  // Grid Data & Stat Logic
  let grid = await fetchFromStore('firmsGrid', null);
  if (!grid) {
    grid = {};
    for (let i = 1; i <= INITIAL_FILLED_COUNT; i++) {
      grid[i] = { name: `Firma #${i}`, icon: '✅', url: '' };
    }
    await saveToStore('firmsGrid', grid);
  }
  
  const gridCount = Object.keys(grid).length;

  // 1. Update Stats
  const statTotalApps = document.querySelector('#totalApps');
  const statFilled = document.querySelector('#filledSlots');
  const statEmpty = document.querySelector('#emptySlots');
  const statRev = document.querySelector('#potentialRev');
  const appBadge = document.querySelector('#appBadge');

  if (statTotalApps) statTotalApps.textContent = apps.length;
  if (statFilled) statFilled.textContent = gridCount;
  if (statEmpty) statEmpty.textContent = TOTAL_SLOTS - gridCount;
  if (statRev) statRev.textContent = `${gridCount * PRICE_PER_SITE} TL`;
  if (appBadge) appBadge.textContent = apps.length;

  const gridFilledBadge = document.querySelector('#gridFilledCount');
  if (gridFilledBadge) gridFilledBadge.textContent = `${gridCount} Dolu`;

  // 2. Update Tables
  renderApplicationsTable(apps);
  renderCustomerTable(customers);
  await renderGridManager(grid);
  await renderAgenda();
  await renderReviews();
  await renderPortfolioTable();
}

async function renderAgenda() {
  const container = document.querySelector('#agendaList');
  if (!container || !document.querySelector('#view-agenda').classList.contains('active')) return;

  const agenda = await fetchFromStore('agenda', []);
  
  if (agenda.length === 0) {
    container.innerHTML = '<div class="agenda-empty">Henüz bir planlama yapılmamış.</div>';
    return;
  }

  // Sort by date
  agenda.sort((a, b) => new Date(a.date) - new Date(b.date));

  container.innerHTML = agenda.map(item => `
    <div class="agenda-item ${item.completed ? 'completed' : ''}">
      <input type="checkbox" class="agenda-checkbox" ${item.completed ? 'checked' : ''} 
        onchange="handleAgendaAction(${item.id}, 'toggle')">
      <div class="agenda-content">
        <span class="agenda-text">${item.text}</span>
        <div class="agenda-info">
          <span class="agenda-date">📅 ${new Date(item.date).toLocaleDateString('tr-TR')}</span>
        </div>
      </div>
      <button class="btn-agenda-delete" onclick="handleAgendaAction(${item.id}, 'delete')">🗑️</button>
    </div>
  `).join('');
}

function renderApplicationsTable(apps) {
  const recentBody = document.querySelector('#recentAppsBody');
  const allBody = document.querySelector('#allAppsBody');
  
  const html = [...apps].reverse().map(app => `
    <tr>
      <td>${new Date(app.date).toLocaleDateString('tr-TR')}</td>
      <td><strong>${app.firmaAdi}</strong></td>
      <td>${app.adSoyad || app.sektor}</td>
      <td>${app.telefon || '-'}</td>
      <td>${app.sektor || '-'}</td>
      <td><span class="status-badge status-${app.status}">${app.status === 'pending' ? 'Bekliyor' : 'Onaylandı'}</span></td>
      <td>
        <button class="btn-action btn-approve" onclick="handleAppAction(${app.id}, 'approve')">Onayla</button>
        <button class="btn-action btn-delete" onclick="handleAppAction(${app.id}, 'delete')">Sil</button>
      </td>
    </tr>
  `).join('');

  if (allBody) allBody.innerHTML = html;
  if (recentBody) recentBody.innerHTML = html.split('</tr>').slice(0, 5).join('</tr>');
}

function renderCustomerTable(customers) {
  const body = document.querySelector('#customerTableBody');
  const badge = document.querySelector('#expiryBadge');
  if (!body) return;

  const today = new Date();
  let urgent = 0;

  body.innerHTML = customers.map(cust => {
    let expiryHTML = '<span class="expiry-safe">Aktif</span>';
    if (cust.custDomainEnd) {
      const diff = Math.ceil((new Date(cust.custDomainEnd) - today) / 86400000);
      if (diff < 0) { expiryHTML = '🔴 Süresi Doldu!'; urgent++; }
      else if (diff <= 30) { expiryHTML = `🟠 ${diff} Gün`; urgent++; }
      else { expiryHTML = `🟢 ${diff} Gün`; }
    }
    return `
      <tr>
        <td><strong>${cust.custName}</strong></td>
        <td>${expiryHTML}</td>
        <td><span class="status-badge status-${cust.custPaymentStatus}">${cust.custPaymentStatus}</span></td>
        <td>
          <button class="btn-action btn-edit" onclick="handleCustAction(${cust.id}, 'edit')">✏️</button>
          <button class="btn-action btn-delete" onclick="handleCustAction(${cust.id}, 'delete')">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  if (badge) {
    badge.style.display = urgent > 0 ? 'inline-block' : 'none';
    badge.textContent = urgent;
  }
}

async function renderGridManager(grid) {
  const container = document.querySelector('#adminFirmsGrid');
  if (!container || !document.querySelector('#view-grid').classList.contains('active')) return;

  container.innerHTML = '';
  for (let i = 1; i <= TOTAL_SLOTS; i++) {
    const slot = document.createElement('div');
    slot.className = `admin-slot ${grid[i] ? 'filled' : ''}`;
    slot.textContent = i;
    slot.onclick = async () => {
      if (grid[i]) {
        const confirmClear = confirm(`Slot #${i} dolu (${grid[i].name}).\n\nBu slotu BOŞALTMAK (iptal etmek) istiyorsanız [Tamam] butonuna basın.\nDÜZENLEMEK istiyorsanız [İptal] butonuna basın.`);
        if (confirmClear) {
          delete grid[i];
          await saveToStore('firmsGrid', grid);
          await updateDashboardData();
          alert(`Slot #${i} başarıyla boşaltıldı!`);
          return;
        }
      }
      
      // Fill the form
      document.querySelector('#slotNo').value = i;
      document.querySelector('#slotFirmName').value = grid[i] ? grid[i].name : '';
      document.querySelector('#slotUrl').value = grid[i] ? grid[i].url : '';
      
      // Switch to dashboard view
      const dashboardTab = document.querySelector('[data-view="dashboard"]');
      if (dashboardTab) dashboardTab.click();

      // Scroll to form and focus
      setTimeout(() => {
        const form = document.querySelector('#quickSlotForm');
        if (form) {
          form.scrollIntoView({ behavior: 'smooth' });
          document.querySelector('#slotFirmName').focus();
        }
      }, 100);
    };
    container.appendChild(slot);
  }
}

// --- Global Handlers (for onclick attributes) ---
window.handleAppAction = async (id, action) => {
  let apps = await fetchFromStore('applications', []);
  if (action === 'approve') {
    const idx = apps.findIndex(a => a.id === id);
    if (idx !== -1) apps[idx].status = 'approved';
  } else if (action === 'delete') {
    if (confirm('Silmek istediğinize emin misiniz?')) apps = apps.filter(a => a.id !== id);
  }
  await saveToStore('applications', apps);
  await updateDashboardData();
};

window.handleCustAction = async (id, action) => {
  let customers = await fetchFromStore('customers', []);
  if (action === 'delete') {
    if (confirm('Silmek istediğinize emin misiniz?')) {
      customers = customers.filter(c => c.id !== id);
      await saveToStore('customers', customers);
      await updateDashboardData();
    }
  } else if (action === 'edit') {
    const cust = customers.find(c => c.id === id);
    if (cust) {
      document.querySelector('#custId').value = cust.id;
      document.querySelector('#custName').value = cust.custName || '';
      document.querySelector('#custDomain').value = cust.custDomain || '';
      document.querySelector('#custDomainStart').value = cust.custDomainStart || '';
      document.querySelector('#custDomainEnd').value = cust.custDomainEnd || '';
      document.querySelector('#custHosting').value = cust.custHosting || '';
      document.querySelector('#custHostingEnd').value = cust.custHostingEnd || '';
      document.querySelector('#custNotes').value = cust.custNotes || '';
      document.querySelector('#custPaymentStatus').value = cust.custPaymentStatus || 'pending';
      document.querySelector('#custSupportStatus').value = cust.custSupportStatus || 'none';
      
      document.querySelector('#detailTitle').textContent = 'Müşteri Düzenle';
      document.querySelector('#customerDetailPanel').style.display = 'block';
      document.querySelector('#customerDetailPanel').scrollIntoView({ behavior: 'smooth' });
    }
  }
};

window.handleAgendaAction = async (id, action) => {
  let agenda = await fetchFromStore('agenda', []);
  if (action === 'toggle') {
    const idx = agenda.findIndex(a => a.id === id);
    if (idx !== -1) agenda[idx].completed = !agenda[idx].completed;
  } else if (action === 'delete') {
    agenda = agenda.filter(a => a.id !== id);
  }
  await saveToStore('agenda', agenda);
  await renderAgenda();
};

// Logout Handler
document.addEventListener('click', (e) => {
  if (e.target.id === 'logoutBtn' || e.target.closest('#logoutBtn')) {
    if (confirm('Çıkış yapılsın mı?')) {
      sessionStorage.clear();
      window.location.href = '/login.html';
    }
  }
});

// ===== REVIEW MANAGEMENT =====
let currentReviewFilter = 'pending';

async function renderReviews() {
  const container = document.querySelector('#adminReviewsList');
  if (!container) return;

  const reviews = await fetchFromStore('reviews', []);
  
  // Update stats
  const pending = reviews.filter(r => r.status === 'pending');
  const approved = reviews.filter(r => r.status === 'approved');
  const rejected = reviews.filter(r => r.status === 'rejected');

  const pendingCount = document.querySelector('#pendingReviewCount');
  const approvedCount = document.querySelector('#approvedReviewCount');
  const rejectedCount = document.querySelector('#rejectedReviewCount');
  const totalCount = document.querySelector('#totalReviewCount');
  const reviewBadge = document.querySelector('#reviewBadge');

  if (pendingCount) pendingCount.textContent = pending.length;
  if (approvedCount) approvedCount.textContent = approved.length;
  if (rejectedCount) rejectedCount.textContent = rejected.length;
  if (totalCount) totalCount.textContent = reviews.length;
  if (reviewBadge) reviewBadge.textContent = pending.length;

  // Filter reviews
  let filtered = reviews;
  if (currentReviewFilter !== 'all') {
    filtered = reviews.filter(r => r.status === currentReviewFilter);
  }

  // Sort: newest first
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filtered.length === 0) {
    const messages = {
      pending: 'Onay bekleyen yorum bulunmuyor.',
      approved: 'Henüz onaylanan yorum yok.',
      rejected: 'Reddedilen yorum bulunmuyor.',
      all: 'Henüz hiç yorum gönderilmemiş.'
    };
    container.innerHTML = `
      <div class="reviews-empty">
        <div class="empty-icon">💬</div>
        <h4>${messages[currentReviewFilter]}</h4>
        <p>Firmalar anasayfadaki formu kullanarak yorum gönderebilir.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(review => {
    const initials = review.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    const formattedDate = new Date(review.date).toLocaleDateString('tr-TR', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const statusLabels = {
      pending: 'Onay Bekliyor',
      approved: 'Onaylandı',
      rejected: 'Reddedildi'
    };

    let actionsHTML = '';
    if (review.status === 'pending') {
      actionsHTML = `
        <button class="btn-review-action btn-review-approve" onclick="handleReviewAction(${review.id}, 'approve')">✅ Onayla</button>
        <button class="btn-review-action btn-review-reject" onclick="handleReviewAction(${review.id}, 'reject')">❌ Reddet</button>
        <button class="btn-review-action btn-review-delete" onclick="handleReviewAction(${review.id}, 'delete')">🗑️ Sil</button>
      `;
    } else if (review.status === 'approved') {
      actionsHTML = `
        <button class="btn-review-action btn-review-reject" onclick="handleReviewAction(${review.id}, 'reject')">❌ Geri Al</button>
        <button class="btn-review-action btn-review-delete" onclick="handleReviewAction(${review.id}, 'delete')">🗑️ Sil</button>
      `;
    } else {
      actionsHTML = `
        <button class="btn-review-action btn-review-approve" onclick="handleReviewAction(${review.id}, 'approve')">✅ Onayla</button>
        <button class="btn-review-action btn-review-delete" onclick="handleReviewAction(${review.id}, 'delete')">🗑️ Sil</button>
      `;
    }

    return `
      <div class="review-admin-card status-${review.status}">
        <div class="review-card-body">
          <div class="review-card-header">
            <div class="review-card-avatar">${initials}</div>
            <div class="review-card-meta">
              <strong>${review.name}</strong>
              <span>${review.company} • ${review.sector} - ${review.city}</span>
            </div>
          </div>
          <div class="review-card-stars">${stars}</div>
          <div class="review-card-text">"${review.text}"</div>
          <div class="review-card-footer">
            <span class="review-card-date">📅 ${formattedDate}</span>
            <span class="review-card-status ${review.status}">${statusLabels[review.status]}</span>
          </div>
        </div>
        <div class="review-card-actions">
          ${actionsHTML}
        </div>
      </div>
    `;
  }).join('');
}

// Review Action Handler
window.handleReviewAction = async (id, action) => {
  let reviews = await fetchFromStore('reviews', []);
  
  if (action === 'approve') {
    const idx = reviews.findIndex(r => r.id === id);
    if (idx !== -1) reviews[idx].status = 'approved';
  } else if (action === 'reject') {
    const idx = reviews.findIndex(r => r.id === id);
    if (idx !== -1) reviews[idx].status = 'rejected';
  } else if (action === 'delete') {
    if (!confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
    reviews = reviews.filter(r => r.id !== id);
  }

  await saveToStore('reviews', reviews);
  await renderReviews();
};

// Review Tab Click Handlers
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.review-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentReviewFilter = tab.getAttribute('data-tab');
      await renderReviews();
    });
  });
});

// ===== PORTFOLIO MANAGEMENT =====
async function renderPortfolioTable() {
  const body = document.querySelector('#portfolioTableBody');
  if (!body) return;

  const portfolio = await fetchFromStore('sitePortfolio', []);
  
  if (portfolio.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--gray); padding: 20px;">
          Henüz hiçbir referans eklenmemiş.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = portfolio.map(project => `
    <tr>
      <td>
        <img src="${project.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=600'}" 
             alt="${project.name}" 
             style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border);" />
      </td>
      <td><strong>${project.name}</strong></td>
      <td>${project.subtitle || '-'}</td>
      <td><a href="${project.url || '#'}" target="_blank" style="color: var(--primary); text-decoration: none;">${project.url || '-'}</a></td>
      <td>
        <button class="btn-action btn-edit" onclick="handlePortfolioAction(${project.id}, 'edit')">✏️</button>
        <button class="btn-action btn-delete" onclick="handlePortfolioAction(${project.id}, 'delete')">🗑️</button>
      </td>
    </tr>
  `).join('');
}

window.handlePortfolioAction = async (id, action) => {
  let portfolio = await fetchFromStore('sitePortfolio', []);
  
  if (action === 'delete') {
    if (confirm('Bu referansı silmek istediğinize emin misiniz?')) {
      portfolio = portfolio.filter(p => p.id !== id);
      await saveToStore('sitePortfolio', portfolio);
      await updateDashboardData();
    }
  } else if (action === 'edit') {
    const project = portfolio.find(p => p.id === id);
    if (project) {
      document.querySelector('#portId').value = project.id;
      document.querySelector('#portName').value = project.name || '';
      document.querySelector('#portSubtitle').value = project.subtitle || '';
      document.querySelector('#portImage').value = project.image || '';
      document.querySelector('#portUrl').value = project.url || '';
      
      document.querySelector('#portfolioDetailTitle').textContent = 'Referans Düzenle';
      document.querySelector('#portfolioDetailPanel').style.display = 'block';
      document.querySelector('#portfolioDetailPanel').scrollIntoView({ behavior: 'smooth' });
    }
  }
};
