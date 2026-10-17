// ==============================================================================
// KOLAYWEBCI ENTERPRISE ADMIN ENGINE
// Integrated with Multi-Layer Persistent Storage Vault (IndexedDB + Cloud)
// Zero Data Loss Architecture & Executive Dashboard Controller
// ==============================================================================

import {
  fetchFromStore,
  saveToStore,
  requestStoragePersistence,
  isStoragePersisted,
  downloadBackupFile,
  restoreFromBackupJSON,
  getSavedSnapshots,
  restoreSnapshotById
} from './storageVault.js';

// Configuration
const TOTAL_SLOTS = 1000;
const INITIAL_FILLED_COUNT = 47;
const PRICE_PER_SITE = 5000;

// --- MODERN TOAST NOTIFICATION SYSTEM ---
function showToast(message, type = 'success', duration = 3500) {
  let container = document.getElementById('adminToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'adminToastContainer';
    container.className = 'admin-toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  toast.innerHTML = `
    <span class="admin-toast-icon">${icons[type] || 'ℹ️'}</span>
    <span class="admin-toast-body">${message}</span>
    <button class="admin-toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// Global alert override with non-intrusive toast
window.alert = function(msg) {
  let type = 'info';
  const lower = String(msg).toLowerCase();
  if (lower.includes('hata') || lower.includes('geçersiz') || lower.includes('başarısız')) {
    type = 'error';
  } else if (lower.includes('başarıyla') || lower.includes('kaydedildi') || lower.includes('güncellendi') || lower.includes('alındı')) {
    type = 'success';
  } else if (lower.includes('lütfen') || lower.includes('seçiniz') || lower.includes('uyarı')) {
    type = 'warning';
  }
  showToast(msg, type);
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  console.log('KolayWebci Enterprise Admin Initializing...');
  await initStorageHealth();
  await initAdmin();
});

// Request persistent storage from browser
async function initStorageHealth() {
  const isPersisted = await requestStoragePersistence();
  const healthText = document.getElementById('storageHealthText');
  const healthPill = document.getElementById('storageHealthPill');
  
  if (healthText) {
    healthText.textContent = isPersisted ? 'Kalıcı Hafıza: Korumalı' : 'Hafıza: Aktif';
  }
  if (healthPill && isPersisted) {
    healthPill.title = 'Tarayıcı kalıcı depolama onayı verdi. Veriler temizleme döngülerinde silinmez.';
  }
}

// --- MAIN ADMIN CONTROLLER ---
async function initAdmin() {
  // Mobile Nav Toggler
  const mobileToggleBtn = document.querySelector('#mobileToggleBtn');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.querySelector('#sidebarOverlay');

  function toggleMobileMenu() {
    if (sidebar && mobileToggleBtn && sidebarOverlay) {
      sidebar.classList.toggle('open');
      mobileToggleBtn.classList.toggle('active');
      sidebarOverlay.classList.toggle('active');
    }
  }

  function closeMobileMenu() {
    if (sidebar && mobileToggleBtn && sidebarOverlay) {
      sidebar.classList.remove('open');
      mobileToggleBtn.classList.remove('active');
      sidebarOverlay.classList.remove('active');
    }
  }

  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMobileMenu();
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeMobileMenu);
  }

  // Navigation Handler
  const navItems = document.querySelectorAll('.nav-item[data-view]');
  const views = document.querySelectorAll('.view');
  const viewTitle = document.querySelector('#viewTitle');
  
  navItems.forEach(item => {
    item.addEventListener('click', async (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');

      // Update Sidebar UI
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Show Correct View
      views.forEach(view => view.classList.remove('active'));
      const activeView = document.querySelector(`#view-${targetView}`);
      if (activeView) activeView.classList.add('active');

      // Update Header Title
      const text = item.querySelector('.nav-text') ? item.querySelector('.nav-text').textContent : item.textContent.trim();
      if (viewTitle) viewTitle.textContent = text.replace(/!/g, '').trim();

      closeMobileMenu();

      // Refresh Data for the view
      if (targetView === 'backup') {
        await renderBackupView();
      } else if (targetView === 'reviews') {
        await renderReviews();
      } else if (targetView === 'kanban') {
        await renderKanbanBoard();
      } else {
        await updateDashboardData();
      }
    });
  });

  // Top Action Backup & Restore Handlers
  const topQuickBackupBtn = document.querySelector('#topQuickBackupBtn');
  const downloadBackupBtn = document.querySelector('#downloadBackupBtn');
  const topQuickRestoreBtn = document.querySelector('#topQuickRestoreBtn');
  const topBackupFileInput = document.querySelector('#topBackupFileInput');
  const backupFileInput = document.querySelector('#backupFileInput');

  async function handleBackupDownload() {
    try {
      showToast('Yedek dosyası hazırlanıyor...', 'info');
      const filename = await downloadBackupFile();
      showToast(`Tüm verileriniz indirildi: ${filename}`, 'success', 5000);
      await renderBackupView();
    } catch (err) {
      showToast('Yedek indirme sırasında hata: ' + err.message, 'error');
    }
  }

  if (topQuickBackupBtn) topQuickBackupBtn.addEventListener('click', handleBackupDownload);
  if (downloadBackupBtn) downloadBackupBtn.addEventListener('click', handleBackupDownload);

  if (topQuickRestoreBtn && topBackupFileInput) {
    topQuickRestoreBtn.addEventListener('click', () => topBackupFileInput.click());
  }

  async function handleFileRestore(file) {
    if (!file) return;
    try {
      showToast('Yedek dosyası okunuyor...', 'info');
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target.result;
          const res = await restoreFromBackupJSON(content);
          if (res.success) {
            showToast(`Tebrikler! ${res.count} adet veri tablosu başarıyla geri yüklendi.`, 'success', 5000);
            await updateDashboardData();
            await renderBackupView();
          } else {
            showToast('Dosya içeriği geçerli bir KolayWebci yedeği değil.', 'error');
          }
        } catch (err) {
          showToast('Yedek yükleme hatası: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    } catch (err) {
      showToast('Dosya açılırken hata: ' + err.message, 'error');
    }
  }

  if (topBackupFileInput) {
    topBackupFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileRestore(e.target.files[0]);
        e.target.value = '';
      }
    });
  }

  if (backupFileInput) {
    backupFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileRestore(e.target.files[0]);
        e.target.value = '';
      }
    });
  }

  // Drag and drop for backup dropzone
  const backupDropzone = document.querySelector('#backupDropzone');
  if (backupDropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      backupDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        backupDropzone.style.borderColor = 'var(--primary)';
        backupDropzone.style.background = '#eff6ff';
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      backupDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        backupDropzone.style.borderColor = '#c7d2fe';
        backupDropzone.style.background = '#f8fafc';
      });
    });

    backupDropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        handleFileRestore(files[0]);
      }
    });
  }

  // Refresh Snapshots Button
  const refreshSnapshotsBtn = document.querySelector('#refreshSnapshotsBtn');
  if (refreshSnapshotsBtn) {
    refreshSnapshotsBtn.addEventListener('click', async () => {
      await renderSnapshotsTable();
      showToast('Kurtarma noktaları listesi yenilendi.');
    });
  }

  // Supabase Configuration Form
  const supabaseConfigForm = document.querySelector('#supabaseConfigForm');
  if (supabaseConfigForm) {
    // Pre-fill existing config
    try {
      const raw = localStorage.getItem('supabaseConfig');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.url) document.querySelector('#sbUrl').value = parsed.url;
        if (parsed.key) document.querySelector('#sbKey').value = parsed.key;
      }
    } catch {}

    supabaseConfigForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const url = document.querySelector('#sbUrl').value.trim();
      const key = document.querySelector('#sbKey').value.trim();

      if (!url || !key) {
        showToast('Lütfen Supabase URL ve Key alanlarını doldurun.', 'warning');
        return;
      }

      const config = { url, key, configuredAt: new Date().toISOString() };
      localStorage.setItem('supabaseConfig', JSON.stringify(config));
      await saveToStore('supabaseConfig', config);

      showToast('Supabase bulut bağlantı bilgileri kalıcı olarak kaydedildi.', 'success');
      await testSupabaseConnection(url, key);
      await renderBackupView();
    });

    const testSbBtn = document.querySelector('#testSbBtn');
    if (testSbBtn) {
      testSbBtn.addEventListener('click', async () => {
        const url = document.querySelector('#sbUrl').value.trim();
        const key = document.querySelector('#sbKey').value.trim();
        await testSupabaseConnection(url, key);
      });
    }

    const copySqlBtn = document.querySelector('#copySqlBtn');
    if (copySqlBtn) {
      copySqlBtn.addEventListener('click', () => {
        const sql = document.querySelector('#supabaseSqlCode').textContent;
        navigator.clipboard.writeText(sql).then(() => {
          showToast('SQL kodu panoya kopyalandı! Supabase SQL editörüne yapıştırabilirsiniz.', 'success');
        });
      });
    }
  }

  // Slot Update Form Handler
  const quickSlotForm = document.querySelector('#quickSlotForm');
  if (quickSlotForm) {
    quickSlotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const no = document.querySelector('#slotNo').value;
      const name = document.querySelector('#slotFirmName').value;
      const url = document.querySelector('#slotUrl').value;
      const logoInput = document.querySelector('#slotLogo');

      if (!no || no < 1 || no > 1000) {
        showToast('Lütfen 1-1000 arası geçerli bir numara girin.', 'warning');
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
      const existingLogo = grid[no] ? grid[no].logo : null;

      grid[no] = { 
        name, 
        url, 
        logo: logoData || existingLogo,
        icon: '✅' 
      };

      await saveToStore('firmsGrid', grid);
      await updateDashboardData();
      showToast(`Slot #${no} (${name}) başarıyla kaydedildi!`, 'success');
      quickSlotForm.reset();
    });
  }

  // Customer Form Handler
  const addCustomerBtn = document.querySelector('#addCustomerBtn');
  const customerDetailPanel = document.querySelector('#customerDetailPanel');
  const customerDetailForm = document.querySelector('#customerDetailForm');

  if (addCustomerBtn) {
    addCustomerBtn.addEventListener('click', () => {
      if (customerDetailForm) customerDetailForm.reset();
      document.querySelector('#custId').value = '';
      document.querySelector('#detailTitle').textContent = 'Yeni Müşteri Ekle';
      if (customerDetailPanel) {
        customerDetailPanel.style.display = 'block';
        customerDetailPanel.scrollIntoView({ behavior: 'smooth' });
      }
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
      showToast('Müşteri bilgileri güvenle kaydedildi.', 'success');
    });
  }

  // Clear Applications
  const clearAppsBtn = document.querySelector('#clearApps');
  if (clearAppsBtn) {
    clearAppsBtn.addEventListener('click', async () => {
      if (confirm('Tüm başvuruları silmek istediğinize emin misiniz? (Öncesinde yedek almanız önerilir)')) {
        await saveToStore('applications', []);
        await updateDashboardData();
        showToast('Başvuru listesi temizlendi.');
      }
    });
  }

  // Export Applications to CSV / Excel
  const exportAppsCsv = document.querySelector('#exportAppsCsv');
  if (exportAppsCsv) {
    exportAppsCsv.addEventListener('click', async () => {
      const apps = await fetchFromStore('applications', []);
      if (!apps || apps.length === 0) {
        showToast('İndirilecek başvuru bulunmuyor.', 'info');
        return;
      }

      let csv = '\uFEFF'; // UTF-8 BOM for Turkish Excel
      csv += 'Tarih,Firma Adı,Yetkili,Telefon,Sektör,Durum,Detaylar\n';
      apps.forEach(a => {
        const d = a.date ? new Date(a.date).toLocaleDateString('tr-TR') : '-';
        const f = `"${(a.firmaAdi || '').replace(/"/g, '""')}"`;
        const y = `"${(a.adSoyad || '').replace(/"/g, '""')}"`;
        const t = `"${(a.telefon || '').replace(/"/g, '""')}"`;
        const s = `"${(a.sektor || '').replace(/"/g, '""')}"`;
        const st = `"${a.status || 'pending'}"`;
        const dt = `"${(a.ekHizmetler || a.notes || '').replace(/"/g, '""')}"`;
        csv += `${d},${f},${y},${t},${s},${st},${dt}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kolaywebci-basvurular-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Başvurular Excel / CSV olarak indirildi.', 'success');
    });
  }

  // Search Filter on Applications
  const appSearchInput = document.querySelector('#appSearchInput');
  if (appSearchInput) {
    appSearchInput.addEventListener('input', () => {
      filterApplicationsList();
    });
  }

  // Status Filter Pills on Applications
  const appStatusFilters = document.querySelectorAll('#appStatusFilters .filter-pill');
  appStatusFilters.forEach(pill => {
    pill.addEventListener('click', () => {
      appStatusFilters.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      filterApplicationsList();
    });
  });

  // Customer Search Filter
  const custSearchInput = document.querySelector('#custSearchInput');
  if (custSearchInput) {
    custSearchInput.addEventListener('input', async () => {
      const q = custSearchInput.value.toLowerCase().trim();
      const customers = await fetchFromStore('customers', []);
      const filtered = customers.filter(c => 
        (c.custName && c.custName.toLowerCase().includes(q)) ||
        (c.custDomain && c.custDomain.toLowerCase().includes(q))
      );
      renderCustomerTable(filtered);
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
      await renderAgenda();
      showToast('Yeni ajanda notu eklendi.');
    });
  }

  // Settings Handler
  const settingsForm = document.querySelector('#settingsForm');
  if (settingsForm) {
    const settings = await fetchFromStore('siteSettings', {});
    if (settings) {
      if (settings.email) document.querySelector('#setEmail').value = settings.email;
      if (settings.phone) document.querySelector('#setPhone').value = settings.phone;
      if (settings.whatsapp) document.querySelector('#setWhatsapp').value = settings.whatsapp;
    }

    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.querySelector('#setEmail').value;
      const phone = document.querySelector('#setPhone').value;
      const whatsapp = document.querySelector('#setWhatsapp').value;

      await saveToStore('siteSettings', { email, phone, whatsapp });
      showToast('Genel site ayarları başarıyla güncellendi.', 'success');
    });
  }

  // Portfolio Handlers
  const addPortfolioBtn = document.querySelector('#addPortfolioBtn');
  const portfolioDetailPanel = document.querySelector('#portfolioDetailPanel');
  const portfolioDetailForm = document.querySelector('#portfolioDetailForm');
  const portImageFile = document.querySelector('#portImageFile');

  if (portImageFile) {
    portImageFile.addEventListener('change', async () => {
      if (portImageFile.files && portImageFile.files[0]) {
        try {
          const b64 = await convertToBase64(portImageFile.files[0]);
          document.querySelector('#portImage').value = b64;
          showToast('Görsel optimize edildi ve eklendi.');
        } catch (err) {
          console.error(err);
        }
      }
    });
  }

  if (addPortfolioBtn) {
    addPortfolioBtn.addEventListener('click', () => {
      if (portfolioDetailForm) portfolioDetailForm.reset();
      document.querySelector('#portId').value = '';
      document.querySelector('#portfolioDetailTitle').textContent = 'Yeni Referans Ekle';
      if (portfolioDetailPanel) {
        portfolioDetailPanel.style.display = 'block';
        portfolioDetailPanel.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  if (portfolioDetailForm) {
    portfolioDetailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.querySelector('#portId').value;
      const portfolio = await fetchFromStore('sitePortfolio', []);

      const itemData = {
        id: id ? parseInt(id) : Date.now(),
        name: document.querySelector('#portName').value,
        subtitle: document.querySelector('#portSubtitle').value,
        image: document.querySelector('#portImage').value,
        url: document.querySelector('#portUrl').value
      };

      if (id) {
        const idx = portfolio.findIndex(p => p.id == id);
        if (idx !== -1) portfolio[idx] = itemData;
      } else {
        portfolio.push(itemData);
      }

      await saveToStore('sitePortfolio', portfolio);
      await updateDashboardData();
      if (portfolioDetailPanel) portfolioDetailPanel.style.display = 'none';
      showToast('Referans projesi vitrine kaydedildi.', 'success');
    });
  }

  // Daily Promo Handler
  const promoForm = document.querySelector('#promoForm');
  if (promoForm) {
    const promo = await fetchFromStore('dailyPromo', null);
    if (promo) {
      document.querySelector('#promoActive').checked = !!promo.active;
      document.querySelector('#promoFirmName').value = promo.firmName || '';
      document.querySelector('#promoUrl').value = promo.url || '';
      document.querySelector('#promoText').value = promo.text || '';
      document.querySelector('#promoImage').value = promo.image || '';
    }

    const promoImageFileInput = document.querySelector('#promoImageFile');
    if (promoImageFileInput) {
      promoImageFileInput.addEventListener('change', async () => {
        if (promoImageFileInput.files && promoImageFileInput.files[0]) {
          try {
            const b64 = await convertToBase64(promoImageFileInput.files[0]);
            document.querySelector('#promoImage').value = b64;
            showToast('Tanıtım görseli optimize edildi.');
          } catch (err) {
            console.error(err);
          }
        }
      });
    }

    promoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPromo = {
        active: document.querySelector('#promoActive').checked,
        firmName: document.querySelector('#promoFirmName').value.trim(),
        url: document.querySelector('#promoUrl').value.trim(),
        text: document.querySelector('#promoText').value.trim(),
        image: document.querySelector('#promoImage').value.trim()
      };

      await saveToStore('dailyPromo', newPromo);
      showToast('Günün tanıtım reklamı ayarları kaydedildi.', 'success');
    });
  }

  // Legacy Migration Tool Handler
  const startMigrationBtn = document.querySelector('#startMigrationBtn');
  if (startMigrationBtn) {
    startMigrationBtn.addEventListener('click', async () => {
      const urlInput = document.querySelector('#migrationUrl');
      const statusDiv = document.querySelector('#migrationStatus');
      let netlifyUrl = urlInput.value.trim().replace(/\/+$/, '');
      if (!netlifyUrl) {
        showToast('Lütfen eski site adresini girin.', 'warning');
        return;
      }
      if (!netlifyUrl.startsWith('http')) netlifyUrl = 'https://' + netlifyUrl;

      statusDiv.style.display = 'block';
      statusDiv.style.background = '#e0e7ff';
      statusDiv.style.color = '#3730a3';
      statusDiv.textContent = 'Eski site ile bağlantı kuruluyor...';
      startMigrationBtn.disabled = true;

      const keys = ['firmsGrid', 'customers', 'agenda', 'siteSettings', 'sitePortfolio', 'dailyPromo', 'applications', 'reviews'];
      let count = 0;

      for (const k of keys) {
        try {
          const res = await fetch(`${netlifyUrl}/.netlify/functions/api?key=${k}`);
          if (res.ok) {
            const data = await res.json();
            if (data !== null) {
              await saveToStore(k, data);
              count++;
            }
          }
        } catch {}
      }

      if (count > 0) {
        statusDiv.style.background = '#d1fae5';
        statusDiv.style.color = '#065f46';
        statusDiv.textContent = `🎉 Tebrikler! ${count} adet veri tablosu başarıyla aktarıldı.`;
        showToast(`${count} adet tablo aktarıldı!`, 'success');
        setTimeout(() => window.location.reload(), 2500);
      } else {
        statusDiv.style.background = '#fee2e2';
        statusDiv.style.color = '#991b1b';
        statusDiv.textContent = '❌ Eski siteden veri alınamadı. URL adresini kontrol edin.';
        startMigrationBtn.disabled = false;
      }
    });
  }

  // Initial Load
  await updateDashboardData();
}

// --- DATA DASHBOARD REFRESH ---
async function updateDashboardData() {
  const apps = await fetchFromStore('applications', []);
  const grid = await fetchFromStore('firmsGrid', {});
  const customers = await fetchFromStore('customers', []);

  // Update counts
  const totalAppsEl = document.querySelector('#totalApps');
  const appBadge = document.querySelector('#appBadge');
  if (totalAppsEl) totalAppsEl.textContent = apps.length;
  if (appBadge) appBadge.textContent = apps.length;

  const filledCount = Object.keys(grid).length;
  const filledSlotsEl = document.querySelector('#filledSlots');
  const emptySlotsEl = document.querySelector('#emptySlots');
  const gridFilledCountEl = document.querySelector('#gridFilledCount');
  const potentialRevEl = document.querySelector('#potentialRev');

  if (filledSlotsEl) filledSlotsEl.textContent = filledCount;
  if (emptySlotsEl) emptySlotsEl.textContent = Math.max(0, TOTAL_SLOTS - filledCount);
  if (gridFilledCountEl) gridFilledCountEl.textContent = `${filledCount} Dolu`;
  if (potentialRevEl) potentialRevEl.textContent = `${(filledCount * PRICE_PER_SITE).toLocaleString('tr-TR')} TL`;

  // Render sub-tables
  renderApplicationsTable(apps);
  renderCustomerTable(customers);
  await renderGridManager(grid);
  await renderAgenda();
  await renderPortfolioTable();
}

// --- APPLICATIONS TABLE RENDERER WITH SEARCH & FILTERS ---
let allLoadedApps = [];

function filterApplicationsList() {
  const q = document.querySelector('#appSearchInput') ? document.querySelector('#appSearchInput').value.toLowerCase().trim() : '';
  const activePill = document.querySelector('#appStatusFilters .filter-pill.active');
  const filterType = activePill ? activePill.dataset.filter : 'all';

  let filtered = allLoadedApps;

  if (filterType !== 'all') {
    filtered = filtered.filter(a => {
      const s = a.status || 'new';
      if (filterType === 'new') return s === 'new' || s === 'pending';
      if (filterType === 'contacted') return s === 'contacted' || s === 'assets' || s === 'design';
      if (filterType === 'completed') return s === 'completed' || s === 'approved' || s === 'live';
      return true;
    });
  }

  if (q) {
    filtered = filtered.filter(a => 
      (a.firmaAdi && a.firmaAdi.toLowerCase().includes(q)) ||
      (a.adSoyad && a.adSoyad.toLowerCase().includes(q)) ||
      (a.telefon && a.telefon.includes(q)) ||
      (a.sektor && a.sektor.toLowerCase().includes(q))
    );
  }

  renderApplicationsHTML(filtered);
}

function renderApplicationsTable(apps) {
  allLoadedApps = apps;
  
  // Update filter pill counts
  const countAll = document.querySelector('#filterCountAll');
  const countNew = document.querySelector('#filterCountNew');
  if (countAll) countAll.textContent = apps.length;
  if (countNew) countNew.textContent = apps.filter(a => !a.status || a.status === 'new' || a.status === 'pending').length;

  filterApplicationsList();
}

function renderApplicationsHTML(apps) {
  const recentBody = document.querySelector('#recentAppsBody');
  const allBody = document.querySelector('#allAppsBody');

  const rows = [...apps].reverse().map(app => {
    const dateStr = app.date ? new Date(app.date).toLocaleDateString('tr-TR') : 'Bugün';
    const cleanPhone = (app.telefon || app.phone || '').replace(/\D/g, '');
    const waText = encodeURIComponent(`Merhaba ${app.firmaAdi || 'İşletmeniz'}, KolayWebci üzerinden yaptığınız web sitesi başvurunuz için sizinle iletişime geçiyorum.`);
    const waLink = cleanPhone ? `https://wa.me/90${cleanPhone}?text=${waText}` : '#';

    let statusLabel = 'Yeni';
    let statusClass = 'new';
    if (app.status === 'contacted' || app.status === 'assets' || app.status === 'design') {
      statusLabel = 'İletişimde';
      statusClass = 'contacted';
    } else if (app.status === 'completed' || app.status === 'approved' || app.status === 'live') {
      statusLabel = 'Anlaşıldı';
      statusClass = 'completed';
    }

    return `
      <tr>
        <td><strong>${dateStr}</strong></td>
        <td><strong>${app.firmaAdi || 'Belirtilmedi'}</strong></td>
        <td>${app.adSoyad || '-'}</td>
        <td>
          <a href="tel:${cleanPhone}" style="color:var(--primary); font-weight:700; text-decoration:none;">${app.telefon || '-'}</a>
        </td>
        <td>${app.sektor || '-'}${app.sehir ? ' / ' + app.sehir : ''}</td>
        <td><small style="color:var(--slate-500); font-size:11px;">${app.ekHizmetler || app.notlar || 'Standart Paket'}</small></td>
        <td><span class="status-chip ${statusClass}">${statusLabel}</span></td>
        <td>
          <div style="display:flex; gap:6px; align-items:center;">
            ${cleanPhone ? `<a href="${waLink}" target="_blank" class="btn-whatsapp-sm" title="WhatsApp Mesajı Gönder">💬 Yaz</a>` : ''}
            <button class="btn-outline-sm" onclick="handleAppAction(${app.id}, 'toggleStatus')" title="Durum Değiştir">🔄</button>
            <button class="btn-outline-sm" style="color:var(--rose);" onclick="handleAppAction(${app.id}, 'delete')" title="Sil">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (allBody) {
    allBody.innerHTML = rows || '<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--slate-400);">Kayıtlı başvuru bulunamadı.</td></tr>';
  }

  // Dashboard Recent Apps (Show first 5)
  if (recentBody) {
    const recentRows = [...apps].reverse().slice(0, 5).map(app => {
      const cleanPhone = (app.telefon || app.phone || '').replace(/\D/g, '');
      const waText = encodeURIComponent(`Merhaba ${app.firmaAdi || 'İşletmeniz'}, KolayWebci başvurunuz için iletişime geçiyorum.`);
      const waLink = cleanPhone ? `https://wa.me/90${cleanPhone}?text=${waText}` : '#';
      return `
        <tr>
          <td><strong>${app.firmaAdi || 'İşletme'}</strong></td>
          <td>${app.adSoyad || '-'} <br/><small>${app.telefon || '-'}</small></td>
          <td>${app.sektor || '-'}</td>
          <td>${app.date ? new Date(app.date).toLocaleDateString('tr-TR') : 'Bugün'}</td>
          <td><span class="status-chip new">${app.status === 'completed' ? 'Tamamlandı' : 'Yeni'}</span></td>
          <td>
            ${cleanPhone ? `<a href="${waLink}" target="_blank" class="btn-whatsapp-sm">💬 WhatsApp</a>` : '-'}
          </td>
        </tr>
      `;
    }).join('');
    recentBody.innerHTML = recentRows || '<tr><td colspan="6" style="text-align:center; padding:18px; color:var(--slate-400);">Henüz başvuru bulunmuyor.</td></tr>';
  }
}

// --- CUSTOMER TABLE RENDERER ---
function renderCustomerTable(customers) {
  const body = document.querySelector('#customerTableBody');
  const badge = document.querySelector('#expiryBadge');
  if (!body) return;

  const today = new Date();
  let urgent = 0;

  if (customers.length === 0) {
    body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--slate-400);">Henüz müşteri kaydı eklenmedi. Sağ üstten yeni müşteri ekleyebilirsiniz.</td></tr>';
    if (badge) badge.style.display = 'none';
    return;
  }

  body.innerHTML = customers.map(cust => {
    let expiryHTML = '<span style="color:var(--emerald); font-weight:700;">🟢 Aktif</span>';
    if (cust.custDomainEnd) {
      const diff = Math.ceil((new Date(cust.custDomainEnd) - today) / 86400000);
      if (diff < 0) { expiryHTML = '<span style="color:var(--rose); font-weight:800;">🔴 Süresi Doldu!</span>'; urgent++; }
      else if (diff <= 30) { expiryHTML = `<span style="color:var(--amber); font-weight:800;">🟠 ${diff} Gün Kaldı</span>`; urgent++; }
      else { expiryHTML = `<span style="color:var(--emerald); font-weight:700;">🟢 ${diff} Gün</span>`; }
    }

    const payStatus = cust.custPaymentStatus === 'paid' ? '✅ Ödendi' : (cust.custPaymentStatus === 'pending' ? '⏳ Bekliyor' : '❌ Ödenmedi');

    return `
      <tr>
        <td><strong>${cust.custName}</strong></td>
        <td>
          <a href="https://${cust.custDomain}" target="_blank" style="color:var(--primary); font-weight:700; text-decoration:none;">${cust.custDomain || '-'}</a>
          <br/><small style="font-size:11px;">${expiryHTML}</small>
        </td>
        <td>${cust.custHosting || 'Natro'} (${cust.custHostingEnd || 'Belirtilmedi'})</td>
        <td><span class="status-chip ${cust.custPaymentStatus === 'paid' ? 'completed' : 'contacted'}">${payStatus}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn-outline-sm" onclick="handleCustAction(${cust.id}, 'edit')">✏️ Düzenle</button>
            <button class="btn-outline-sm" style="color:var(--rose);" onclick="handleCustAction(${cust.id}, 'delete')">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (badge) {
    badge.style.display = urgent > 0 ? 'inline-block' : 'none';
    badge.textContent = urgent;
  }
}

// --- 1000 PANOSU MANAGER ---
async function renderGridManager(grid) {
  const container = document.querySelector('#adminFirmsGrid');
  if (!container) return;

  container.innerHTML = '';
  for (let i = 1; i <= TOTAL_SLOTS; i++) {
    const slot = document.createElement('div');
    slot.className = `admin-grid-slot ${grid[i] ? 'filled' : ''}`;
    slot.innerHTML = `
      <div class="admin-grid-slot-no">#${String(i).padStart(4, '0')}</div>
      <div class="admin-grid-slot-name">${grid[i] ? grid[i].name : 'Boş Kontenjan'}</div>
    `;

    slot.onclick = async () => {
      if (grid[i]) {
        const confirmClear = confirm(`Slot #${i} dolu (${grid[i].name}).\n\nBu slotu BOŞALTMAK istiyorsanız [Tamam]'a basın.\nDÜZENLEMEK için [İptal]'e basın.`);
        if (confirmClear) {
          delete grid[i];
          await saveToStore('firmsGrid', grid);
          await updateDashboardData();
          showToast(`Slot #${i} boşaltıldı.`);
          return;
        }
      }

      document.querySelector('#slotNo').value = i;
      document.querySelector('#slotFirmName').value = grid[i] ? grid[i].name : '';
      document.querySelector('#slotUrl').value = grid[i] ? grid[i].url : '';

      const dashboardTab = document.querySelector('[data-view="dashboard"]');
      if (dashboardTab) dashboardTab.click();

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

// --- BACKUP & DATA RECOVERY VIEW CONTROLLER ---
async function renderBackupView() {
  const isPersisted = await isStoragePersisted();
  const statusIdb = document.querySelector('#statusIdb');
  if (statusIdb) {
    statusIdb.textContent = isPersisted ? '✅ Korumalı (IndexedDB)' : '🟢 Aktif (IndexedDB)';
  }

  // Count items across all known tables
  const apps = await fetchFromStore('applications', []);
  const custs = await fetchFromStore('customers', []);
  const grid = await fetchFromStore('firmsGrid', {});
  const port = await fetchFromStore('sitePortfolio', []);
  const revs = await fetchFromStore('reviews', []);

  const totalCount = (apps ? apps.length : 0) +
                     (custs ? custs.length : 0) +
                     (grid ? Object.keys(grid).length : 0) +
                     (port ? port.length : 0) +
                     (revs ? revs.length : 0);

  const statusTotalItems = document.querySelector('#statusTotalItems');
  if (statusTotalItems) {
    statusTotalItems.textContent = `${totalCount} Kayıt Güvende`;
  }

  const latestDate = localStorage.getItem('kolaywebci_latest_snapshot_date') || 'Bugün ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  const statusSnapshotDate = document.querySelector('#statusSnapshotDate');
  if (statusSnapshotDate) {
    statusSnapshotDate.textContent = `Son kayıt: ${latestDate}`;
  }

  // Check Supabase config
  const rawSb = localStorage.getItem('supabaseConfig');
  const statusCloud = document.querySelector('#statusCloud');
  const statusCloudDesc = document.querySelector('#statusCloudDesc');
  if (rawSb) {
    if (statusCloud) statusCloud.textContent = '🟢 Bağlı';
    if (statusCloudDesc) statusCloudDesc.textContent = 'Supabase ile otomatik senkronize';
  } else {
    if (statusCloud) statusCloud.textContent = '⚪ Yerel Hafıza';
    if (statusCloudDesc) statusCloudDesc.textContent = 'Bulut için bilgileri girin';
  }

  await renderSnapshotsTable();
}

async function renderSnapshotsTable() {
  const body = document.querySelector('#snapshotTableBody');
  if (!body) return;

  const snapshots = await getSavedSnapshots();
  if (snapshots.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding:20px; color:var(--slate-400);">
          İlk otomatik anlık görüntü sistem tarafından birazdan kaydedilecektir.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = snapshots.map(s => {
    const tableKeys = s.data ? Object.keys(s.data).join(', ') : 'Tüm tablolar';
    return `
      <tr>
        <td><strong>${s.readableDate || s.date}</strong></td>
        <td><code>${s.id}</code></td>
        <td><small style="color:var(--slate-500);">${tableKeys}</small></td>
        <td>
          <button class="btn-outline-sm" onclick="handleRestoreSnapshot('${s.id}')">🔄 Bu Noktaya Geri Dön</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.handleRestoreSnapshot = async (snapshotId) => {
  if (confirm(`"${snapshotId}" anlık görüntüsündeki verileri geri yüklemek istediğinize emin misiniz?`)) {
    showToast('Kurtarma noktası yükleniyor...', 'info');
    const ok = await restoreSnapshotById(snapshotId);
    if (ok) {
      showToast('Veriler başarıyla kurtarıldı!', 'success');
      await updateDashboardData();
      await renderBackupView();
    } else {
      showToast('Kurtarma işlemi başarısız oldu.', 'error');
    }
  }
};

async function testSupabaseConnection(url, key) {
  const resultDiv = document.querySelector('#sbTestResult');
  if (!resultDiv) return;

  resultDiv.style.display = 'block';
  resultDiv.style.background = '#e0e7ff';
  resultDiv.style.color = '#3730a3';
  resultDiv.textContent = 'Supabase sunucusuna test sorgusu gönderiliyor...';

  try {
    const cleanUrl = url.replace(/\/+$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/store?select=key&limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });

    if (res.ok) {
      resultDiv.style.background = '#d1fae5';
      resultDiv.style.color = '#065f46';
      resultDiv.innerHTML = '🎉 <strong>Bağlantı Başarılı!</strong> Supabase "store" tablosuna erişildi ve bulut senkronizasyonu devrede.';
      showToast('Supabase bağlantısı doğrulandı!', 'success');
    } else if (res.status === 404 || res.status === 400) {
      resultDiv.style.background = '#fef3c7';
      resultDiv.style.color = '#92400e';
      resultDiv.innerHTML = '⚠️ <strong>Tablo Bulunamadı!</strong> Supabase projenize bağlanıldı ancak <code>store</code> tablosu eksik. Lütfen aşağıdaki SQL kodunu Supabase SQL Editor\'e yapıştırıp çalıştırın.';
    } else {
      resultDiv.style.background = '#fee2e2';
      resultDiv.style.color = '#991b1b';
      resultDiv.textContent = `❌ Bağlantı başarısız (HTTP ${res.status}). Lütfen URL ve API Key bilgilerinizi kontrol edin.`;
    }
  } catch (err) {
    resultDiv.style.background = '#fee2e2';
    resultDiv.style.color = '#991b1b';
    resultDiv.textContent = '❌ Bağlantı hatası: ' + err.message;
  }
}

// --- AGENDA RENDERER ---
async function renderAgenda() {
  const list = document.querySelector('#agendaList');
  if (!list) return;

  const agenda = await fetchFromStore('agenda', []);
  if (agenda.length === 0) {
    list.innerHTML = '<p style="color:var(--slate-400); font-size:13px; text-align:center; padding:16px;">Ajandada yapılacak iş bulunmuyor.</p>';
    return;
  }

  list.innerHTML = agenda.map(item => `
    <div class="agenda-item ${item.completed ? 'completed' : ''}">
      <div style="display:flex; align-items:center; gap:12px;">
        <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="handleAgendaAction(${item.id}, 'toggle')" />
        <div>
          <span style="font-weight:700; font-size:14px;">${item.text}</span>
          <br/><small style="color:var(--slate-400); font-size:11px;">📅 ${new Date(item.date).toLocaleDateString('tr-TR')}</small>
        </div>
      </div>
      <button class="btn-outline-sm" style="color:var(--rose);" onclick="handleAgendaAction(${item.id}, 'delete')">🗑️</button>
    </div>
  `).join('');
}

// --- PORTFOLIO RENDERER ---
async function renderPortfolioTable() {
  const body = document.querySelector('#portfolioTableBody');
  if (!body) return;

  const portfolio = await fetchFromStore('sitePortfolio', []);
  if (portfolio.length === 0) {
    body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--slate-400);">Henüz referans eklenmedi. Sağ üstten ekleyebilirsiniz.</td></tr>';
    return;
  }

  body.innerHTML = portfolio.map(p => `
    <tr>
      <td>
        <img src="${p.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=200'}" 
             alt="${p.name}" style="width:48px; height:48px; object-fit:cover; border-radius:8px; border:1px solid var(--border);" />
      </td>
      <td><strong>${p.name}</strong></td>
      <td>${p.subtitle || '-'}</td>
      <td><a href="${p.url || '#'}" target="_blank" style="color:var(--primary); font-weight:700; text-decoration:none;">${p.url || '-'}</a></td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn-outline-sm" onclick="handlePortfolioAction(${p.id}, 'edit')">✏️ Düzenle</button>
          <button class="btn-outline-sm" style="color:var(--rose);" onclick="handlePortfolioAction(${p.id}, 'delete')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// --- REVIEWS CONTROLLER ---
let currentReviewFilter = 'pending';

async function renderReviews() {
  const container = document.querySelector('#adminReviewsList');
  if (!container) return;

  const reviews = await fetchFromStore('reviews', []);
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

  let filtered = reviews;
  if (currentReviewFilter !== 'all') {
    filtered = reviews.filter(r => r.status === currentReviewFilter);
  }
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:32px; color:var(--slate-400);">Bu kategoride henüz yorum bulunmuyor.</div>';
    return;
  }

  container.innerHTML = filtered.map(r => `
    <div class="review-admin-card status-${r.status}">
      <div style="display:flex; gap:16px; align-items:center;">
        <div style="width:44px; height:44px; border-radius:50%; background:#eff6ff; color:var(--primary); font-weight:800; display:flex; align-items:center; justify-content:center;">
          ${(r.name || 'M')[0].toUpperCase()}
        </div>
        <div>
          <strong>${r.name}</strong> <small style="color:var(--slate-500);">• ${r.company || ''} (${r.sector || ''})</small>
          <div style="color:#f59e0b; font-size:13px; margin-top:2px;">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</div>
          <p style="font-size:13px; color:var(--slate-700); margin-top:6px;">"${r.text}"</p>
        </div>
      </div>
      <div class="review-card-actions">
        ${r.status === 'pending' ? `
          <button class="btn-admin-sm" onclick="handleReviewAction(${r.id}, 'approve')">✅ Onayla</button>
          <button class="btn-outline-sm" onclick="handleReviewAction(${r.id}, 'reject')">❌ Reddet</button>
        ` : (r.status === 'approved' ? `
          <button class="btn-outline-sm" onclick="handleReviewAction(${r.id}, 'reject')">❌ Geri Al</button>
        ` : `
          <button class="btn-admin-sm" onclick="handleReviewAction(${r.id}, 'approve')">✅ Onayla</button>
        `)}
        <button class="btn-outline-sm" style="color:var(--rose);" onclick="handleReviewAction(${r.id}, 'delete')">🗑️ Sil</button>
      </div>
    </div>
  `).join('');
}

// Review tabs listener
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

// --- KANBAN BOARD CONTROLLER ---
async function renderKanbanBoard() {
  const applications = await fetchFromStore('applications', []);
  const colNew = document.querySelector('#col-new');
  const colAssets = document.querySelector('#col-assets');
  const colDesign = document.querySelector('#col-design');
  const colLive = document.querySelector('#col-live');

  if (!colNew) return;

  colNew.innerHTML = '';
  colAssets.innerHTML = '';
  colDesign.innerHTML = '';
  colLive.innerHTML = '';

  let counts = { new: 0, assets: 0, design: 0, live: 0 };

  applications.forEach((app, idx) => {
    let raw = app.status || 'new';
    let status = 'new';
    if (raw === 'pending' || raw === 'new') status = 'new';
    else if (raw === 'assets') status = 'assets';
    else if (raw === 'design') status = 'design';
    else if (raw === 'approved' || raw === 'live' || raw === 'completed') status = 'live';

    counts[status] = (counts[status] || 0) + 1;

    const card = document.createElement('div');
    card.className = 'kanban-card';

    const cleanPhone = (app.telefon || app.phone || '').replace(/\D/g, '');
    const waText = encodeURIComponent(`Merhaba ${app.firmaAdi || 'İşletmeniz'}, web sitesi çalışmanız hakkında iletişime geçiyorum.`);

    card.innerHTML = `
      <h4>${app.firmaAdi || 'İşletme'}</h4>
      <p>👤 ${app.adSoyad || '-'} <br/>📞 ${app.telefon || '-'}</p>
      <div class="kanban-card-actions">
        <select class="admin-select status-select" data-index="${idx}" style="padding:4px 8px; font-size:11px;">
          <option value="new" ${status === 'new' ? 'selected' : ''}>📥 Yeni</option>
          <option value="assets" ${status === 'assets' ? 'selected' : ''}>📁 Görseller Bekleniyor</option>
          <option value="design" ${status === 'design' ? 'selected' : ''}>🎨 Tasarımda</option>
          <option value="live" ${status === 'live' ? 'selected' : ''}>🚀 Tamamlandı</option>
        </select>
        ${cleanPhone ? `<a href="https://wa.me/90${cleanPhone}?text=${waText}" target="_blank" class="btn-whatsapp-sm" style="padding:4px 8px; font-size:11px;">💬 Yaz</a>` : ''}
      </div>
    `;

    if (status === 'new') colNew.appendChild(card);
    else if (status === 'assets') colAssets.appendChild(card);
    else if (status === 'design') colDesign.appendChild(card);
    else if (status === 'live') colLive.appendChild(card);
  });

  const cNew = document.querySelector('#count-new');
  const cAssets = document.querySelector('#count-assets');
  const cDesign = document.querySelector('#count-design');
  const cLive = document.querySelector('#count-live');
  if (cNew) cNew.textContent = counts.new;
  if (cAssets) cAssets.textContent = counts.assets;
  if (cDesign) cDesign.textContent = counts.design;
  if (cLive) cLive.textContent = counts.live;

  document.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async (e) => {
      const idx = e.target.dataset.index;
      applications[idx].status = e.target.value;
      await saveToStore('applications', applications);
      await renderKanbanBoard();
      showToast('İş aşaması güncellendi.');
    });
  });
}

// --- GLOBAL HANDLERS FOR INLINE ONCLICK ---
window.handleAppAction = async (id, action) => {
  let apps = await fetchFromStore('applications', []);
  if (action === 'toggleStatus') {
    const idx = apps.findIndex(a => a.id === id);
    if (idx !== -1) {
      const current = apps[idx].status || 'new';
      apps[idx].status = current === 'new' || current === 'pending' ? 'completed' : 'new';
    }
  } else if (action === 'delete') {
    if (confirm('Bu başvuruyu silmek istediğinize emin misiniz?')) {
      apps = apps.filter(a => a.id !== id);
    }
  }
  await saveToStore('applications', apps);
  await updateDashboardData();
};

window.handleCustAction = async (id, action) => {
  let customers = await fetchFromStore('customers', []);
  if (action === 'delete') {
    if (confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) {
      customers = customers.filter(c => c.id !== id);
      await saveToStore('customers', customers);
      await updateDashboardData();
      showToast('Müşteri silindi.');
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
      const p = document.querySelector('#customerDetailPanel');
      if (p) {
        p.style.display = 'block';
        p.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
};

window.handlePortfolioAction = async (id, action) => {
  let portfolio = await fetchFromStore('sitePortfolio', []);
  if (action === 'delete') {
    if (confirm('Bu referansı silmek istediğinize emin misiniz?')) {
      portfolio = portfolio.filter(p => p.id !== id);
      await saveToStore('sitePortfolio', portfolio);
      await updateDashboardData();
      showToast('Referans silindi.');
    }
  } else if (action === 'edit') {
    const p = portfolio.find(x => x.id === id);
    if (p) {
      document.querySelector('#portId').value = p.id;
      document.querySelector('#portName').value = p.name || '';
      document.querySelector('#portSubtitle').value = p.subtitle || '';
      document.querySelector('#portImage').value = p.image || '';
      document.querySelector('#portUrl').value = p.url || '';
      document.querySelector('#portfolioDetailTitle').textContent = 'Referans Düzenle';
      const panel = document.querySelector('#portfolioDetailPanel');
      if (panel) {
        panel.style.display = 'block';
        panel.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }
};

window.handleReviewAction = async (id, action) => {
  let reviews = await fetchFromStore('reviews', []);
  const idx = reviews.findIndex(r => r.id === id);
  if (action === 'approve' && idx !== -1) reviews[idx].status = 'approved';
  else if (action === 'reject' && idx !== -1) reviews[idx].status = 'rejected';
  else if (action === 'delete') {
    if (confirm('Bu yorumu silmek istediğinize emin misiniz?')) {
      reviews = reviews.filter(r => r.id !== id);
    }
  }
  await saveToStore('reviews', reviews);
  await renderReviews();
  showToast('Yorum durumu güncellendi.');
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
    if (confirm('Yönetici oturumu kapatılsın mı?')) {
      sessionStorage.clear();
      window.location.href = '/login.html';
    }
  }
});

// Helper: Convert file to Base64 with canvas image compression
function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = err => reject(err);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max = 800;

        if (width > height && width > max) {
          height = Math.round((height * max) / width);
          width = max;
        } else if (height > max) {
          width = Math.round((width * max) / height);
          height = max;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = err => reject(err);
    };
    reader.onerror = err => reject(err);
  });
}
