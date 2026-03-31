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
const db = firebase.firestore();

/* ────────── CONFIGURACIÓN DEL ÁLBUM ────────── */
const GLOBAL_PASSWORD = "1234"; // ← Cambia la contraseña de las fotos secretas aquí
let currentAttemptId = null; 
let albumData = []; // Aquí guardaremos las fotos que bajen de la nube

/* ────────── 2. ESCUCHAR LA BASE DE DATOS ────────── */
function startAlbumListener() {
  db.collection("album").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
    albumData = [];
    snapshot.forEach((doc) => {
      // Guardamos cada foto de la base de datos en nuestra lista local
      albumData.push({ id: doc.id, ...doc.data() });
    });
    renderAlbum(); // Dibujamos las fotos
  });
}

/* ────────── 3. RENDERIZAR EL MASONRY ────────── */
function renderAlbum() {
  const grid = document.getElementById('album-grid');
  if(!grid) return;
  grid.innerHTML = ''; 

  albumData.forEach(media => {
    // Generar rotación aleatoria entre -3 y 3 grados para el efecto Polaroid
    const randomRot = (Math.random() * 6 - 3).toFixed(1) + 'deg';
    
    const itemDiv = document.createElement('div');
    itemDiv.className = `media-item ${media.isSecret ? 'locked' : ''}`;
    itemDiv.style.setProperty('--rot', randomRot);
    itemDiv.onclick = () => handleMediaClick(media.id);

    let mediaHTML = '';
    
    if (media.type === 'image') {
      mediaHTML = `<img src="${media.src}" class="media-thumbnail" alt="Recuerdo">`;
    } else if (media.type === 'video') {
      mediaHTML = `
        <video class="media-thumbnail" preload="metadata">
          <source src="${media.src}#t=0.1" type="video/mp4">
        </video>
        <div class="video-icon">▶️</div>
      `;
    }

    const lockHTML = media.isSecret ? `<div class="lock-icon" id="lock-${media.id}">🔒</div>` : '';
    const descHTML = media.desc ? `<p class="media-caption">${media.desc}</p>` : '';

    itemDiv.innerHTML = `
      ${mediaHTML}
      ${lockHTML}
      ${descHTML}
    `;

    grid.appendChild(itemDiv);
  });
}

/* ────────── 4. LÓGICA DE CLICS ────────── */
function handleMediaClick(id) {
  const media = albumData.find(m => m.id === id);
  if (!media) return;

  if (media.isSecret) {
    currentAttemptId = id;
    document.getElementById('vault-modal').classList.remove('hidden');
    document.getElementById('vault-password').value = '';
    document.getElementById('vault-password').focus();
  } else {
    openLightbox(media);
  }
}

/* ────────── 5. BÓVEDA Y CONTRASEÑA ────────── */
function closeVaultModal() {
  document.getElementById('vault-modal').classList.add('hidden');
  currentAttemptId = null;
}

function unlockMedia() {
  const input = document.getElementById('vault-password').value;
  
  if (input === GLOBAL_PASSWORD) {
    const media = albumData.find(m => m.id === currentAttemptId);
    if(media) {
      media.isSecret = false; // La desbloqueamos localmente
      renderAlbum(); 
      openLightbox(media);
    }
    closeVaultModal();
  } else {
    const box = document.querySelector('.vault-box');
    box.style.transform = "translateX(-10px)";
    setTimeout(() => box.style.transform = "translateX(10px)", 100);
    setTimeout(() => box.style.transform = "translateX(0)", 200);
  }
}

/* ────────── 6. VISOR LIGHTBOX (Grande) ────────── */
function openLightbox(media) {
  const modal = document.getElementById('lightbox-modal');
  const container = document.getElementById('lightbox-media-container');
  const caption = document.getElementById('lightbox-caption');

  container.innerHTML = ''; 
  caption.textContent = media.desc || '';

  if (media.type === 'image') {
    container.innerHTML = `<img src="${media.src}" alt="Recuerdo en grande">`;
  } else if (media.type === 'video') {
    container.innerHTML = `
      <video controls autoplay>
        <source src="${media.src}" type="video/mp4">
      </video>
    `;
  }

  modal.classList.remove('hidden');
}

function closeLightbox(event, force = false) {
  if (force || event.target.id === 'lightbox-modal') {
    const modal = document.getElementById('lightbox-modal');
    modal.classList.add('hidden');
    
    const video = modal.querySelector('video');
    if (video) video.pause();
  }
}

// Arrancamos la lectura de Firebase al cargar la página
window.addEventListener('DOMContentLoaded', startAlbumListener);