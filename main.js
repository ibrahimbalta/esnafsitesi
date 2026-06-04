// --- PREMIUM CYBER-AI MODAL ALERT SYSTEM ---
function showAlert(message, type = 'success', title = '') {
  if (!document.getElementById('cyber-modal-styles')) {
    const style = document.createElement('style');
    style.id = 'cyber-modal-styles';
    style.textContent = `
      .cyber-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(3, 0, 20, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 100000;
        display: flex;
        justify-content: center;
        align-items: center;
        opacity: 0;
        transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: none;
      }
      .cyber-modal-backdrop.active {
        opacity: 1;
        pointer-events: auto;
      }
      .cyber-modal {
        background: linear-gradient(145deg, rgba(20, 16, 40, 0.95), rgba(10, 8, 25, 0.98));
        border: 1px solid rgba(139, 92, 246, 0.35);
        border-radius: 24px;
        width: 90%;
        max-width: 440px;
        padding: 40px 30px;
        text-align: center;
        box-shadow: 0 30px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(139, 92, 246, 0.25);
        transform: translateY(30px) scale(0.95);
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: 'Outfit', sans-serif;
        color: #f8fafc;
        position: relative;
        overflow: hidden;
      }
      .cyber-modal::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%);
        pointer-events: none;
      }
      .cyber-modal-backdrop.active .cyber-modal {
        transform: translateY(0) scale(1);
      }
      .cyber-modal-icon-wrapper {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        margin: 0 auto 24px;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        z-index: 1;
      }
      .cyber-modal-icon-wrapper.success {
        background: rgba(6, 182, 212, 0.1);
        border: 1.5px solid rgba(6, 182, 212, 0.5);
        box-shadow: 0 0 25px rgba(6, 182, 212, 0.3);
        color: #06b6d4;
      }
      .cyber-modal-icon-wrapper.error {
        background: rgba(236, 72, 153, 0.1);
        border: 1.5px solid rgba(236, 72, 153, 0.5);
        box-shadow: 0 0 25px rgba(236, 72, 153, 0.3);
        color: #ec4899;
      }
      .cyber-modal-icon-wrapper.warning {
        background: rgba(245, 158, 11, 0.1);
        border: 1.5px solid rgba(245, 158, 11, 0.5);
        box-shadow: 0 0 25px rgba(245, 158, 11, 0.3);
        color: #f59e0b;
      }
      .cyber-modal-icon {
        font-size: 36px;
        font-weight: bold;
        line-height: 1;
      }
      .cyber-modal-title {
        color: #f8fafc;
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 12px;
        letter-spacing: -0.5px;
        z-index: 1;
        position: relative;
      }
      .cyber-modal-text {
        color: #94a3b8;
        font-size: 15px;
        line-height: 1.6;
        margin-bottom: 30px;
        z-index: 1;
        position: relative;
        padding: 0 10px;
      }
      .cyber-modal-btn {
        background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #06b6d4 100%);
        color: #ffffff;
        border: none;
        border-radius: 14px;
        padding: 14px 35px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
        position: relative;
        z-index: 1;
      }
      .cyber-modal-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(139, 92, 246, 0.6);
        filter: brightness(1.15);
      }
      .cyber-modal-btn:active {
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'cyber-modal-backdrop';

  if (!title) {
    if (type === 'success') title = 'Başarılı';
    else if (type === 'error') title = 'Hata';
    else if (type === 'warning') title = 'Uyarı';
    else title = 'Bilgi';
  }

  let iconHtml = '';
  if (type === 'success') {
    iconHtml = `
      <div class="cyber-modal-icon-wrapper success">
        <span class="cyber-modal-icon">✓</span>
      </div>
    `;
  } else if (type === 'error') {
    iconHtml = `
      <div class="cyber-modal-icon-wrapper error">
        <span class="cyber-modal-icon">✗</span>
      </div>
    `;
  } else {
    iconHtml = `
      <div class="cyber-modal-icon-wrapper warning">
        <span class="cyber-modal-icon">!</span>
      </div>
    `;
  }

  backdrop.innerHTML = `
    <div class="cyber-modal">
      ${iconHtml}
      <h3 class="cyber-modal-title">${title}</h3>
      <p class="cyber-modal-text">${message}</p>
      <button class="cyber-modal-btn">Tamam</button>
    </div>
  `;

  document.body.appendChild(backdrop);
  setTimeout(() => backdrop.classList.add('active'), 10);

  return new Promise((resolve) => {
    const btn = backdrop.querySelector('.cyber-modal-btn');
    const close = () => {
      backdrop.classList.remove('active');
      setTimeout(() => {
        backdrop.remove();
        resolve();
      }, 400);
    };

    btn.addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
  });
}

// Global alert override
window.alert = function(msg) {
  let type = 'info';
  let title = 'Bilgi';
  if (msg.toLowerCase().includes('hata') || msg.toLowerCase().includes('geçersiz') || msg.toLowerCase().includes('seçiniz')) {
    type = 'warning';
    title = 'Uyarı';
  } else if (msg.toLowerCase().includes('başarıyla') || msg.toLowerCase().includes('alındı') || msg.toLowerCase().includes('kaydedildi')) {
    type = 'success';
    title = 'Başarılı';
  }
  showAlert(msg, type, title);
};

// DOM Elements
const navbar = document.querySelector('#navbar');
const firmsGrid = document.querySelector('#firmsGrid');
const counterFilled = document.querySelector('#counterFilled');
const statFilled = document.querySelector('#statFilled');
const statRemaining = document.querySelector('#statRemaining');
const urgencyFill = document.querySelector('#urgencyFill');
const faqItems = document.querySelectorAll('.faq-item');
const navToggle = document.querySelector('#navToggle');
const navLinks = document.querySelector('#navLinks');
const filterBtns = document.querySelectorAll('.filter-btn');

// Constants
const TOTAL_SLOTS = 1000;
const INITIAL_FILLED = 47;

// --- API & Cloud Storage Helpers ---
const API_URL = '/api/api';

async function fetchFromStore(key, defaultValue) {
  // Check sessionStorage cache first (valid for 60 seconds to prevent burst traffic billing)
  const cacheKey = `cache_${key}`;
  const cacheTimeKey = `cache_time_${key}`;
  const cachedData = sessionStorage.getItem(cacheKey);
  const cachedTime = sessionStorage.getItem(cacheTimeKey);
  
  if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime) < 60 * 1000)) {
    return JSON.parse(cachedData);
  }

  try {
    const res = await fetch(`${API_URL}?key=${key}`);
    if (res.ok) {
      const data = await res.json();
      const result = data !== null ? data : defaultValue;
      
      // Save to cache
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
      sessionStorage.setItem(cacheTimeKey, Date.now().toString());
      
      return result;
    }
  } catch (err) {
    console.warn(`Failed to fetch ${key} from Netlify Blobs, falling back to localStorage:`, err);
  }
  
  // Fallback to localStorage
  const localData = localStorage.getItem(key);
  return localData ? JSON.parse(localData) : defaultValue;
}

async function saveToStore(key, value) {
  // Clear cache immediately on write
  sessionStorage.removeItem(`cache_${key}`);
  sessionStorage.removeItem(`cache_time_${key}`);

  // Save to localStorage immediately as a local copy/backup
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to save ${key} to localStorage (quota exceeded?):`, err);
  }
  
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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

