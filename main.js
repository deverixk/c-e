/* ═══════════════════════════════════════════════════════════
   C & E — main.js
═══════════════════════════════════════════════════════════ */
'use strict';

/* ────────── 1. CONFIGURACIÓN FIREBASE ────────── */
const firebaseConfig = {
  apiKey: "AIzaSyD84F791Sbv9vFongeTU9D6I52huafOphM",
  authDomain: "cuarto-c-y-e.firebaseapp.com",
  projectId: "cuarto-c-y-e",
  storageBucket: "cuarto-c-y-e.firebasestorage.app",
  messagingSenderId: "273679472450",
  appId: "1:273679472450:web:781503c555cde9941b9adb"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUserEmail = null;

/* ────────── 2. SISTEMA DE LOGIN Y SESIÓN MÁGICA ────────── */

// 1. El Vigilante: Revisa si ya hay una sesión guardada al recargar
auth.onAuthStateChanged((user) => {
  const loginScreen = document.getElementById('login-screen');
  const introScreen = document.getElementById('intro-screen');
  const roomScreen = document.getElementById('room-screen');

  if (user) {
    // ¡Ya estaba logueado! (O acaba de poner la contraseña)
    currentUserEmail = user.email;
    
    // Encendemos la memoria del cuarto
    startDiaryListener();
    startLettersListener();
    startCalendarListener();
    
    // Ocultamos la puerta de login suavemente
    loginScreen.style.opacity = '0';
    setTimeout(() => { 
      loginScreen.style.display = 'none'; 
      
      // TRUCO: ¿Viene de regreso del álbum?
      if (sessionStorage.getItem('hasSeenIntro')) {
        // Si ya vio la intro en esta sesión, lo mandamos directo al cuarto
        introScreen.style.display = 'none';
        roomScreen.classList.add('visible', 'faded-in');
      } else {
        // Es su primera vez abriendo la pestaña hoy: SOLTAMOS ANIMACIONES
        introScreen.classList.add('play-animations');
      }
    }, 500);

  } else {
    // No hay sesión, mostramos la cerradura
    loginScreen.style.display = 'flex';
    loginScreen.style.opacity = '1';
  }
});

// 2. La función del botón "Abrir Puerta"
function loginWithFirebase() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value.trim();
  const errorMsg = document.getElementById('login-error');

  if (!email || !pass) {
    errorMsg.textContent = "Por favor llena ambos campos.";
    errorMsg.classList.add('show');
    return;
  }

  // Firebase hace el login. Si es correcto, el "Vigilante" de arriba se dará cuenta solito y nos dejará pasar.
  auth.signInWithEmailAndPassword(email, pass)
    .catch((error) => {
      console.error(error);
      errorMsg.textContent = "Datos incorrectos. Intenta de nuevo.";
      errorMsg.classList.add('show');
      setTimeout(() => errorMsg.classList.remove('show'), 3000);
    });
}

/* ────────── CONFIGURACIÓN GENERAL ────────── */
const START_DATE = new Date('2026-02-17T17:00:00'); 
let counterInterval = null;
let currentModal  = null;
let vinylSpinning = false;

/* ────────── 3. CARTAS (FIREBASE) ────────── */
let lettersData = []; 

function startLettersListener() {
  db.collection("cartas").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    lettersData = []; 
    snapshot.forEach((doc) => {
      lettersData.push({ id: doc.id, ...doc.data() });
    });
    renderFirebaseLetters(); 
  });
}

function renderFirebaseLetters() {
  const list = document.getElementById('letters-list');
  if (!list) return;
  list.innerHTML = '';

  lettersData.forEach((letter, index) => {
    const isRead = letter.read === true;
    const statusClass = isRead ? 'read' : 'unread';
    const statusIcon = isRead ? '·' : '!'; 

    const li = document.createElement('li');
    li.className = `letter-item ${statusClass}`;
    li.onclick = () => openFirebaseLetter(index);
    li.innerHTML = `
      <span class="status-icon">${statusIcon}</span>
      <span class="letter-title">${letter.title}</span>
    `;
    list.appendChild(li);
  });
}

