import './style.css';
import { Preferences } from '@capacitor/preferences';

// DOM Elements
const btnOpenMonths = document.getElementById('btn-open-months');
const btnCloseMonths = document.getElementById('btn-close-months');
const modalMonths = document.getElementById('modal-months');
const displayYear = document.getElementById('display-year');
const btnPrevYear = document.getElementById('prev-year');
const btnNextYear = document.getElementById('next-year');
const monthGrid = document.getElementById('month-grid');

const modalCamera = document.getElementById('modal-camera');
const btnCloseCamera = document.getElementById('btn-close-camera');
const video = document.getElementById('camera-video');
const captureBtn = document.getElementById('capture-btn');
const btnFlipCamera = document.getElementById('btn-flip-camera');

const modalDetail = document.getElementById('modal-detail');
const previewImg = document.getElementById('preview-image');
const priceInput = document.getElementById('price-input');
const noteInput = document.getElementById('note-input');
const btnCancelDetail = document.getElementById('btn-cancel-detail');
const btnSaveDetail = document.getElementById('btn-save-detail');

const feedContainer = document.getElementById('expense-feed');
const totalIncomeDisplay = document.getElementById('total-income');
const totalExpenseDisplay = document.getElementById('total-expense');
const emptyState = document.getElementById('empty-state');

// Selection Mode Elements
const appContainer = document.getElementById('app');
const btnCancelSelect = document.getElementById('btn-cancel-select');
const fabContainer = document.getElementById('fab-container');
const fabIncome = document.getElementById('fab-income');
const fabExpense = document.getElementById('fab-expense');
const fabDelete = document.getElementById('fab-delete');
const appTitle = document.getElementById('app-title');
const totalsWrapper = document.getElementById('totals-wrapper');

// State
let expenses = [];
let currentImage = null;
let currentEntryType = 'expense'; // 'income' or 'expense'
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let cameraStream = null;
let facingMode = 'environment';
let isSelectionMode = false;
let selectedIds = new Set();

// Initialize
async function init() {
  await loadData();
  updateMonthBtnText();
  renderMonthGrid();
  renderFeed();
}

// Startup
window.onload = init;

// Thay thế nút fab-add cũ bằng 2 nút mới
function formatCurrency(amount) {
  if (!amount) return '0';
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

fabIncome.onclick = () => {
  currentEntryType = 'income';
  openCamera();
};

fabExpense.onclick = () => {
  currentEntryType = 'expense';
  openCamera();
};

// Utils: Relative Time
function getRelativeTime(dateIso) {
  const date = new Date(dateIso);
  const now = new Date();
  const diffMs = now - date;
  
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// Modals
function fixIOSScroll() {
  setTimeout(() => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
  }, 100);
}

function openModal(modal) {
  modal.classList.remove('hidden');
}
function closeModal(modal) {
  modal.classList.add('hidden');
  fixIOSScroll();
}

priceInput.addEventListener('blur', fixIOSScroll);
noteInput.addEventListener('blur', fixIOSScroll);

// Month Selector Logic
function updateMonthBtnText() {
  const now = new Date();
  if (currentYear === now.getFullYear() && currentMonth === (now.getMonth() + 1)) {
    btnOpenMonths.innerHTML = `Tháng này <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
  } else {
    btnOpenMonths.innerHTML = `Tháng ${currentMonth}/${currentYear} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
  }
}

function renderMonthGrid() {
  displayYear.textContent = currentYear;
  monthGrid.innerHTML = '';
  for (let i = 1; i <= 12; i++) {
    const btn = document.createElement('button');
    btn.className = `month-item ${i === currentMonth ? 'active' : ''}`;
    btn.innerHTML = `Tháng ${i}<br><span style="font-size:12px;opacity:0.6">-</span>`;
    btn.onclick = () => {
      currentMonth = i;
      updateMonthBtnText();
      renderMonthGrid();
      closeModal(modalMonths);
      renderFeed();
    };
    monthGrid.appendChild(btn);
  }
}

btnOpenMonths.onclick = () => openModal(modalMonths);
btnCloseMonths.onclick = () => closeModal(modalMonths);
btnPrevYear.onclick = () => { currentYear--; renderMonthGrid(); };
btnNextYear.onclick = () => { currentYear++; renderMonthGrid(); };

// Camera Logic
async function openCamera() {
  openModal(modalCamera);
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: facingMode }, 
      audio: false 
    });
    video.srcObject = cameraStream;
  } catch (err) {
    alert('Không thể truy cập camera. Vui lòng cấp quyền trong cài đặt.');
    closeCamera();
  }
}

function closeCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  closeModal(modalCamera);
}

btnCloseCamera.onclick = closeCamera;
btnFlipCamera.onclick = () => {
  facingMode = facingMode === 'environment' ? 'user' : 'environment';
  closeCamera();
  setTimeout(openCamera, 300);
};

