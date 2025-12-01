
// Firebase 설정 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  remove,
  off,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const USE_FIREBASE = true; 
// const USE_FIREBASE = false; // ← 로컬 모드만 

const firebaseConfig = {
  apiKey: "AIzaSyCDqh874UuYAT3Mmox1GLvHA4BfakrTfW0",
  authDomain: "homesweethome-21569.firebaseapp.com",
  projectId: "homesweethome-21569",
  storageBucket: "homesweethome-21569.appspot.com",
  messagingSenderId: "404205971778",
  appId: "1:404205971778:web:7af3eab2d87eaca53640db",
  databaseURL: "https://homesweethome-21569-default-rtdb.firebaseio.com/",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Firebase 안전 호출용 
async function fbSafeGet(path) {
  if (!USE_FIREBASE) return null;
  try {
    const snap = await get(ref(db, path));
    return snap.exists() ? snap.val() : null;
  } catch (err) {
    console.warn(" Firebase GET 실패 → 로컬로 대체:", err);
    return null;
  }
}

async function fbSafeSet(path, value) {
  if (!USE_FIREBASE) return;
  try {
    return await set(ref(db, path), value);
  } catch (err) {
    console.warn(" Firebase SET 실패 → 로컬만 저장:", err);
  }
}

async function fbSafeRemove(path) {
  if (!USE_FIREBASE) return;
  try {
    return await remove(ref(db, path));
  } catch (err) {
    console.warn(" Firebase REMOVE 실패:", err);
  }
}

function fbSafeOn(path, callback) {
  if (!USE_FIREBASE) return null;
  try {
    const r = ref(db, path);
    onValue(r, (snap) => {
      callback(snap.exists() ? snap.val() : null);
    });
    return r;
  } catch (err) {
    console.warn(" Firebase ON 실패:", err);
    return null;
  }
}

// DOM 요소
const furniturePanel = document.getElementById("furniturePanel");
const toggleFurnitureBtn = document.getElementById("toggleFurnitureBtn");
const furnitureLayer = document.getElementById("furnitureLayer");
const roomAreaEl = document.getElementById("roomArea");
const roomTabsContainer = document.getElementById("roomTabs");
const roomInfoEl = document.getElementById("roomInfo");
const furnitureListEl = document.getElementById("furnitureList");

// 패널 열기
toggleFurnitureBtn?.addEventListener("click", () => {
  furniturePanel.classList.toggle("open");
});

// 사용자 정보 로드
function getPlayerData() {
  return (
    JSON.parse(localStorage.getItem("playerData")) || {
      name: "유저",
      emoji: "🐱",
      photo: null,
      level: 1,
      coins: 0,
    }
  );
}

function renderUserInfo() {
  const data = getPlayerData();
  const btn = document.getElementById("userProfileBtn");
  const n = document.getElementById("userName");

  if (btn) {
    if (data.photo) {
      btn.style.backgroundImage = `url(${data.photo})`;
      btn.innerText = "";
    } else {
      btn.innerText = data.emoji;
      btn.style.backgroundImage = "";
    }
    btn.onclick = () => location.href = "profile.html";
  }

  if (n) {
    n.innerText = data.name;
    n.onclick = () => location.href = "profile.html";
  }
}

// 방 기초 설정
let currentRoom = 1;
let roomOwnerId = localStorage.getItem("userId") || "user_" + Date.now();

localStorage.setItem("userId", roomOwnerId);

let maxRoomIndex = Number(localStorage.getItem("totalRooms")) || 1;

function getRoomName(n) {
  return localStorage.getItem(`roomName_${n}`) || `방 ${n}`;
}

async function setRoomName(n, name) {
  localStorage.setItem(`roomName_${n}`, name);
  await fbSafeSet(`users/${roomOwnerId}/rooms/${n}/name`, name);
}

function updateRoomInfo() {
  if (roomInfoEl) {
    roomInfoEl.textContent = `${currentRoom}번 방 - ${getRoomName(currentRoom)}`;
  }
}

// 방 레이아웃 키
function roomLayoutKey(n) {
  return `roomLayout_${roomOwnerId}_${n}`;
}

// 현재 화면 DOM에서 레이아웃 수집
function collectLayoutFromDOM() {
  const layout = [];
  document.querySelectorAll(".room-furniture").forEach(el => {
    const img = el.querySelector("img");
    layout.push({
      src: img.src,
      x: el.style.left,
      y: el.style.top,
      scale: el.dataset.scale,
      rotate: el.dataset.rotate,
      locked: el.dataset.locked
    });
  });
  return layout;
}

// 방 레이아웃 저장 
async function saveCurrentRoomLayout() {
  const layout = collectLayoutFromDOM();
  localStorage.setItem(roomLayoutKey(currentRoom), JSON.stringify(layout));
  await fbSafeSet(`users/${roomOwnerId}/rooms/${currentRoom}/layout`, layout);
}

// 방 레이아웃 적용
function renderLayout(layout) {
  furnitureLayer.innerHTML = "";
  layout.forEach(d => addFurnitureToRoom(d.src, d, false));
}

// Firebase 1회 로딩
async function loadRoomLayoutOnce(room) {
  const data = await fbSafeGet(`users/${roomOwnerId}/rooms/${room}/layout`);
  if (data) {
    renderLayout(data);
    return true;
  }
  return false;
}

// 로컬에서 로딩
function loadRoomLayoutFromLocal(room) {
  const saved = localStorage.getItem(roomLayoutKey(room));
  if (!saved) return false;
  renderLayout(JSON.parse(saved));
  return true;
}

// Firebase 실시간 반영
let currentRoomListener = null;

function subscribeRoomRealtime(room) {
  if (currentRoomListener) off(currentRoomListener);

  currentRoomListener = fbSafeOn(
    `users/${roomOwnerId}/rooms/${room}/layout`,
    (data) => {
      if (data) renderLayout(data);
    }
  );
}

// 방 로딩
async function loadRoom(room) {
  furnitureLayer.innerHTML = "";

  // Firebase → 로컬 순서
  const ok = await loadRoomLayoutOnce(room);
  if (!ok) loadRoomLayoutFromLocal(room);

  subscribeRoomRealtime(room);
}

// 가구 선택
let selectedFurniture = null;
let furnitureZ = 1000;

function selectFurniture(el) {
  document.querySelectorAll(".room-furniture").forEach(f => f.classList.remove("selected"));
  selectedFurniture = el;
  el.classList.add("selected");
}

// 가구 추가
function addFurnitureToRoom(src, opt = {}, save = true) {
  const wrap = document.createElement("div");
  wrap.className = "room-furniture";

  wrap.style.left = opt.x ?? "50%";
  wrap.style.top = opt.y ?? "60%";
  wrap.dataset.scale = opt.scale ?? "1";
  wrap.dataset.rotate = opt.rotate ?? "0";
  wrap.dataset.locked = opt.locked ?? "false";
  wrap.style.zIndex = furnitureZ++;

  const img = document.createElement("img");
  img.src = src;
  wrap.appendChild(img);

  wrap.onclick = (e) => {
    e.stopPropagation();
    selectFurniture(wrap);
  };

  furnitureLayer.appendChild(wrap);

  enableDrag(wrap);
  applyTransform(wrap);

  if (save) saveCurrentRoomLayout();
}

// 가구 transform 적용
function applyTransform(el) {
  el.style.transform = `scale(${el.dataset.scale}) rotate(${el.dataset.rotate}deg)`;
}

// 가구 드래그 이동
function enableDrag(el) {
  let dragging = false;
  let startX, startY, baseLeft, baseTop;

  el.addEventListener("mousedown", (e) => {
    if (el.dataset.locked === "true") return;
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    baseLeft = el.offsetLeft;
    baseTop = el.offsetTop;
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    el.style.left = baseLeft + (e.clientX - startX) + "px";
    el.style.top = baseTop + (e.clientY - startY) + "px";
  });

  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    saveCurrentRoomLayout();
  });
}