// Initialize Grid
async function initGrid(filter = 'all') {
  if (!firmsGrid) return;
  
  // Clear grid
  firmsGrid.innerHTML = '';
  
  // Get data from Netlify Blobs or use defaults
  const savedFirms = await fetchFromStore('firmsGrid', {});
  const currentFilledCount = Object.keys(savedFirms).length;

  for (let i = 1; i <= TOTAL_SLOTS; i++) {
    const savedFirm = savedFirms[i];
    const isFilled = !!savedFirm;
    
    // Filter logic
    if (filter === 'filled' && !isFilled) continue;
    if (filter === 'empty' && isFilled) continue;

    const card = document.createElement('div');
    card.classList.add('firm-card');
    
    const slotNumber = document.createElement('span');
    slotNumber.classList.add('slot-number');
    slotNumber.textContent = `#${i.toString().padStart(4, '0')}`;
    card.appendChild(slotNumber);

    if (isFilled) {
      card.classList.add('filled');
      const statusIcon = document.createElement('span');
      statusIcon.classList.add('firm-status');
      
      if (savedFirm && savedFirm.logo) {
        const logoImg = document.createElement('img');
        logoImg.src = savedFirm.logo;
        logoImg.alt = savedFirm.name;
        logoImg.classList.add('firm-logo-img');
        statusIcon.appendChild(logoImg);
      } else {
        statusIcon.textContent = savedFirm ? (savedFirm.icon || '✅') : '✅';
      }
      
      card.appendChild(statusIcon);
      
      const firmName = document.createElement('span');
      firmName.classList.add('firm-name');
      firmName.textContent = savedFirm ? savedFirm.name : `Firma #${i}`;
      card.appendChild(firmName);
      
      if (savedFirm && savedFirm.url) {
        card.addEventListener('click', () => window.open(savedFirm.url, '_blank'));
      }
    } else {
      card.classList.add('empty');
      const statusIcon = document.createElement('span');
      statusIcon.classList.add('firm-status');
      statusIcon.textContent = '➕';
      card.appendChild(statusIcon);
      
      const firmName = document.createElement('span');
      firmName.classList.add('firm-name');
      firmName.textContent = 'Yer Ayırt';
      card.appendChild(firmName);

      // Scroll to contact form on click
      card.addEventListener('click', () => {
        const contactSection = document.querySelector('#iletisim');
        if (contactSection) {
          contactSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }

    firmsGrid.appendChild(card);
  }
}

// Update Stats
async function updateStats() {
  const savedFirms = await fetchFromStore('firmsGrid', {});
  const currentFilledCount = Object.keys(savedFirms).length;
  const displayFilled = currentFilledCount;
  
  const percentage = (displayFilled / TOTAL_SLOTS) * 100;
  if (urgencyFill) urgencyFill.style.width = `${percentage}%`;
  if (counterFilled) counterFilled.textContent = displayFilled;
  if (statFilled) statFilled.textContent = displayFilled;
  if (statRemaining) statRemaining.textContent = TOTAL_SLOTS - displayFilled;
}

// Filter Buttons
filterBtns.forEach(btn => {
  btn.addEventListener('click', async () => {
    // Update UI
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Filter grid
    const filter = btn.getAttribute('data-filter');
    await initGrid(filter);
  });
});

// Navbar Scroll Effect
window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// FAQ Accordion
faqItems.forEach(item => {
  const question = item.querySelector('.faq-question');
  question.addEventListener('click', () => {
    const isActive = item.classList.contains('active');
    
    // Close all others
    faqItems.forEach(i => i.classList.remove('active'));
    
    // Toggle current
    if (!isActive) item.classList.add('active');
  });
});

// Mobile Menu Toggle
if (navToggle) {
  navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    navToggle.classList.toggle('active');
  });

  // Close menu on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      navToggle.classList.remove('active');
    });
  });
}

