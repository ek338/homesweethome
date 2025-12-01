import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCDqh874UuYAT3Mmox1GLvHA4BfakrTfW0",
  authDomain: "homesweethome-21569.firebaseapp.com",
  projectId: "homesweethome-21569",
  storageBucket: "homesweethome-21569.appspot.com",
  messagingSenderId: "404205971778",
  appId: "1:404205971778:web:7af3eab2d87eaca53640db",
  databaseURL: "https://homesweethome-21569-default-rtdb.firebaseio.com/",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getDatabase(app);

// DOM 요소 가져오기
const inputName  = document.getElementById("inputName");
const inputId    = document.getElementById("inputId");       // 필요하면 아이디로 쓰고, 실제 로그인은 이메일 사용
const inputPw    = document.getElementById("inputPw");
const inputBirth = document.getElementById("inputBirth");
const inputEmail = document.getElementById("inputEmail");
const emailSelect= document.getElementById("emailSelect");
const signupForm = document.getElementById("signupForm");

function setAdminIfFirstUser(uid) {
  const adminRef = ref(db, "admin/owner");
  return get(adminRef).then((snap) => {
    if (!snap.exists()) {
      return set(adminRef, uid);
    }
  });
}

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name  = inputName.value.trim();
  const pw    = inputPw.value;
  const email = inputEmail.value.trim() + "@" + emailSelect.value.trim();

  if (!name || !pw || !email) {
    alert("이름, 이메일, 비밀번호를 모두 입력해주세요!");
    return;
  }

  try {
    // Firebase Auth에 계정 생성
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    const user = cred.user;

    // displayName 업데이트
    await updateProfile(user, { displayName: name });

    // Realtime DB에 프로필 저장
    const userRef = ref(db, "users/" + user.uid + "/profile");
    await set(userRef, {
      id: user.uid,             // 실제 로그인 ID는 uid
      userIdText: inputId.value || "", // 사용자가 입력한 "아이디" (표시용)
      name: name,
      email: email,
      birth: inputBirth.value,
      friends: [],
      joinDate: new Date().toISOString(),
      recentLogin: null,
      role: "user"
    });

    // 첫 가입자면 관리자 등록
    await setAdminIfFirstUser(user.uid);

    alert("회원가입에 성공했습니다!");
    window.location.href = "login.html";
  } catch (err) {
    console.error(err);
    alert("회원가입 중 오류가 발생했습니다: " + err.message);
  }
});