// 컨트롤 
document.querySelectorAll("#controlPanel button").forEach(btn => {
  btn.onclick = () => {
    if (!selectedFurniture) return;

    let scale = Number(selectedFurniture.dataset.scale);
    let rot = Number(selectedFurniture.dataset.rotate);
    const act = btn.dataset.act;

    switch (act) {
      case "confirm":
        selectedFurniture.dataset.locked = "true";
        return;

      case "edit":
        selectedFurniture.dataset.locked = "false";
        return;

      case "bigger":
        scale += 0.1;
        break;

      case "smaller":
        scale = Math.max(0.2, scale - 0.1);
        break;

      case "rotL":
        rot -= 10;
        break;

      case "rotR":
        rot += 10;
        break;

      case "delete":
        selectedFurniture.remove();
        selectedFurniture = null;
        saveCurrentRoomLayout();
        return;
    }

    selectedFurniture.dataset.scale = scale;
    selectedFurniture.dataset.rotate = rot;
    applyTransform(selectedFurniture);
    saveCurrentRoomLayout();
  };
});

// 방 전환 애니메이션
function slideRoom(dir) {
  roomAreaEl.style.transition = "transform .3s";
  roomAreaEl.style.transform = `translateX(${dir * 120}%)`;
  setTimeout(() => {
    roomAreaEl.style.transform = "translateX(0%)";
  }, 300);
}