// Form Submission
const ctaForm = document.querySelector('#ctaForm');
if (ctaForm) {
  ctaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = ctaForm.querySelector('button');
    const originalText = btn.innerHTML;
    
    const appData = {
      id: Date.now(),
      firmaAdi: document.querySelector('#firmaAdi').value,
      adSoyad: document.querySelector('#adSoyad').value,
      telefon: document.querySelector('#telefon').value,
      sektor: document.querySelector('#sektor').value,
      notlar: document.querySelector('#notlar').value,
      date: new Date().toISOString(),
      status: 'pending'
    };

    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Gönderiliyor...</span>';

    // Save application to Netlify Blobs
    const applications = await fetchFromStore('applications', []);
    applications.push(appData);
    await saveToStore('applications', applications);
    
    setTimeout(async () => {
      await showAlert('Başvurunuz alındı! En kısa sürede kolaywebci tarafından size dönüş yapılacaktır.', 'success', 'Başvuru Başarılı');
      btn.disabled = false;
      btn.innerHTML = originalText;
      ctaForm.reset();
    }, 1000);
  });
}

// Load Site Settings
async function loadSettings() {
  const settings = await fetchFromStore('siteSettings', null);
  if (!settings) return;

  // Update Footer Email
  const footerEmail = document.querySelector('a[href^="mailto:"]');
  if (footerEmail) {
    footerEmail.href = `mailto:${settings.email}`;
    footerEmail.textContent = settings.email;
  }

  // Update Footer Phone
  const footerPhone = document.querySelector('a[href^="tel:"]');
  if (footerPhone) {
    footerPhone.href = `tel:${settings.phone.replace(/\s/g, '')}`;
    footerPhone.textContent = settings.phone;
  }

  // Update WhatsApp Buttons
  const waButtons = document.querySelectorAll('a[href*="wa.me"]');
  waButtons.forEach(btn => {
    const originalUrl = new URL(btn.href);
    const text = originalUrl.searchParams.get('text');
    btn.href = `https://wa.me/${settings.whatsapp}?text=${text || ''}`;
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await initGrid();
  await updateStats();
  await loadSettings();
  await initReviewSystem();
  await initPortfolioSystem();
  await initPromoModal();
  
  // Basic Animation on Scroll (Intersection Observer)
  const observerOptions = {
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.section, .step-card, .feature-card, .trust-card').forEach(el => {
    observer.observe(el);
  });
});