// Capture Image
captureBtn.onclick = () => {
  if (!video.videoWidth) return;
  const canvas = document.createElement('canvas');
  const targetWidth = 400;
  const ratio = video.videoHeight / video.videoWidth;
  const targetHeight = targetWidth * ratio;
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
  
  currentImage = canvas.toDataURL('image/jpeg', 0.6);
  closeCamera(); // Stop camera to save resource
  openDetail();
};

// Detail Modal
function openDetail() {
  previewImg.src = currentImage;
  priceInput.value = '';
  noteInput.value = '';
  openModal(modalDetail);
  // Focus price
  setTimeout(() => priceInput.focus(), 300);
}

// Định dạng giá tiền (hiển thị dấu chấm)
priceInput.addEventListener('input', (e) => {
  let value = e.target.value.replace(/\D/g, ''); // Xóa chữ/ký tự thừa
  if (value) {
    e.target.value = formatCurrency(value);
  } else {
    e.target.value = '';
  }
});

btnCancelDetail.onclick = () => {
  currentImage = null;
  closeModal(modalDetail);
}

btnSaveDetail.onclick = async () => {
  const rawPrice = priceInput.value.replace(/\D/g, '');
  const price = parseInt(rawPrice, 10);
  if (!price || isNaN(price)) {
    alert('Vui lòng nhập giá tiền hợp lệ!');
    return;
  }
  
  const note = noteInput.value.trim();
  
  const newItem = {
    id: Date.now().toString(),
    price: price,
    note: note,
    image: currentImage,
    date: new Date().toISOString(),
    type: currentEntryType // Lưu lại trạng thái Thu/Chi
  };
  
  expenses.push(newItem); // Đưa item mới xuống dưới cùng
  await saveData();
  
  closeModal(modalDetail);
  currentImage = null;
  
  // Reset back to current month
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth() + 1;
  updateMonthBtnText();
  renderMonthGrid();
  renderFeed();
}

// Rendering Feed
function renderFeed() {
  feedContainer.innerHTML = '';
  let totalIncome = 0;
  let totalExpense = 0;
  
  const filtered = expenses.filter(item => {
    const d = new Date(item.date);
    return d.getFullYear() === currentYear && (d.getMonth() + 1) === currentMonth;
  }).sort((a, b) => new Date(a.date) - new Date(b.date)); // Xếp cũ ở trên, mới ở dưới
  
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    filtered.forEach(item => {
      // Đảm bảo dữ liệu cũ không có type sẽ mặc định là expense
      const itemType = item.type || 'expense';
      if (itemType === 'income') {
        totalIncome += item.price;
      } else {
        totalExpense += item.price;
      }
      feedContainer.appendChild(createCard(item));
    });
  }
  
  totalIncomeDisplay.textContent = '+ ' + formatCurrency(totalIncome) + ' đ';
  totalExpenseDisplay.textContent = '- ' + formatCurrency(totalExpense) + ' đ';
  
  // Tự động cuộn xuống cuối cùng để xem giao dịch mới nhanh nhất
  setTimeout(() => {
    feedContainer.scrollTop = feedContainer.scrollHeight;
  }, 100);
}

