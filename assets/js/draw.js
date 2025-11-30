
//  기본 캔버스 설정
const canvas = document.getElementById("drawCanvas");
const ctx = canvas.getContext("2d");
const saveBtn = document.getElementById("saveBtn");
const backBtn = document.querySelector(".back-btn");

function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth * 0.92;
  canvas.height = canvas.parentElement.clientHeight * 0.92;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// 드로잉 
let drawing = false;
let currentColor = "#000";
let tool = "pen";

let history = [];
let redoStack = [];

function startDraw(e) {
  drawing = true;
  ctx.beginPath();
  ctx.moveTo(e.offsetX, e.offsetY);
}

function draw(e) {
  if (!drawing) return;

  ctx.lineWidth = tool === "eraser" ? 20 : 4;
  ctx.lineCap = "round";
  ctx.strokeStyle = tool === "eraser" ? "#fff" : currentColor;

  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();
}

function stopDraw() {
  if (!drawing) return;

  drawing = false;
  ctx.closePath();

  history.push(canvas.toDataURL());
  redoStack = [];
}

canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDraw);
canvas.addEventListener("mouseleave", stopDraw);

// 색상 및 도구 선택
document.querySelectorAll(".color").forEach(el =>
  el.addEventListener("click", () => {
    currentColor = el.dataset.color;
    tool = "pen";
  })
);

document.querySelectorAll(".tool-btn").forEach(btn =>
  btn.addEventListener("click", () => {
    const t = btn.dataset.tool;
    if (t) tool = t;
  })
);

document.getElementById("undoBtn").addEventListener("click", () => {
  if (history.length < 1) return;
  redoStack.push(history.pop());

  const last = history[history.length - 1];
  let img = new Image();

  if (!last) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  img.src = last;
  img.onload = () => ctx.drawImage(img, 0, 0);
});

document.getElementById("redoBtn").addEventListener("click", () => {
  if (redoStack.length < 1) return;

  const restore = redoStack.pop();
  history.push(restore);

  let img = new Image();
  img.src = restore;
  img.onload = () => ctx.drawImage(img, 0, 0);
});

document.getElementById("clearBtn").addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  history.push(canvas.toDataURL());
});

// 저장 및 연동

saveBtn.addEventListener("click", () => {
  const dataURL = canvas.toDataURL("image/png"); 

  const totalRooms = Number(localStorage.getItem("totalRooms")) || 1;

  let roomList = "";
  for (let i = 1; i <= totalRooms; i++) {
    roomList += `${i} `;
  }

  const answer = prompt(
    `어느 방에 추가하시겠습니까?\n\n` +
      `방 번호를 입력하세요!(${roomList.trim()})\n\n` +
      `계속 그리고 싶다면 no 를 누르세요!`
  );

  if (!answer || answer.toLowerCase() === "no") {
    alert("취소되었습니다.");
    return;
  }

  const roomNumber = Number(answer);
  if (!roomNumber || roomNumber < 1 || roomNumber > totalRooms) {
    alert("방 번호가 올바르지 않습니다! 다시 입력해주세요");
    return;
  }

  const customArr = JSON.parse(localStorage.getItem("customFurniture") || "[]");
  customArr.push(dataURL);
  localStorage.setItem("customFurniture", JSON.stringify(customArr));

  const payload = {
    room: roomNumber,
    src: dataURL,
  };
  localStorage.setItem("pendingCustomFurniture", JSON.stringify(payload));

  alert(`${roomNumber}번 방에 그림이 추가됩니다!`);
  window.location.href = "home.html";
});

// 돌아가기

backBtn.addEventListener("click", () => {
  if (confirm("홈으로 돌아가시겠습니까?\n(현재 그림은 저장되지 않을 수 있습니다!)")){
    window.location.href = "home.html";
  }
});

