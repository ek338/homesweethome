// assets/js/join.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 🔧 네 Firebase 설정
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
const auth = getAuth(app);
const db = getDatabase(app);

// 🔹 DOM 요소
const signupForm = document.getElementById("signupForm");
const inputId = document.getElementById("inputId");       // 닉네임 같은 '아이디'
const inputName = document.getElementById("inputName");   // 이름
const inputPw = document.getElementById("inputPw");
const inputPwCheck = document.getElementById("inputPwCheck");
const inputBirth = document.getElementById("inputBirth");
const inputEmail = document.getElementById("inputEmail");
const emailSelect = document.getElementById("emailSelect");

// (선택) 기존 체크/에러 요소 쓰고 싶으면 가져오기
const idCheck = document.getElementById("idCheck");
const idError = document.getElementById("idError");
const nameCheck = document.getElementById("nameCheck");
const nameError = document.getElementById("nameError");
const pwCheck = document.getElementById("pwCheck");
const pwError = document.getElementById("pwError");
const pwSameCheck = document.getElementById("pwSameCheck");
const pwSameError = document.getElementById("pwSameError");

// 📌 Firebase DB에서 "이미 사용 중인 아이디/이름인지" 간단 검사
async function isFieldDuplicate(field, value) {
  // users 밑에 전부 뒤져서 같은 value 있나 검사
  const usersRef = ref(db, "users");
  const snap = await get(usersRef);
  if (!snap.exists()) return false;

  const users = snap.val();
  return Object.values(users).some(
    (u) => u.profile && u.profile[field] === value
  );
}

// 📌 첫 가입자면 관리자로 등록
async function setAdminIfFirstUser(uid) {
  const adminRef = ref(db, "admin/owner");
  const snap = await get(adminRef);
  if (!snap.exists()) {
    await set(adminRef, uid);
    console.log("첫 가입자 → 관리자 등록:", uid);
  }
}

// 🔹 폼 제출 처리
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const fullEmail = inputEmail.value.trim() + "@" + emailSelect.value.trim();
  const name = inputName.value.trim();
  const userId = inputId.value.trim();
  const pw = inputPw.value;
  const pw2 = inputPwCheck.value;
  const birth = inputBirth.value;

  // 1) 기본 검증
  if (!userId || !name || !fullEmail || !pw || !pw2) {
    alert("모든 필드를 입력해 주세요!");
    return;
  }

  const pwRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
  if (!pwRegex.test(pw)) {
    alert("비밀번호는 대소문자, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.");
    return;
  }

  if (pw !== pw2) {
    alert("비밀번호 확인이 일치하지 않습니다!");
    return;
  }

  try {
    // 2) 아이디/이름 중복 체크 (원하면 사용)
    if (await isFieldDuplicate("userId", userId)) {
      if (idCheck) idCheck.style.display = "none";
      if (idError) idError.style.display = "block";
      alert("이미 사용 중인 아이디입니다.");
      return;
    } else {
      if (idCheck) idCheck.style.display = "block";
      if (idError) idError.style.display = "none";
    }

    if (await isFieldDuplicate("name", name)) {
      if (nameCheck) nameCheck.style.display = "none";
      if (nameError) nameError.style.display = "block";
      alert("이미 사용 중인 이름입니다.");
      return;
    } else {
      if (nameCheck) nameCheck.style.display = "block";
      if (nameError) nameError.style.display = "none";
    }

    // 3) Firebase Auth에 계정 생성 (로그인용 ID = 이메일)
    const cred = await createUserWithEmailAndPassword(auth, fullEmail, pw);
    const user = cred.user;

    // 4) Auth 쪽 프로필에 displayName 저장
    await updateProfile(user, { displayName: name });

    // 5) Realtime DB에 유저 프로필 저장
    const profileRef = ref(db, `users/${user.uid}/profile`);
    await set(profileRef, {
      uid: user.uid,
      userId: userId,     // 네가 join.html에서 쓰는 "아이디"
      name: name,
      email: fullEmail,
      birth: birth,
      friends: [],
      joinDate: new Date().toISOString(),
      recentLogin: null,
      role: "user",
    });

    // 6) 첫 가입자면 관리자 등록
    await setAdminIfFirstUser(user.uid);

    alert("회원가입에 성공했습니다! 이제 로그인 해 주세요.");
    window.location.href = "login.html";
  } catch (err) {
    console.error(err);
    alert("회원가입 중 오류: " + err.message);
  }
});