// Create Feed Card with Swipe & Selection Logic
function createCard(item) {
  const wrapper = document.createElement('div');
  const itemType = item.type || 'expense';
  wrapper.className = `expense-card card-${itemType}`;
  wrapper.id = `card-${item.id}`;
  
  const prefix = itemType === 'income' ? '+ ' : '- ';
  const priceStr = prefix + formatCurrency(item.price) + ' đ';
  const timeStr = getRelativeTime(item.date);
  
  wrapper.innerHTML = `
    <div class="expense-card-bg">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
    </div>
    <div class="expense-card-inner">
      <div class="selection-check"></div>
      <img src="${item.image}" class="expense-img" alt=""/>
      <div class="expense-info">
        <div class="expense-price">${priceStr}</div>
        <div class="expense-time">${timeStr}</div>
        ${item.note ? `<div class="expense-note">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
           ${item.note}
        </div>` : ''}
      </div>
    </div>
  `;
  
  const innerCard = wrapper.querySelector('.expense-card-inner');
  const trashBg = wrapper.querySelector('.expense-card-bg');
  
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let isDragging = false;
  let isVerticalScroll = false;
  let isOpen = false;
  let pressTimer = null;
  const maxSwipe = -80; // revealing right side 80px
  
  innerCard.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = startX;
    isDragging = true;
    isVerticalScroll = false;
    innerCard.style.transition = 'none';

    // Long press detection
    if (!isSelectionMode) {
      pressTimer = setTimeout(() => {
        enterSelectionMode();
        toggleSelection(item.id, wrapper);
        isDragging = false; // Ngừng dragging behavior
      }, 500); // Giữ 500ms
    }
  }, { passive: true });
  
  innerCard.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    const touchY = e.touches[0].clientY;
    currentX = e.touches[0].clientX;
    
    if (Math.abs(touchY - startY) > 10 || Math.abs(currentX - startX) > 10) {
      clearTimeout(pressTimer);
    }

    if (isSelectionMode) return; // Nếu đang chọn nhiều thẻ thì khóa swipe
    
    // Nếu di chuyển dọc nhiều hơn ngang, thì đó là cuộn trang
    if (Math.abs(touchY - startY) > Math.abs(currentX - startX) + 5) {
      isVerticalScroll = true;
    }
    
    if (isVerticalScroll) {
      innerCard.style.transform = isOpen ? `translateX(${maxSwipe}px)` : `translateX(0px)`;
      return;
    }
    
    let diffX = currentX - startX;
    if (isOpen) diffX += maxSwipe;
    
    if (diffX < 10) {
      const translateX = Math.max(diffX, maxSwipe - 20);
      innerCard.style.transform = `translateX(${translateX}px)`;
    }
  }, { passive: true });
  
  innerCard.addEventListener('touchend', (e) => {
    clearTimeout(pressTimer);
    if (!isDragging) return;
    isDragging = false;
    
    if (isSelectionMode) return; // Bỏ qua vuốt nếu đang Selection Mode
    
    if (isVerticalScroll) return;
    
    innerCard.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    let diffX = currentX - startX;
    if (isOpen) diffX += maxSwipe;
    
    if (diffX < maxSwipe / 2) {
      innerCard.style.transform = `translateX(${maxSwipe}px)`;
      isOpen = true;
    } else {
      innerCard.style.transform = `translateX(0px)`;
      isOpen = false;
    }
  });

  // Chạm vào thẻ cũng mở/đóng thùng rác
  innerCard.addEventListener('click', (e) => {
    clearTimeout(pressTimer);
    if (isSelectionMode) {
      toggleSelection(item.id, wrapper);
      return;
    }

    // Chỉ tính là click nếu không phải hành vi kéo tay
    if (Math.abs(currentX - startX) < 5 && !isVerticalScroll) {
      isOpen = !isOpen;
      innerCard.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
      innerCard.style.transform = isOpen ? `translateX(${maxSwipe}px)` : `translateX(0px)`;
    }
  });

  // Chạm vào vùng đỏ để hỏi Xóa
  trashBg.addEventListener('click', (e) => {
    if (isOpen && !isSelectionMode) {
      if (confirm('Bạn có chắc muốn xóa khoản chi tiêu này?')) {
        innerCard.style.transform = `translateX(-100%)`; // Trượt hẳn sang trái biến mất
        setTimeout(async () => {
          expenses = expenses.filter(i => i.id !== item.id);
          await saveData();
          renderFeed();
        }, 300);
      } else {
        isOpen = false;
        innerCard.style.transform = `translateX(0px)`;
      }
    }
  });
  
  return wrapper;
}

// ================= SELECTION MODE LOGIC =================
function enterSelectionMode() {
  isSelectionMode = true;
  selectedIds.clear();
  appContainer.classList.add('selection-mode');
  
  totalsWrapper.classList.add('hidden');
  document.getElementById('btn-open-months').classList.add('hidden');
  appTitle.textContent = 'Chọn mục';
  
  btnCancelSelect.classList.remove('hidden');
  fabContainer.classList.add('hidden');
  fabDelete.classList.remove('hidden');
  updateDeleteBtn();
}

btnCancelSelect.onclick = exitSelectionMode;

function exitSelectionMode() {
  isSelectionMode = false;
  selectedIds.clear();
  appContainer.classList.remove('selection-mode');
  
  totalsWrapper.classList.remove('hidden');
  document.getElementById('btn-open-months').classList.remove('hidden');
  appTitle.textContent = 'Chi tiêu';
  
  btnCancelSelect.classList.add('hidden');
  fabContainer.classList.remove('hidden');
  fabDelete.classList.add('hidden');
  
  // Unselect all DOM cards
  document.querySelectorAll('.expense-card').forEach(card => card.classList.remove('selected'));
  
  // Reset mọi thẻ lỡ đang mở thùng rác
  document.querySelectorAll('.expense-card-inner').forEach(inner => {
    inner.style.transform = `translateX(0px)`;
  });
}

function toggleSelection(id, cardElement) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id);
    cardElement.classList.remove('selected');
  } else {
    selectedIds.add(id);
    cardElement.classList.add('selected');
  }
  updateDeleteBtn();
}

function updateDeleteBtn() {
  if (selectedIds.size === 0) {
    fabDelete.classList.add('disabled');
  } else {
    fabDelete.classList.remove('disabled');
  }
}

fabDelete.onclick = async () => {
  if (selectedIds.size > 0 && confirm(`Bạn có chắc muốn xóa ${selectedIds.size} khoản chi tiêu?`)) {
    expenses = expenses.filter(i => !selectedIds.has(i.id));
    await saveData();
    exitSelectionMode();
    renderFeed();
  }
};

// Storage
async function saveData() {
  await Preferences.set({ key: 'EXPENSES_DATA', value: JSON.stringify(expenses) });
}

async function loadData() {
  const { value } = await Preferences.get({ key: 'EXPENSES_DATA' });
  if (value) {
    expenses = JSON.parse(value);
  }
}

init();