function openFirebaseLetter(index) {
  const letter = lettersData[index];
  if (!letter) return;

  if (!letter.read) {
    db.collection("cartas").doc(letter.id).update({ read: true })
      .catch(error => console.error(error));
  }

  const listView = document.getElementById('letters-list-view');
  const singleView = document.getElementById('single-letter-view');
  const contentTarget = document.getElementById('letter-content-target');
  const paperSheet = document.getElementById('paper-sheet-element');

  contentTarget.innerHTML = letter.body;
  listView.classList.add('hidden');
  singleView.classList.remove('hidden');

  paperSheet.classList.remove('is-open');
  void paperSheet.offsetWidth; 
  paperSheet.classList.add('is-open');

  document.getElementById('modal-letters').scrollTop = 0;
}

function closeLetter() {
  const listView = document.getElementById('letters-list-view');
  const singleView = document.getElementById('single-letter-view');
  const paperSheet = document.getElementById('paper-sheet-element');

  if (!listView || !singleView || !paperSheet) return;

  paperSheet.classList.remove('is-open');
  singleView.classList.add('hidden');
  listView.classList.remove('hidden');
}

/* ────────── 4. DIARIO (FIREBASE) ────────── */
function getCurrentAuthor() {
  if (!currentUserEmail) return 'C'; 
  if (currentUserEmail.toLowerCase().startsWith('e')) return 'E';
  return 'C';
}

function formatFirebaseDate(timestamp) {
  if (!timestamp) return 'Justo ahora';
  const date = timestamp.toDate();
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function saveDiaryEntry() {
  const textarea = document.getElementById('diary-textarea');
  const text = textarea.value.trim();
  if (!text || !currentUserEmail) return;

  db.collection("diario").add({
    text: text,
    author: getCurrentAuthor(),
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    textarea.value = '';
  }).catch((error) => console.error(error));
}

function startDiaryListener() {
  db.collection("diario").orderBy("timestamp", "asc").onSnapshot((snapshot) => {
    const containerC = document.getElementById('entries-c');
    const containerE = document.getElementById('entries-e');
    containerC.innerHTML = '';
    containerE.innerHTML = '';

    snapshot.forEach((doc) => {
      const data = doc.data();
      const entryDiv = document.createElement('div');
      entryDiv.className = 'diary-entry';
      
      const dateSpan = document.createElement('span');
      dateSpan.className = 'diary-date';
      dateSpan.textContent = formatFirebaseDate(data.timestamp);
      
      const textP = document.createElement('p');
      textP.className = 'diary-text';
      textP.textContent = data.text;
      
      entryDiv.appendChild(dateSpan);
      entryDiv.appendChild(textP);

      if (data.author === 'C') {
        containerC.prepend(entryDiv);
      } else {
        containerE.prepend(entryDiv);
      }
    });
  });
}

/* ────────── 5. CALENDARIO (FIREBASE) ────────── */
let intimateDates = new Set(); 
let currentDate = new Date();

setInterval(() => {
  const now = new Date();
  const timeEl = document.getElementById('lock-time');
  if (timeEl) {
    timeEl.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  }
}, 1000);

function startCalendarListener() {
  db.collection("calendario").doc("corazones").onSnapshot((doc) => {
    if (doc.exists) {
      const fechasArray = doc.data().fechas || [];
      intimateDates = new Set(fechasArray);
    } else {
      intimateDates = new Set();
    }
    
    if (document.getElementById('phone-app').classList.contains('active')) {
      renderCalendar();
    }
  });
}

function unlockPhone() {
  const pinInput = document.getElementById('phone-pin');
  const errorMsg = document.getElementById('lock-error');
  
  if (pinInput.value === "6565") { 
    document.getElementById('phone-lockscreen').classList.add('hidden');
    document.getElementById('phone-app').classList.remove('hidden'); 
    document.getElementById('phone-app').classList.add('active'); 
    
    pinInput.value = '';
    renderCalendar(); 
  } else {
    errorMsg.classList.add('show');
    setTimeout(() => errorMsg.classList.remove('show'), 2000);
    pinInput.value = '';
  }
}

function changeMonth(dir) {
  currentDate.setMonth(currentDate.getMonth() + dir);
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('cal-grid');
  const monthYearLabel = document.getElementById('cal-month-year');
  if(!grid) return;
  grid.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  monthYearLabel.textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startOffset = firstDay === 0 ? 6 : firstDay - 1;

  for (let i = 0; i < startOffset; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'cal-day empty';
    grid.appendChild(emptyCell);
  }

  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayCell = document.createElement('div');
    dayCell.className = 'cal-day';
    dayCell.textContent = day;
    
    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayCell.classList.add('today');
    }

    if (intimateDates.has(dateStr)) {
      dayCell.classList.add('active');
    }

    dayCell.onclick = () => toggleHeart(dateStr);
    grid.appendChild(dayCell);
  }
  updateStreak();
}