// 방 탭
function renderRoomTabs() {
  roomTabsContainer.innerHTML = "";

  for (let i = 1; i <= maxRoomIndex; i++) {
    const btn = document.createElement("button");
    btn.className = `room-tab ${i === currentRoom ? "active" : ""}`;
    btn.textContent = `${i}번 방`;

    btn.onclick = async () => {
      if (i === currentRoom) return;
      await saveCurrentRoomLayout();

      const dir = i > currentRoom ? 1 : -1;

      currentRoom = i;
      updateRoomInfo();
      await loadRoom(i);
      renderRoomTabs();
      slideRoom(dir);
    };

    roomTabsContainer.appendChild(btn);
  }
}

// 방 추가
document.getElementById("addRoomBtn").onclick = async () => {
  await saveCurrentRoomLayout();

  const name = prompt("새 방 이름", `방 ${maxRoomIndex + 1}`);
  if (!name) return;

  maxRoomIndex++;
  localStorage.setItem("totalRooms", maxRoomIndex);
  localStorage.setItem(`roomName_${maxRoomIndex}`, name);

  await fbSafeSet(`users/${roomOwnerId}/rooms/${maxRoomIndex}`, {
    name,
    layout: []
  });

  currentRoom = maxRoomIndex;

  updateRoomInfo();
  renderRoomTabs();
  furnitureLayer.innerHTML = "";
  alert(`${name} 생성됨!`);
};

// 방 삭제
document.getElementById("deleteRoomBtn").onclick = async () => {
  if (!confirm(`${currentRoom}번 방을 삭제할까요?`)) return;

  await fbSafeRemove(`users/${roomOwnerId}/rooms/${currentRoom}`);

  localStorage.removeItem(roomLayoutKey(currentRoom));
  localStorage.removeItem(`roomName_${currentRoom}`);

  maxRoomIndex = Math.max(1, maxRoomIndex - 1);
  localStorage.setItem("totalRooms", maxRoomIndex);

  currentRoom = Math.min(currentRoom, maxRoomIndex);
  updateRoomInfo();
  renderRoomTabs();
  await loadRoom(currentRoom);
};

// 방 이름 수정
document.getElementById("roomInfo").onclick = async () => {
  const newName = prompt("방 이름 수정", getRoomName(currentRoom));
  if (!newName) return;

  setRoomName(currentRoom, newName);
  updateRoomInfo();
  renderRoomTabs();
};