// ===== REVIEW SYSTEM =====
async function initReviewSystem() {
  await seedDefaultReviews();
  await renderApprovedReviews();
  initStarRating();
  initReviewForm();
}

// Seed default reviews if none exist
async function seedDefaultReviews() {
  const reviews = await fetchFromStore('reviews', null);
  if (reviews && reviews.length > 0) return;

  const defaultReviews = [
    {
      id: 1,
      name: 'Ahmet K.',
      company: 'Yıldız Bakkal',
      sector: 'Bakkal',
      city: 'İstanbul',
      rating: 5,
      text: 'Yıllardır web sitesi yaptırmayı düşünüyordum ama fiyatlar çok yüksekti. 1500 TL\'ye bu kalitede bir site beklemiyordum!',
      status: 'approved',
      date: '2026-04-15T10:00:00.000Z'
    },
    {
      id: 2,
      name: 'Fatma D.',
      company: 'Işıltı Kuaför',
      sector: 'Kuaför',
      city: 'Ankara',
      rating: 5,
      text: '48 saatte sitem hazırdı. Müşterilerim artık Google\'dan beni buluyor. Satışlarım %30 arttı!',
      status: 'approved',
      date: '2026-04-20T14:30:00.000Z'
    },
    {
      id: 3,
      name: 'Mehmet Y.',
      company: 'Lezzet Durağı',
      sector: 'Restoran',
      city: 'Bursa',
      rating: 5,
      text: 'Çok profesyonel ve ilgili bir ekip. Esnafın dijitalleşmesi için harika bir hizmet!',
      status: 'approved',
      date: '2026-05-01T09:15:00.000Z'
    }
  ];

  await saveToStore('reviews', defaultReviews);
}

