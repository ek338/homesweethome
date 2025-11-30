document.getElementById("signupForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const fullEmail = inputEmail.value + "@" + emailSelect.value;

    const newUser = {
        id: inputId.value,
        name: inputName.value,
        password: inputPw.value,
        birth: inputBirth.value,
        email: fullEmail,
        friends: [],
        joinDate: new Date().toISOString(),
        recentLogin: null,
        role: "user"
    };

    const users = getUserList();
    users.push(newUser);
    setAdminIfFirstUser(newUser);

    localStorage.setItem("userList", JSON.stringify(users));

    alert("회원가입에 성공하였습니다!");
    window.location.href = "login.html";
});
