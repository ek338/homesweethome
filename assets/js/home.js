
// Firebase 기본 세팅
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getDatabase,
    ref,
    set,
    get,
    onValue,
    remove,
    off
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCDqh874UuYAT3Mmox1GLvHA4BfakrTfW0",
    authDomain: "homesweethome-21569.firebaseapp.com",
    projectId: "homesweethome-21569",
    storageBucket: "homesweethome-21569.appspot.com",
    messagingSenderId: "404205971778",
    appId: "1:404205971778:web:7af3eab2d87eaca53640db",
    databaseURL: "https://homesweethome-21569-default-rtdb.firebaseio.com/",
    measurementId: "G-1YHY2EVMDL",
};

if (!location.pathname.toLowerCase().includes("home")) {
  const cp = document.getElementById("controlPanel");
  if (cp) cp.style.display = "none";
}

// 초기 DOM 연동
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const toggleFurnitureBtn = document.getElementById("toggleFurnitureBtn");
const furniturePanel = document.getElementById("furniturePanel");
const roomAreaEl = document.getElementById("roomArea");
const furnitureLayer = document.getElementById("furnitureLayer");
const roomInfoEl = document.getElementById("roomInfo");
const roomTabsContainer = document.getElementById("roomTabs");

toggleFurnitureBtn?.addEventListener("click", () => {
  furniturePanel.classList.toggle("open");
});
// 유저 데이터
let userId = localStorage.getItem("userId");
if (!userId) {
    userId = "user_" + Date.now();
    localStorage.setItem("userId", userId);
}

const urlParams = new URLSearchParams(location.search);
const sharedOwnerId = urlParams.get("owner");
const sharedRoomParam = urlParams.get("room");

let roomOwnerId = sharedOwnerId || userId;

// 유저 정보 로딩
function getPlayerData() {
    return JSON.parse(localStorage.getItem("playerData")) || {
        name: "",
        emoji: "🐱",
        level: 1,
        coins: 0,
        friends: [],
        photo: null,
    };
}

function savePlayerData(data) {
    localStorage.setItem("playerData", JSON.stringify(data));
}

function renderUserInfo() {
    const data = getPlayerData();

    const userNameEl = document.getElementById("userName");
    const userProfileBtn = document.getElementById("userProfileBtn");
    const userCoinsEl = document.getElementById("userCoins");
    const userLevelEl = document.getElementById("userLevel");

    if (userNameEl) userNameEl.innerText = data.name || "유저";
    if (userCoinsEl) userCoinsEl.innerText = data.coins;
    if (userLevelEl) userLevelEl.innerText = data.level;

    if (userProfileBtn) {
        if (data.photo) {
            userProfileBtn.style.backgroundImage = `url(${data.photo})`;
            userProfileBtn.innerText = "";
        } else {
            userProfileBtn.style.backgroundImage = "none";
            userProfileBtn.innerText = data.emoji ?? "🐱";
        }

        userProfileBtn.onclick = () => {
            location.href = "profile.html";
        };
    }

    if (userNameEl) {
        userNameEl.onclick = () => (location.href = "profile.html");
    }
}

// 방 로직
let currentRoom = 1;

const pendingCustom = JSON.parse(localStorage.getItem("pendingCustomFurniture") || "null");
if (pendingCustom?.room) currentRoom = pendingCustom.room;

if (sharedRoomParam && !isNaN(parseInt(sharedRoomParam))) {
    currentRoom = parseInt(sharedRoomParam);
}

let maxRoomIndex = Number(localStorage.getItem("totalRooms")) || 1;
let currentRoomLayoutRef = null;

function getRoomName(n) {
    return localStorage.getItem(`roomName_${n}`) || `방 ${n}`;
}

async function setRoomName(n, name) {
    localStorage.setItem(`roomName_${n}`, name);
    await set(ref(db, `users/${roomOwnerId}/rooms/${n}/name`), name);
}

// UI: 방 이름 표시 갱신
function updateRoomInfo() {
    if (roomInfoEl) {
        roomInfoEl.textContent = `${currentRoom}번 방 - ${getRoomName(currentRoom)}`;
    }
}

// 방 탭 렌더링 
function renderRoomTabs() {
    if (!roomTabsContainer) return;

    roomTabsContainer.innerHTML = "";

    for (let i = 1; i <= maxRoomIndex; i++) {
        const btn = document.createElement("button");
        btn.className = `room-tab ${i === currentRoom ? "active" : ""}`;
        btn.textContent = `${i}번 방`;

        btn.addEventListener("click", async () => {
            if (i === currentRoom) return;

            await saveCurrentRoomLayout();
            const dir = i > currentRoom ? 1 : -1;

            currentRoom = i;
            updateRoomInfo();
            await loadRoom(currentRoom);
            renderRoomTabs();
            slideRoom(dir);
        });

        roomTabsContainer.appendChild(btn);
    }
}