// Render approved reviews
async function renderApprovedReviews() {
  const grid = document.querySelector('#approvedReviewsGrid');
  if (!grid) return;

  const reviews = await fetchFromStore('reviews', []);
  const approved = reviews.filter(r => r.status === 'approved');

  if (approved.length === 0) {
    grid.innerHTML = `
      <div class="testimonials-empty" style="grid-column: 1 / -1;">
        <div class="empty-icon">💬</div>
        <h4>Henüz Yorum Yok</h4>
        <p>İlk yorumu siz yazın! Aşağıdaki formu kullanarak deneyiminizi paylaşabilirsiniz.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = approved.map(review => {
    const initials = review.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    const formattedDate = new Date(review.date).toLocaleDateString('tr-TR', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });

    return `
      <div class="testimonial-card">
        <div class="t-header">
          <div class="t-stars">${stars}</div>
          <div class="t-quote">"</div>
        </div>
        <p>"${review.text}"</p>
        <div class="testimonial-author">
          <div class="author-avatar">${initials}</div>
          <div class="author-info">
            <strong>${review.name}</strong>
            <span>${review.sector} - ${review.city}</span>
            <span class="verified-badge">✓ Onaylı Firma</span>
          </div>
        </div>
        <div class="review-date">📅 ${formattedDate}</div>
      </div>
    `;
  }).join('');
}

// Star Rating Interaction
function initStarRating() {
  const starRating = document.querySelector('#starRating');
  const ratingInput = document.querySelector('#reviewRating');
  if (!starRating || !ratingInput) return;

  const starBtns = starRating.querySelectorAll('.star-btn');

  starBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const value = parseInt(btn.getAttribute('data-value'));
      ratingInput.value = value;

      starBtns.forEach(s => {
        const sVal = parseInt(s.getAttribute('data-value'));
        s.classList.toggle('active', sVal <= value);
      });
    });

    btn.addEventListener('mouseenter', () => {
      const value = parseInt(btn.getAttribute('data-value'));
      starBtns.forEach(s => {
        const sVal = parseInt(s.getAttribute('data-value'));
        s.classList.toggle('hover-active', sVal <= value);
      });
    });

    btn.addEventListener('mouseleave', () => {
      starBtns.forEach(s => s.classList.remove('hover-active'));
    });
  });
}

// Review Form Submission
function initReviewForm() {
  const reviewForm = document.querySelector('#reviewForm');
  const reviewFormWrapper = document.querySelector('#reviewFormWrapper');
  const successMsg = document.querySelector('#reviewSuccessMsg');
  const writeAnotherBtn = document.querySelector('#writeAnotherBtn');

  if (!reviewForm) return;

  reviewForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rating = parseInt(document.querySelector('#reviewRating').value);
    if (rating === 0) {
      showAlert('Lütfen bir puan seçiniz!', 'warning', 'Eksik Bilgi');
      return;
    }

    const reviewData = {
      id: Date.now(),
      name: document.querySelector('#reviewName').value.trim(),
      company: document.querySelector('#reviewCompany').value.trim(),
      sector: document.querySelector('#reviewSector').value.trim(),
      city: document.querySelector('#reviewCity').value.trim(),
      rating: rating,
      text: document.querySelector('#reviewText').value.trim(),
      status: 'pending',
      date: new Date().toISOString()
    };

    // Save to Netlify Blobs
    const reviews = await fetchFromStore('reviews', []);
    reviews.push(reviewData);
    await saveToStore('reviews', reviews);

    // Show success, hide form
    reviewFormWrapper.style.display = 'none';
    successMsg.style.display = 'block';

    // Reset form
    reviewForm.reset();
    document.querySelectorAll('.star-btn').forEach(s => s.classList.remove('active'));
    document.querySelector('#reviewRating').value = '0';
  });

  // "Write Another" button
  if (writeAnotherBtn) {
    writeAnotherBtn.addEventListener('click', () => {
      successMsg.style.display = 'none';
      reviewFormWrapper.style.display = 'block';
    });
  }
}

// ===== PORTFOLIO SYSTEM =====
async function initPortfolioSystem() {
  await seedDefaultPortfolio();
  await renderPortfolio();
}

async function seedDefaultPortfolio() {
  const portfolio = await fetchFromStore('sitePortfolio', null);
  if (portfolio && portfolio.length > 0) return;

  const defaultPortfolio = [
    {
      id: 1,
      name: 'Ziyafet Restoran',
      subtitle: 'Gurme & Restoran Web Tasarımı',
      image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=600',
      url: '#'
    },
    {
      id: 2,
      name: 'Işıltı Kuaför',
      subtitle: 'Premium Güzellik & Bakım Portalı',
      image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600',
      url: '#'
    },
    {
      id: 3,
      name: 'Moda Butik',
      subtitle: 'Şık & Minimalist Butik Web Sitesi',
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=600',
      url: '#'
    }
  ];

  await saveToStore('sitePortfolio', defaultPortfolio);
}

// Global reference render helper
async function renderPortfolio() {
  const container = document.querySelector('#featuredProjectsGrid');
  if (!container) return;

  const portfolio = await fetchFromStore('sitePortfolio', []);
  
  if (portfolio.length === 0) {
    container.innerHTML = `
      <div class="projects-empty" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;">
        <h4>Henüz Referans Bulunmuyor</h4>
        <p>Yönetici panelinden referansları ekleyebilirsiniz.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = portfolio.map(project => `
    <div class="project-card">
      <div class="project-img">
        <img src="${project.image || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=600'}" alt="${project.name} Web Sitesi" />
      </div>
      <div class="project-info">
        <h4>${project.name}</h4>
        <span>${project.subtitle}</span>
        <a href="${project.url || '#'}" target="${project.url && project.url !== '#' ? '_blank' : '_self'}" class="btn-text">Siteyi İncele →</a>
      </div>
    </div>
  `).join('');
}

// ===== PROMO MODAL SYSTEM =====
async function initPromoModal() {
  const promoModal = document.querySelector('#promoModal');
  if (!promoModal) return;

  const promo = await fetchFromStore('dailyPromo', null);
  if (!promo || !promo.active || sessionStorage.getItem('promoClosed') === 'true') {
    return;
  }

  // Populate data
  const promoModalImg = document.querySelector('#promoModalImg');
  const promoModalFirmName = document.querySelector('#promoModalFirmName');
  const promoModalDescription = document.querySelector('#promoModalDescription');
  const promoModalCta = document.querySelector('#promoModalCta');

  if (promoModalImg) {
    promoModalImg.src = promo.image || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=600';
  }
  if (promoModalFirmName) {
    promoModalFirmName.textContent = promo.firmName;
  }
  if (promoModalDescription) {
    promoModalDescription.textContent = promo.text;
  }
  if (promoModalCta) {
    promoModalCta.href = promo.url || '#';
  }

  // Show modal with a slight delay for premium feel
  setTimeout(() => {
    promoModal.style.display = 'flex';
  }, 1000);

  // Close handlers
  const closeModal = () => {
    promoModal.style.animation = 'promoFadeIn 0.3s ease reverse forwards';
    const container = promoModal.querySelector('.promo-modal-container');
    if (container) {
      container.style.animation = 'promoScaleIn 0.3s ease reverse forwards';
    }
    setTimeout(() => {
      promoModal.style.display = 'none';
      sessionStorage.setItem('promoClosed', 'true');
    }, 300);
  };

  const closeBtn = document.querySelector('#promoModalClose');
  const dismissBtn = document.querySelector('#promoModalDismiss');

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (dismissBtn) dismissBtn.addEventListener('click', closeModal);

  // Close on click outside container
  promoModal.addEventListener('click', (e) => {
    if (e.target === promoModal) {
      closeModal();
    }
  });
}
