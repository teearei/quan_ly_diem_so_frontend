document.addEventListener('DOMContentLoaded', () => {
    // --- Global variables and utility functions ---
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const users = JSON.parse(localStorage.getItem('users')) || {};

    // Determine current page
    const currentPageId = document.body.id; // Lấy ID của body hiện tại

    // Function to calculate average score (giữ nguyên)
    function calculateAverage(scores) {
        let totalScore = 0;
        let totalWeight = 0;

        const weights = {
            'diemTX1': 1,
            'diemTX2': 1,
            'diemTX3': 1,
            'diemTX4': 1,
            'diemGK': 2,
            'diemCK': 3
        };

        for (const key in scores) {
            const score = parseFloat(scores[key]);
            if (!isNaN(score)) {
                totalScore += score * weights[key];
                totalWeight += weights[key];
            }
        }

        return totalWeight > 0 ? (totalScore / totalWeight).toFixed(2) : 'N/A';
    }

    // --- Authentication (Login/Register) ---
    // Chỉ chạy code đăng nhập nếu đang ở trang login
    if (currentPageId === 'login-page') {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('login-username').value;
                const password = document.getElementById('login-password').value;

                if (users[username] && users[username].password === password) {
                    localStorage.setItem('currentUser', JSON.stringify({ username: username }));
                    alert('Đăng nhập thành công!');
                    window.location.href = 'index.html';
                } else {
                    alert('Tên đăng nhập hoặc mật khẩu không đúng!');
                }
            });
        }
    }

    // Chỉ chạy code đăng ký nếu đang ở trang register
    if (currentPageId === 'register-page') {
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = document.getElementById('register-username').value;
                const password = document.getElementById('register-password').value;

                if (users[username]) {
                    alert('Tên đăng nhập đã tồn tại!');
                } else {
                    users[username] = {
                        password: password,
                        students: []
                    };
                    localStorage.setItem('users', JSON.stringify(users));
                    alert('Đăng ký thành công! Vui lòng đăng nhập.');
                    window.location.href = 'login.html';
                }
            });
        }
    }

    // --- Main application (index.html) ---
    // Chỉ chạy code chính nếu đang ở trang index (hoặc không phải login/register)
    if (currentPageId !== 'login-page' && currentPageId !== 'register-page') {
        if (!currentUser) {
            window.location.href = 'login.html'; // Redirect if not logged in
            return;
        }

        const currentUsernameSpan = document.getElementById('current-username');
        const logoutBtn = document.getElementById('logout-btn');
        const gradeTableBody = document.querySelector('#grade-table tbody');
        const addStudentBtn = document.getElementById('add-student-btn');
        const addStudentModal = document.getElementById('add-student-modal');
        const closeBtn = document.querySelector('.modal .close-btn');
        const addStudentForm = document.getElementById('add-student-form');
        const studentNameInput = document.getElementById('student-name');

        currentUsernameSpan.textContent = currentUser.username;

        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        });

        let students = users[currentUser.username].students;

        function saveStudentData() {
            users[currentUser.username].students = students;
            localStorage.setItem('users', JSON.stringify(users));
        }

        function renderStudents() {
            gradeTableBody.innerHTML = '';
            students.forEach((student, index) => {
                const row = gradeTableBody.insertRow();
                row.dataset.id = student.id;

                row.insertCell().textContent = index + 1; // STT
                row.insertCell().textContent = student.name; // Tên sinh viên

                const scoreInputs = {};
                ['diemTX1', 'diemTX2', 'diemTX3', 'diemTX4', 'diemGK', 'diemCK'].forEach(scoreKey => {
                    const cell = row.insertCell();
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.min = '0';
                    input.max = '10';
                    input.step = '0.1';
                    input.value = student.scores[scoreKey] !== undefined ? student.scores[scoreKey] : '';
                    input.dataset.scoreKey = scoreKey;
                    input.addEventListener('input', (e) => {
                        let value = parseFloat(e.target.value);
                        if (isNaN(value) || value < 0 || value > 10) {
                            e.target.value = '';
                            student.scores[scoreKey] = undefined;
                        } else {
                            student.scores[scoreKey] = value;
                        }
                        saveStudentData();
                        updateAverageScore(row, student);
                    });
                    cell.appendChild(input);
                    scoreInputs[scoreKey] = input;
                });

                const diemTBCell = row.insertCell();
                diemTBCell.classList.add('diem-tb-cell');
                updateAverageScore(row, student);

                const actionsCell = row.insertCell();
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Xóa';
                deleteBtn.classList.add('action-btn', 'delete');
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`Bạn có chắc chắn muốn xóa sinh viên "${student.name}"?`)) {
                        students = students.filter(s => s.id !== student.id);
                        saveStudentData();
                        renderStudents();
                    }
                });
                actionsCell.appendChild(deleteBtn);
            });
        }

        function updateAverageScore(row, student) {
            const scores = {
                diemTX1: student.scores.diemTX1,
                diemTX2: student.scores.diemTX2,
                diemTX3: student.scores.diemTX3,
                diemTX4: student.scores.diemTX4,
                diemGK: student.scores.diemGK,
                diemCK: student.scores.diemCK,
            };
            const diemTB = calculateAverage(scores);
            row.querySelector('.diem-tb-cell').textContent = diemTB;
        }

        addStudentBtn.addEventListener('click', () => {
            addStudentModal.style.display = 'block';
        });

        closeBtn.addEventListener('click', () => {
            addStudentModal.style.display = 'none';
            addStudentForm.reset();
        });

        window.addEventListener('click', (event) => {
            if (event.target === addStudentModal) {
                addStudentModal.style.display = 'none';
                addStudentForm.reset();
            }
        });

        addStudentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const studentName = studentNameInput.value.trim();
            if (studentName) {
                const newStudent = {
                    id: Date.now(),
                    name: studentName,
                    scores: {
                        diemTX1: undefined,
                        diemTX2: undefined,
                        diemTX3: undefined,
                        diemTX4: undefined,
                        diemGK: undefined,
                        diemCK: undefined
                    }
                };
                students.push(newStudent);
                saveStudentData();
                renderStudents();
                addStudentModal.style.display = 'none';
                addStudentForm.reset();
            } else {
                alert('Tên sinh viên không được để trống.');
            }
        });

        renderStudents(); // Initial render
    }
});