// 가구 저장 / 로딩
function roomLayoutKey(n) {
    return `roomLayout_${roomOwnerId}_${n}`;
}

function collectLayoutFromDOM() {
    const layout = [];
    furnitureLayer.querySelectorAll(".room-furniture").forEach(el => {
        const img = el.querySelector("img");
        layout.push({
            src: img?.src || "",
            x: el.style.left,
            y: el.style.top,
            scale: el.dataset.scale,
            rotate: el.dataset.rotate,
            locked: el.dataset.locked,
        });
    });
    return layout;
}

async function saveCurrentRoomLayout() {
    const layout = collectLayoutFromDOM();
    localStorage.setItem(roomLayoutKey(currentRoom), JSON.stringify(layout));
    await set(ref(db, `users/${roomOwnerId}/rooms/${currentRoom}/layout`), layout);
}

function renderLayout(layout) {
    furnitureLayer.innerHTML = "";
    layout.forEach(d => addFurnitureToRoom(d.src, d, false));
}

async function loadRoomLayoutOnce(room) {
    const snap = await get(ref(db, `users/${roomOwnerId}/rooms/${room}/layout`));
    if (snap.exists()) {
        renderLayout(snap.val());
        return true;
    }
    return false;
}

function loadRoomLayoutFromLocal(room) {
    const saved = localStorage.getItem(roomLayoutKey(room));
    if (!saved) return false;
    renderLayout(JSON.parse(saved));
    return true;
}

function subscribeRoomRealtime(room) {
    if (currentRoomLayoutRef) off(currentRoomLayoutRef);

    const layoutRef = ref(db, `users/${roomOwnerId}/rooms/${room}/layout`);
    currentRoomLayoutRef = layoutRef;

    onValue(layoutRef, snap => {
        if (!snap.exists()) {
            furnitureLayer.innerHTML = "";
            return;
        }
        renderLayout(snap.val());
    });
}

async function loadRoom(room) {
    furnitureLayer.innerHTML = "";

    const ok = await loadRoomLayoutOnce(room);
    if (!ok) loadRoomLayoutFromLocal(room);

    subscribeRoomRealtime(room);
}

// 가구 추가/선택/이동/회전/크기
let selectedFurniture = null;
let furnitureZ = 1000;

function selectFurniture(el) {
    document.querySelectorAll(".room-furniture").forEach(f => f.classList.remove("selected"));
    selectedFurniture = el;
    el.classList.add("selected");
}

document.addEventListener("click", e => {
    if (!e.target.closest(".room-furniture") && !e.target.closest("#controlPanel")) {
        if (selectedFurniture) {
            selectedFurniture.classList.remove("selected");
            selectedFurniture = null;
        }
    }
});

function addFurnitureToRoom(src, options = {}, save = true) {
    const wrapper = document.createElement("div");
    wrapper.className = "room-furniture";

    wrapper.style.left = options.x ?? "50%";
    wrapper.style.top = options.y ?? "60%";
    wrapper.dataset.scale = options.scale ?? "1";
    wrapper.dataset.rotate = options.rotate ?? "0";
    wrapper.dataset.locked = options.locked ?? "false";
    wrapper.style.zIndex = furnitureZ++;

    const img = document.createElement("img");
    img.src = src;
    img.draggable = false;
    wrapper.appendChild(img);

    wrapper.onclick = e => {
        e.stopPropagation();
        selectFurniture(wrapper);
    };

    furnitureLayer.appendChild(wrapper);
    enableDrag(wrapper);
    applyTransform(wrapper);

    if (save) saveCurrentRoomLayout();
}

function applyTransform(el) {
    el.style.transform = `scale(${el.dataset.scale}) rotate(${el.dataset.rotate}deg)`;
}

