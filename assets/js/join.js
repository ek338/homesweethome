// Firebase 설정 ---------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    updateProfile,
    fetchSignInMethodsForEmail,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    getDatabase,
    ref,
    set,
    get
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";


// Firebase 초기화
const firebaseConfig = {
    apiKey: "AIzaSyCDqh874UuYAT3Mmox1GLvHA4BfakrTfW0",
    authDomain: "homesweethome-21569.firebaseapp.com",
    databaseURL: "https://homesweethome-21569-default-rtdb.firebaseio.com/",
    projectId: "homesweethome-21569",
    storageBucket: "homesweethome-21569.appspot.com",
    messagingSenderId: "404205971778",
    appId: "1:404205971778:web:7af3eab2d87eaca53640db",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);


// DOM 요소 ------------------------------------
const inputName = document.getElementById("inputName");
const inputEmail = document.getElementById("inputEmail");
const emailSelect = document.getElementById("emailSelect");
const inputPw = document.getElementById("inputPw");
const inputPwCheck = document.getElementById("inputPwCheck");
const inputBirth = document.getElementById("inputBirth");


// ----- 에러/체크 메시지 자동 생성 -----
function createIndicator(id) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.style.display = "none";
        el.style.color = id.includes("Error") ? "red" : "green";
        el.style.fontSize = "13px";
        el.style.marginTop = "4px";

        // 해당 인풋 아래에 자동 추가
        if (id.startsWith("name")) inputName.parentNode.appendChild(el);
        else if (id.startsWith("email")) inputEmail.parentNode.parentNode.appendChild(el);
        else if (id.startsWith("pwSame")) inputPwCheck.parentNode.appendChild(el);
        else if (id.startsWith("pw")) inputPw.parentNode.appendChild(el);
    }
    return el;
}

const nameCheck = createIndicator("nameCheck");
nameCheck.innerText = "사용 가능한 이름입니다!";
const nameError = createIndicator("nameError");
nameError.innerText = "이미 사용 중인 이름입니다.";

const emailCheck = createIndicator("emailCheck");
emailCheck.innerText = "사용 가능한 이메일입니다!";
const emailError = createIndicator("emailError");
emailError.innerText = "이미 등록된 이메일입니다.";
const emailFormatError = createIndicator("emailFormatError");
emailFormatError.innerText = "이메일 형식이 올바르지 않습니다.";

const pwCheck = createIndicator("pwCheck");
pwCheck.innerText = "사용 가능한 비밀번호입니다!";
const pwError = createIndicator("pwError");
pwError.innerText = "대소문자+숫자+특수문자를 포함한 8글자 이상이여야합니다.";
const pwSameCheck = createIndicator("pwSameCheck");
pwSameCheck.innerText = "비밀번호가 일치합니다!";
const pwSameError = createIndicator("pwSameError");
pwSameError.innerText = "비밀번호가 일치하지 않습니다.";



// ------------------------------------------------------
// 🔥 1) 이메일 CSS 숨기기 초기화
// ------------------------------------------------------
function hideAll() {
    [
        nameCheck, nameError,
        emailCheck, emailError, emailFormatError,
        pwCheck, pwError, pwSameCheck, pwSameError
    ].forEach(el => el.style.display = "none");
}
hideAll();


// ------------------------------------------------------
// 🔥 2) 이름 중복 체크
// ------------------------------------------------------
inputName.addEventListener("keyup", async () => {
    const name = inputName.value.trim();
    if (!name) return;

    const usersRef = ref(db, "users");
    const snap = await get(usersRef);

    const taken = snap.exists() &&
        Object.values(snap.val()).some(u => u.profile?.name === name);

    if (taken) {
        nameCheck.style.display = "none";
        nameError.style.display = "block";
    } else {
        nameCheck.style.display = "block";
        nameError.style.display = "none";
    }
});


// ------------------------------------------------------
// 🔥 3) 이메일 중복 체크 (Auth)
// ------------------------------------------------------
async function checkEmail() {
    const emailId = inputEmail.value.trim();
    const domain = emailSelect.value.trim();

    hideAll();

    if (!emailId || !domain) return;

    const email = `${emailId}@${domain}`;

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        emailFormatError.style.display = "block";
        return;
    }

    try {
        const methods = await fetchSignInMethodsForEmail(auth, email);

        if (methods.length > 0) {
            emailError.style.display = "block";
        } else {
            emailCheck.style.display = "block";
        }
    } catch (err) {
        console.error(err);
    }
}

inputEmail.addEventListener("keyup", checkEmail);
emailSelect.addEventListener("change", checkEmail);


// ------------------------------------------------------
// 🔥 4) 비밀번호 규칙 검사
// ------------------------------------------------------
inputPw.addEventListener("keyup", () => {
    const pw = inputPw.value;

    const ok =
        /[A-Z]/.test(pw) &&
        /[a-z]/.test(pw) &&
        /\d/.test(pw) &&
        /[!@#$%^&*]/.test(pw) &&
        pw.length >= 8;

    if (ok) {
        pwCheck.style.display = "block";
        pwError.style.display = "none";
    } else {
        pwCheck.style.display = "none";
        pwError.style.display = "block";
    }
});


// ------------------------------------------------------
// 🔥 5) 비밀번호 확인 검사
// ------------------------------------------------------
inputPwCheck.addEventListener("keyup", () => {
    if (inputPw.value === inputPwCheck.value) {
        pwSameCheck.style.display = "block";
        pwSameError.style.display = "none";
    } else {
        pwSameCheck.style.display = "none";
        pwSameError.style.display = "block";
    }
});


// ------------------------------------------------------
// 🔥 6) 첫 가입자는 관리자 설정
// ------------------------------------------------------
async function setAdminIfFirstUser(uid) {
    const adminRef = ref(db, "admin/owner");
    const snap = await get(adminRef);

    if (!snap.exists()) {
        await set(adminRef, uid);
        console.log("첫 사용자 → 관리자 지정:", uid);
    }
}


// ------------------------------------------------------
// 🔥 7) 회원가입 실행
// ------------------------------------------------------
document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    // 에러가 하나라도 있으면 중단
    if (
        nameError.style.display === "block" ||
        emailError.style.display === "block" ||
        emailFormatError.style.display === "block" ||
        pwError.style.display === "block" ||
        pwSameError.style.display === "block"
    ) {
        alert("입력 정보를 다시 확인해주세요!");
        return;
    }

    const email = `${inputEmail.value.trim()}@${emailSelect.value.trim()}`;
    const password = inputPw.value.trim();
    const name = inputName.value.trim();
    const birth = inputBirth.value.trim();

    try {
        // 1) Auth 계정 생성
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const user = cred.user;

        // 2) displayName 설정
        await updateProfile(user, { displayName: name });

        // 3) DB 저장
        await set(ref(db, "users/" + user.uid + "/profile"), {
            id: user.uid,
            name,
            email,
            birth,
            friends: [],
            joinDate: new Date().toISOString(),
            recentLogin: null,
            role: "user"
        });

        // 4) 첫 사용자 관리자 지정
        await setAdminIfFirstUser(user.uid);

        alert("회원가입 성공!");
        window.location.href = "login.html";

    } catch (err) {
        console.error(err);
        alert("회원가입 오류 발생: " + err.message);
    }
});
