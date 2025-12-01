// assets/js/login.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Firebase config
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


// 🔥 관리자 여부 확인
async function isAdmin(uid) {
  const adminRef = ref(db, "admin/owner");
  const snap = await get(adminRef);
  return snap.exists() && snap.val() === uid;
}


// 🔥 로그인 실행
async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const pw = document.getElementById("loginPw").value.trim();

  if (!email || !pw) {
    alert("이메일과 비밀번호를 입력해주세요!");
    return;
  }

  try {
    // 1️⃣ Firebase 이메일 로그인
    const cred = await signInWithEmailAndPassword(auth, email, pw);
    const user = cred.user;

    // 2️⃣ DB의 프로필 가져오기
    const profileRef = ref(db, `users/${user.uid}/profile`);
    const profileSnap = await get(profileRef);

    if (profileSnap.exists()) {
      const profile = profileSnap.val();

      // 최근 로그인 기록 업데이트
      await set(profileRef, {
        ...profile,
        recentLogin: new Date().toISOString(),
      });

      // 홈 화면에서 쓸 캐시 데이터 저장
      localStorage.setItem("playerData", JSON.stringify({
        name: profile.name,
        emoji: "🐱",
        photo: null,
        level: 1,
        coins: 0,
        friends: profile.friends || [],
      }));
    }

    // 현재 로그인 사용자 UID 저장
    localStorage.setItem("currentUserUid", user.uid);

    alert("로그인 성공!");

    // 3️⃣ 관리자면 admin.html, 아니면 home.html 이동
    if (await isAdmin(user.uid))
      window.location.href = "admin.html";
    else
      window.location.href = "home.html";

  } catch (err) {
    console.error(err);
    alert("로그인 실패: " + err.message);
  }
}

// HTML에서 사용 가능하도록
window.login = login;