function enableDrag(el) {
    let dragging = false;
    let startX, startY, baseLeft, baseTop;

    el.addEventListener("mousedown", e => {
        if (el.dataset.locked === "true") return;
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        baseLeft = el.offsetLeft;
        baseTop = el.offsetTop;
    });

    document.addEventListener("mousemove", e => {
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

// 컨트롤 패널 버튼
document.querySelectorAll("#controlPanel button").forEach(btn => {
    btn.addEventListener("click", () => {
        if (!selectedFurniture) return;
        const act = btn.dataset.act;
        handleControl(selectedFurniture, act);
    });
});

function handleControl(el, act) {
    let scale = parseFloat(el.dataset.scale);
    let rotate = parseFloat(el.dataset.rotate);

    if (el.dataset.locked === "true" && act !== "edit") return;

    switch (act) {
        case "confirm":
            el.dataset.locked = "true";
            el.classList.add("locked");
            return;
        case "edit":
            el.dataset.locked = "false";
            el.classList.remove("locked");
            return;
        case "bigger":
            scale += 0.1;
            break;
        case "smaller":
            scale = Math.max(0.2, scale - 0.1);
            break;
        case "rotL":
            rotate -= 10;
            break;
        case "rotR":
            rotate += 10;
            break;
        case "delete":
            el.remove();
            selectedFurniture = null;
            saveCurrentRoomLayout();
            return;
    }

    el.dataset.scale = scale;
    el.dataset.rotate = rotate;
    applyTransform(el);
    saveCurrentRoomLayout();
}

// 방 이동 
function slideRoom(dir) {
    roomAreaEl.style.transition = "transform 0.3s ease";
    roomAreaEl.style.transform = `translateX(${dir * 120}%)`;
    setTimeout(() => (roomAreaEl.style.transform = "translateX(0%)"), 300);
}
function placeCustomFurniture(roomNumber, src) {
  if (currentRoom !== roomNumber) {
    currentRoom = roomNumber;
    updateRoomInfo();
    loadRoom(currentRoom);
    renderRoomTabs();
  }

  addFurnitureToRoom(src);
}


// Firebase 방 개수 동기화
async function syncMaxRoomIndexFromFirebase() {
    const roomsRef = ref(db, `users/${roomOwnerId}/rooms`);
    const snap = await get(roomsRef);
    if (snap.exists()) {
        const nums = Object.keys(snap.val()).map(n => parseInt(n));
        maxRoomIndex = Math.max(...nums, maxRoomIndex);
        localStorage.setItem("totalRooms", maxRoomIndex);
    }
}

async function ensureDefaultRoom() {
    if (!localStorage.getItem("totalRooms")) {
        localStorage.setItem("totalRooms", 1);
    }
    if (!localStorage.getItem("roomName_1")) {
        localStorage.setItem("roomName_1", "방 1");
    }

    const room1Ref = ref(db, `users/${roomOwnerId}/rooms/1`);
    const snap = await get(room1Ref);

    if (!snap.exists()) {
        await set(room1Ref, { name: "방 1", layout: [] });
    }
}

// 초기 실행
window.addEventListener("load", async () => {
    renderUserInfo();

    await ensureDefaultRoom();
    await syncMaxRoomIndexFromFirebase();

    maxRoomIndex = Number(localStorage.getItem("totalRooms")) || 1;

    if (currentRoom > maxRoomIndex) currentRoom = 1;

    updateRoomInfo();
    renderRoomTabs();

    const activeTab = document.querySelector(".paw-tab.active");
    loadFurnitureList(activeTab?.dataset.type || "sofa");

    await loadRoom(currentRoom);
});

// 방 CRUD 버튼
document.getElementById("addRoomBtn").onclick = async () => {
    await saveCurrentRoomLayout();
    const newName = prompt("새로운 방 이름:", `방 ${maxRoomIndex + 1}`);
    if (!newName) return;

    maxRoomIndex++;
    localStorage.setItem("totalRooms", maxRoomIndex);

    await set(ref(db, `users/${roomOwnerId}/rooms/${maxRoomIndex}`), {
        name: newName,
        layout: []
    });

    localStorage.setItem(`roomName_${maxRoomIndex}`, newName);

    alert(`${newName} 생성됨!`);
    currentRoom = maxRoomIndex;

    updateRoomInfo();
    furnitureLayer.innerHTML = "";
    await loadRoom(currentRoom);
    renderRoomTabs();
    slideRoom(1);
};

document.getElementById("deleteRoomBtn").onclick = async () => {
    if (!confirm(`${currentRoom}번 방을 삭제할까요?`)) return;

    await remove(ref(db, `users/${roomOwnerId}/rooms/${currentRoom}`));
    localStorage.removeItem(roomLayoutKey(currentRoom));
    localStorage.removeItem(`roomName_${currentRoom}`);

    maxRoomIndex = Math.max(1, maxRoomIndex - 1);
    localStorage.setItem("totalRooms", maxRoomIndex);

    currentRoom = Math.min(currentRoom, maxRoomIndex);

    updateRoomInfo();
    await loadRoom(currentRoom);
    renderRoomTabs();
};

document.getElementById("renameRoomBtn").onclick = () => {
    roomInfoEl.click();
};

document.getElementById("roomShareBtn").onclick = () => {
    const url = `${location.origin}${location.pathname}?owner=${roomOwnerId}&room=${currentRoom}`;
    navigator.clipboard.writeText(url);
    alert("방 공유 링크가 복사되었습니다!");
};

document.getElementById("addFriendBtn").onclick = () => {
    alert("친구 기능은 준비중!");
};

// 가구 카테고리 로딩
const furnitureData = {
    sofa: [
        "../assets/img/main/sofa/sofa1.png",
        "../assets/img/main/sofa/sofa2.png",
        "../assets/img/main/sofa/sofa3.png",
        "../assets/img/main/sofa/sofa4.png",
        "../assets/img/main/sofa/sofa5.png",
        "../assets/img/main/sofa/sofa6.png",
        "../assets/img/main/sofa/sofa7.png",
        "../assets/img/main/sofa/sofa8.png",
        "../assets/img/main/sofa/sofa9.png",
        "../assets/img/main/sofa/sofa10.png",
    ],
    bed: ["../assets/img/main/bed/bed1.png", "../assets/img/main/bed/bed2.png"],
    light: [
        "../assets/img/main/light/light1.png",
        "../assets/img/main/light/light2.png",
        "../assets/img/main/light/light3.png",
        "../assets/img/main/light/light4.png",
        "../assets/img/main/light/light5.png",
    ],
    window: [
        "../assets/img/main/window/window1.png",
        "../assets/img/main/window/window2.png",
        "../assets/img/main/window/window3.png",
        "../assets/img/main/window/window4.png",
        "../assets/img/main/window/window5.png",
    ],
    desk: [
        "../assets/img/main/desk/desk1.png",
        "../assets/img/main/desk/desk2.png",
        "../assets/img/main/desk/desk3.png",
    ],
    drawer: [
        "../assets/img/main/drawer/drawer1.png",
        "../assets/img/main/drawer/drawer2.png",
        "../assets/img/main/drawer/drawer3.png",
        "../assets/img/main/drawer/drawer4.png",
        "../assets/img/main/drawer/drawer5.png",
        "../assets/img/main/drawer/drawer6.png",
        "../assets/img/main/drawer/drawer7.png",
        "../assets/img/main/drawer/drawer8.png",
        "../assets/img/main/drawer/drawer9.png",
    ],
    char: [
        "../assets/img/main/char/char1.png",
        "../assets/img/main/char/char2.png",
        "../assets/img/main/char/char3.png",
    ],
    animal: [
        "../assets/img/main/animal/cat1.png",
        "../assets/img/main/animal/cat2.png",
        "../assets/img/main/animal/animal_doll1.png",
        "../assets/img/main/animal/cats_doll1.png",
    ],
    items: [
        "../assets/img/main/items/bag1.png",
        "../assets/img/main/items/book1.png",
        "../assets/img/main/items/book2.png",
        "../assets/img/main/items/book3.png",
        "../assets/img/main/items/candle1.png",
        "../assets/img/main/items/camer1.png",
        "../assets/img/main/items/clock1.png",
        "../assets/img/main/items/cosmetics1.png",
        "../assets/img/main/items/cup1.png",
        "../assets/img/main/items/cup2.png",
        "../assets/img/main/items/flowerpot1.png",
        "../assets/img/main/items/flowerpot2.png",
        "../assets/img/main/items/frame1.png",
        "../assets/img/main/items/frame2.png",
        "../assets/img/main/items/frame3.png",
        "../assets/img/main/items/paper1.png",
        "../assets/img/main/items/shelf1.png",
        "../assets/img/main/items/tv1.png",
    ],
    custom: [],
};

const furnitureListEl = document.getElementById("furnitureList");

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
        custom.forEach(src => createFurnitureThumb(src));
    } else {
        furnitureData[type]?.forEach(src => createFurnitureThumb(src));
    }
}

document.querySelectorAll(".paw-tab").forEach(btn => {
    btn.onclick = () => {
        document.querySelector(".paw-tab.active")?.classList.remove("active");
        btn.classList.add("active");

        loadFurnitureList(btn.dataset.type);
    };
});

//그림그린거 연동
const drawBtn = document.getElementById("drawBtn");

if (drawBtn) {
  drawBtn.addEventListener("click", () => {
    window.location.href = "draw.html";
  });
}

const pending = JSON.parse(localStorage.getItem("pendingCustomFurniture"));
if (pending) {
  placeCustomFurniture(pending.room, pending.src);
  localStorage.removeItem("pendingCustomFurniture");
}

// 관리자 
window.addEventListener("load", () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const adminId = localStorage.getItem("adminUserId");

  console.log("currentUser:", currentUser);
  console.log("adminId:", adminId);

  const adminPanel = document.getElementById("adminPanel");

  if (currentUser && currentUser.id === adminId) {
    if (adminPanel) {
      adminPanel.style.display = "block";
      console.log("관리자 메뉴 표시됨!");
    } else {
      console.error("adminPanel 요소를 찾을 수 없습니다.");
    }
  } else {
    console.log("관리자 계정이 아님 → adminPanel 숨김");
  }
});
