
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

const nameInput = document.getElementById("editName");
const emojiInput = document.getElementById("editEmoji");
const imgInput = document.getElementById("profileImgInput");
const preview = document.getElementById("profilePreview");
const saveBtn = document.getElementById("saveProfileBtn");
const backBtn = document.getElementById("backBtn");

const player = getPlayerData();
nameInput.value = player.name;
emojiInput.value = player.emoji ?? "🐱";

if (player.photo) {
    preview.src = player.photo;
}

imgInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        preview.src = reader.result; 
    };
    reader.readAsDataURL(file);
});

saveBtn.addEventListener("click", () => {
    const updated = getPlayerData();

    updated.name = nameInput.value || updated.name; 
    updated.emoji = emojiInput.value || updated.emoji;

    if (preview.src) {
        updated.photo = preview.src;
    }

    savePlayerData(updated);

    alert("프로필이 변경되었습니다!");

    window.location.href = "home.html";
});

backBtn.addEventListener("click", () => {
    window.location.href = "home.html";
});
