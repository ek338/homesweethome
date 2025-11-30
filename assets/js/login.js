
function getUserList() {
    return JSON.parse(localStorage.getItem("userList") || "[]");
}
function isAdmin(userId) {
    return localStorage.getItem("adminUserId") === userId;
}

function login() {
    const id = document.getElementById("loginId").value;
    const pw = document.getElementById("loginPw").value;

    if (!id || !pw) {
        alert("아이디와 비밀번호를 입력해주세요!");
        return;
    }

    const users = getUserList();
    const user = users.find(u => u.id === id);

    if (!user) {
        alert("아이디가 존재하지 않습니다!");
        return;
    }

    if (user.password !== pw) {
        alert("비밀번호가 틀렸습니다. 다시 입력해주세요!");
        return;
    }

    user.recentLogin = new Date().toISOString();
    localStorage.setItem("userList", JSON.stringify(users));

    localStorage.setItem("currentUser", JSON.stringify(user));

    localStorage.setItem("playerData", JSON.stringify({
        name: user.name,
        emoji: "🐱",
        level: 1,
        coins: 0,
        friends: [],
        photo: null,
    }));

    alert("로그인 성공!");

    if (isAdmin(user.id)) {
        window.location.href = "admin.html";
    } 
    else {
        window.location.href = "home.html";
    }
}


