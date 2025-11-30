function getUserList() {
    return JSON.parse(localStorage.getItem("userList") || "[]");
}

function saveUserList(list) {
    localStorage.setItem("userList", JSON.stringify(list));
}
let editIndex = null;

function loadUsers(filter = "") {
    const users = getUserList();
    const tbody = document.querySelector("#userTable tbody");
    tbody.innerHTML = "";

    users
        .filter(u =>
            u.id.includes(filter) ||
            u.name.includes(filter) ||
            u.email.includes(filter)
        )
        .forEach((user, index) => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.birth}</td>
                <td>${user.joinDate?.slice(0, 10) || "-"}</td>
                <td>${user.recentLogin ? user.recentLogin.slice(0, 16).replace("T"," ") : "-"}</td>
                <td>${user.friends?.length || 0}</td>

                <td><button onclick="openEdit(${index})">Edit</button></td>
                <td><button onclick="deleteUser(${index})">Delete</button></td>
            `;

            tbody.appendChild(row);
        });
}

function searchUser() {
    const q = document.getElementById("searchInput").value;
    loadUsers(q);
}

function deleteUser(index) {
    const users = getUserList();
    if (!confirm(`${users[index].id}을 삭제할까요?`)) return;

    users.splice(index, 1);
    saveUserList(users);
    loadUsers();
}


function openEdit(index) {
    const users = getUserList();
    const user = users[index];

    editIndex = index;

    document.getElementById("editName").value = user.name;
    document.getElementById("editPw").value = user.password;
    document.getElementById("editEmail").value = user.email;
    document.getElementById("editBirth").value = user.birth;

    document.getElementById("editModal").style.display = "block";
}

function saveEdit() {
    const users = getUserList();
    const user = users[editIndex];

    user.name = document.getElementById("editName").value;
    user.password = document.getElementById("editPw").value;
    user.email = document.getElementById("editEmail").value;
    user.birth = document.getElementById("editBirth").value;

    saveUserList(users);

    closeModal();
    loadUsers();
}

function closeModal() {
    document.getElementById("editModal").style.display = "none";
}

loadUsers();