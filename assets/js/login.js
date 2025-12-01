import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  update
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

async function isAdmin(uid) {
  const adminRef = ref(db, "admin/owner");
  const snap = await get(adminRef);
  return snap.exists() && snap.val() === uid;
}

async function login() {
  const id = document.getElementById("loginId").value;   // ← 이메일로 사용
  const pw = document.getElementById("loginPw").value;

  if (!id || !pw) {
    alert("이메일과 비밀번호를 입력해주세요!");
    return;
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, id, pw);
    const user = cred.user;

    // 최근 로그인 시간 DB에 기록
    const profileRef = ref(db, "users/" + user.uid + "/profile");
    await update(profileRef, {
      recentLogin: new Date().toISOString(),
    });

    // localStorage에는 uid 정도만 캐시
    localStorage.setItem("currentUserUid", user.uid);

    alert("로그인 성공!");

    if (await isAdmin(user.uid)) {
      window.location.href = "admin.html";
    } else {
      window.location.href = "home.html";
    }
  } catch (err) {
    console.error(err);
    alert("로그인 실패: " + err.message);
  }
}

// login.html에서 버튼에 onclick="login()" 쓸 수 있게 export
window.login = login;
