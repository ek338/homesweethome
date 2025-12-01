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

// 🔥 아이디로 이메일 찾기
async function getEmailFromUserId(userId) {
  const usersRef = ref(db, "users");
  const snap = await get(usersRef);

  if (!snap.exists()) return null;

  const users = snap.val();
  let email = null;

  Object.values(users).forEach(user => {
    if (user.profile && user.profile.userId === userId) {
      email = user.profile.email;
    }
  });

  return email;
}

// 🔥 관리자 확인
async function isAdmin(uid) {
  const adminRef = ref(db, "admin/owner");
  const snap = await get(adminRef);
  return snap.exists() && snap.val() === uid;
}

// 🔥 로그인
async function login() {
  const userIdInput = document.getElementById("loginId").value.trim();
  const pw = document.getElementById("loginPw").value;

  if (!userIdInput || !pw) {
    alert("아이디와 비밀번호를 입력해주세요!");
    return;
  }

  // 1️⃣ 아이디를 이메일로 변환
  const email = await getEmailFromUserId(userIdInput);

  if (!email) {
    alert("존재하지 않는 아이디입니다!");
    return;
  }

  try {
    // 2️⃣ Firebase Auth로 로그인
    const cred = await signInWithEmailAndPassword(auth, email, pw);
    const user = cred.user;

    // 3️⃣ DB에서 프로필 가져오기
    const profileRef = ref(db, `users/${user.uid}/profile`);
    const profileSnap = await get(profileRef);

    if (profileSnap.exists()) {
      const profile = profileSnap.val();

      // 최근 로그인 업데이트
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

    // 현재 로그인 사용자 uid 저장
    localStorage.setItem("currentUserUid", user.uid);

    alert("로그인 성공!");

    // 관리자라면 admin.html 이동
    if (await isAdmin(user.uid))
      window.location.href = "admin.html";
    else
      window.location.href = "home.html";

  } catch (err) {
    console.error(err);
    alert("로그인 실패: " + err.message);
  }
}

window.login = login;