function toggleHeart(dateStr) {
  const docRef = db.collection("calendario").doc("corazones");

  if (intimateDates.has(dateStr)) {
    docRef.update({
      fechas: firebase.firestore.FieldValue.arrayRemove(dateStr)
    }).catch(err => console.error(err));
  } else {
    docRef.set({
      fechas: firebase.firestore.FieldValue.arrayUnion(dateStr)
    }, { merge: true }); 
  }
}

function updateStreak() {
  const streakCounter = document.getElementById('streak-counter');
  if(!streakCounter) return;

  if (intimateDates.size === 0) {
    streakCounter.textContent = "0";
    return;
  }

  let activeWeeks = new Set();
  intimateDates.forEach(dateStr => {
    let d = new Date(dateStr + "T00:00:00"); 
    let day = d.getDay() || 7; 
    d.setDate(d.getDate() - day + 1); 
    activeWeeks.add(d.getTime()); 
  });

  let sortedWeeks = Array.from(activeWeeks).sort((a, b) => b - a);
  let streak = 1; 
  const UN_DIA_MS = 24 * 60 * 60 * 1000;
  const UNA_SEMANA_MS = 7 * UN_DIA_MS;

  for (let i = 0; i < sortedWeeks.length - 1; i++) {
    let diff = sortedWeeks[i] - sortedWeeks[i+1];
    if (diff >= (UNA_SEMANA_MS - UN_DIA_MS) && diff <= (UNA_SEMANA_MS + UN_DIA_MS)) {
      streak++;
    } else { break; }
  }
  streakCounter.textContent = streak;
}

/* ────────── 6. UI Y EFECTOS ────────── */
function enterRoom() {
  sessionStorage.setItem('hasSeenIntro', 'true');

  const intro = document.getElementById('intro-screen');
  const room  = document.getElementById('room-screen');
  intro.classList.add('fade-out');
  setTimeout(() => {
    intro.style.display = 'none';
    room.classList.add('visible');
    requestAnimationFrame(() => room.classList.add('faded-in'));
  }, 1200);
}

(function initZones() {
  const zones   = document.querySelectorAll('.zone');
  const tooltip = document.getElementById('zone-tooltip');
  let tooltipTimeout = null;

  zones.forEach(zone => {
    zone.addEventListener('mouseenter', (e) => {
      const hint = zone.dataset.hint || '';
      if (!hint) return;
      clearTimeout(tooltipTimeout);
      tooltip.textContent = hint;
      positionTooltip(e, tooltip);
      tooltip.classList.add('show');
    });

    zone.addEventListener('mousemove', (e) => positionTooltip(e, tooltip));

    zone.addEventListener('mouseleave', () => {
      tooltipTimeout = setTimeout(() => tooltip.classList.remove('show'), 120);
    });

    zone.addEventListener('click', () => {
      const modalId = zone.dataset.modal;
      const linkId = zone.dataset.link;
      
      if (modalId) {
        openModal(modalId);
      } else if (linkId) {
        const room = document.getElementById('room-screen');
        room.style.transition = 'opacity 0.8s ease';
        room.style.opacity = '0';
        setTimeout(() => window.location.href = linkId, 800);
      }
    });
  });

  function positionTooltip(e, el) {
    const tw = el.offsetWidth || 100;
    el.style.left = Math.min(e.clientX + 14, window.innerWidth - tw - 16) + 'px';
    el.style.top  = Math.max(e.clientY - 36, 10) + 'px';
  }
})();

function openModal(id) {
  if (currentModal) document.getElementById(currentModal).classList.remove('active');
  currentModal = id;
  document.getElementById('overlay').classList.add('active');
  document.getElementById(id).classList.add('active');
  if (id === 'modal-counter') initCounter();
  if (id === 'modal-music') resetVinyl();
}