// 가구 종류
const furnitureData = {
  sofa: Array.from({ length: 10 }, (_, i) => `assets/img/main/sofa/sofa${i+1}.png`),
  bed: ["assets/img/main/bed/bed1.png", "assets/img/main/bed/bed2.png"],
  light: [
    "assets/img/main/light/light1.png",
    "assets/img/main/light/light2.png",
    "assets/img/main/light/light3.png",
    "assets/img/main/light/light4.png",
    "assets/img/main/light/light5.png",
  ],
  window: [
    "assets/img/main/window/window1.png",
    "assets/img/main/window/window2.png",
    "assets/img/main/window/window3.png",
    "assets/img/main/window/window4.png",
    "assets/img/main/window/window5.png",
  ],
  desk: [
        "assets/img/main/desk/desk1.png",
        "assets/img/main/desk/desk2.png",
        "assets/img/main/desk/desk3.png",
    ],
    drawer: [
        "assets/img/main/drawer/drawer1.png",
        "assets/img/main/drawer/drawer2.png",
        "assets/img/main/drawer/drawer3.png",
        "assets/img/main/drawer/drawer4.png",
        "assets/img/main/drawer/drawer5.png",
        "assets/img/main/drawer/drawer6.png",
        "assets/img/main/drawer/drawer7.png",
        "assets/img/main/drawer/drawer8.png",
        "assets/img/main/drawer/drawer9.png",
    ],
    char: [
        "assets/img/main/char/char1.png",
        "assets/img/main/char/char2.png",
        "assets/img/main/char/char3.png",
    ],
    animal: [
        "assets/img/main/animal/cat1.png",
        "assets/img/main/animal/cat2.png",
        "assets/img/main/animal/animal_doll1.png",
        "assets/img/main/animal/cats_doll1.png",
    ],
    items: [
        "assets/img/main/items/bag1.png",
        "assets/img/main/items/book1.png",
        "assets/img/main/items/book2.png",
        "assets/img/main/items/book3.png",
        "assets/img/main/items/candle1.png",
        "assets/img/main/items/camer1.png",
        "assets/img/main/items/clock1.png",
        "assets/img/main/items/cosmetics1.png",
        "assets/img/main/items/cup1.png",
        "assets/img/main/items/cup2.png",
        "assets/img/main/items/flowerpot1.png",
        "assets/img/main/items/flowerpot2.png",
        "assets/img/main/items/frame1.png",
        "assets/img/main/items/frame2.png",
        "assets/img/main/items/frame3.png",
        "assets/img/main/items/paper1.png",
        "assets/img/main/items/shelf1.png",
        "assets/img/main/items/tv1.png",
    ],
    custom: []
};

// 가구 목록 표시
// --------------------------------------
function createFurnitureThumb(src) {
  const box = document.createElement("div");
  box.className = "furniture-item";
  const img = document.createElement("img");
  img.src = src;
  box.appendChild(img);
  box.onclick = () => addFurnitureToRoom(src);
  furnitureListEl.appendChild(box);
}

function loadFurnitureList(type) {
  furnitureListEl.innerHTML = "";
  if (type === "custom") {
    const custom = JSON.parse(localStorage.getItem("customFurniture") || "[]");
    custom.forEach(createFurnitureThumb);
  } else {
    furnitureData[type].forEach(createFurnitureThumb);
  }
}

document.querySelectorAll(".paw-tab").forEach(btn => {
  btn.onclick = () => {
    document.querySelector(".paw-tab.active")?.classList.remove("active");
    btn.classList.add("active");
    loadFurnitureList(btn.dataset.type);
  };
});

// 직접 그리기 페이지로 이동
document.getElementById("drawBtn")?.addEventListener("click", () => {
  location.href = "draw.html";
});

// 그린 가구 배치
const pending = JSON.parse(localStorage.getItem("pendingCustomFurniture"));
if (pending) {
  currentRoom = pending.room;
  updateRoomInfo();
  loadRoom(currentRoom);
  addFurnitureToRoom(pending.src);
  localStorage.removeItem("pendingCustomFurniture");
}
//관리자
window.addEventListener("load", () => {
  renderUserInfo();
  updateRoomInfo();
  renderRoomTabs();
  loadRoom(currentRoom);

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const adminId = localStorage.getItem("adminUserId");
  const adminPanel = document.getElementById("adminPanel");

  if (currentUser && currentUser.id === adminId) {
    adminPanel.style.display = "block";
  }
});