function closeModal() {
  if (!currentModal) return;
  if (counterInterval) { clearInterval(counterInterval); counterInterval = null; }
  
  document.getElementById('overlay').classList.remove('active');
  document.getElementById(currentModal).classList.remove('active');

  if (currentModal === 'modal-music') stopVinyl();
  if (currentModal === 'modal-letters') closeLetter(); 

  currentModal = null;
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

function initCounter() {
  if (counterInterval) clearInterval(counterInterval);
  updateCounter();
  counterInterval = setInterval(updateCounter, 1000);
}

function updateCounter() {
  const el = document.getElementById('counter-full');
  if (!el) return;
  const diff = new Date() - START_DATE;
  if (diff < 0) { el.textContent = 'Pronto empieza todo…'; return; }
  
  const totalSeg = Math.floor(diff / 1000);
  const dias = Math.floor(totalSeg / 86400);
  const hrs  = Math.floor(totalSeg / 3600) % 24;
  
  el.textContent = `${dias} ${dias === 1 ? 'dia' : 'dias'} · ${hrs} ${hrs === 1 ? 'hora' : 'horas'} · ${Math.floor(totalSeg / 60) % 60} min · ${totalSeg % 60} s`;
}

function toggleTrack(element) {
  const isActive = element.classList.contains('active');
  document.querySelectorAll('.track-wrapper').forEach(t => t.classList.remove('active'));
  const vinyl = document.getElementById('vinyl-record');

  if (!isActive) {
    element.classList.add('active');
    vinyl.classList.add('spinning');
    vinylSpinning = true;
  } else {
    vinyl.classList.remove('spinning');
    vinylSpinning = false;
  }
}

function resetVinyl() {
  document.querySelectorAll('.track-wrapper').forEach(t => t.classList.remove('active'));
  document.getElementById('vinyl-record').classList.remove('spinning');
  vinylSpinning = false;
}

function stopVinyl() {
  document.getElementById('vinyl-record').classList.remove('spinning');
  vinylSpinning = false;
}

(function initParticles() {
  const container = document.getElementById('intro-particles');
  if (!container) return;
  const CHARS = ['✦', '·', '♡', '✿', '°'];
  for (let i = 0; i < 22; i++) {
    const span = document.createElement('span');
    span.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
    span.style.cssText = `position:absolute; font-size:${6 + Math.random() * 10}px; color:rgba(201,169,110,${0.05 + Math.random() * 0.18}); left:${Math.random() * 100}%; top:${Math.random() * 100}%; animation:floatParticle ${8 + Math.random() * 14}s ease-in-out ${Math.random() * 6}s infinite alternate; pointer-events:none;`;
    container.appendChild(span);
  }
})();

async function startNfcScan() {
  const statusText = document.getElementById('nfc-status-text');
  if (!("NDEFReader" in window)) {
    statusText.textContent = "Tu navegador no soporta escaneo en vivo. Intenta usar Chrome en Android.";
    statusText.style.color = "red";
    return;
  }
  try {
    const ndef = new NDEFReader();
    await ndef.scan();
    statusText.textContent = "Antena encendida. Esperando contacto físico...";
    statusText.style.color = "#1DB954"; 
    document.querySelector('.radar-pulse').style.animationDuration = "1s";

    ndef.onreading = () => {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      revealNfcSecret();
    };
    ndef.onreadingerror = () => {
      statusText.textContent = "Hubo un error al leer el amuleto. Intenta de nuevo.";
      statusText.style.color = "red";
    };
  } catch (error) {
    statusText.textContent = "No se pudo acceder al escáner NFC. ¿Diste permisos?";
  }
}

function revealNfcSecret() {
  document.getElementById('nfc-radar-screen').classList.add('hidden');
  const secretScreen = document.getElementById('nfc-revealed-screen');
  secretScreen.classList.remove('hidden');
  void secretScreen.offsetWidth;
}

function setDayNightBackground() {
  const roomContainer = document.getElementById('room-container');
  if (!roomContainer) return;
  const isDaytime = new Date().getHours() >= 6 && new Date().getHours() < 19;
  roomContainer.style.backgroundImage = isDaytime ? "url('C_E_room_Day.png')" : "url('C_E_room_Night.png')";
}

setDayNightBackground();