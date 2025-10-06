document.addEventListener('DOMContentLoaded', () => {
    // --- Global variables and utility functions ---
    const API_BASE_URL = 'https://quan-ly-diem-so-backend.onrender.com'; // URL của backend server
    let currentUserToken = localStorage.getItem('token');
    let currentUsername = localStorage.getItem('username');

    const currentPageId = document.body.id;

    // Hàm để tính điểm trung bình (giữ nguyên)
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
    if (currentPageId === 'login-page') {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('login-username').value;
                const password = document.getElementById('login-password').value;

                try {
                    const response = await fetch(`${API_BASE_URL}/login`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username, password })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        localStorage.setItem('token', data.token);
                        localStorage.setItem('username', data.username);
                        currentUserToken = data.token;
                        currentUsername = data.username;
                        alert('Đăng nhập thành công!');
                        window.location.href = 'index.html';
                    } else {
                        alert(data.message || 'Đăng nhập thất bại.');
                    }
                } catch (error) {
                    console.error('Lỗi đăng nhập:', error);
                    alert('Không thể kết nối đến máy chủ hoặc có lỗi xảy ra.');
                }
            });
        }
    }

    if (currentPageId === 'register-page') {
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('register-username').value;
                const password = document.getElementById('register-password').value;

                try {
                    const response = await fetch(`${API_BASE_URL}/register`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username, password })
                    });

                    const data = await response.json();

                    if (response.ok) {
                        alert(data.message);
                        window.location.href = 'login.html';
                    } else {
                        alert(data.message || 'Đăng ký thất bại.');
                    }
                } catch (error) {
                    console.error('Lỗi đăng ký:', error);
                    alert('Không thể kết nối đến máy chủ hoặc có lỗi xảy ra.');
                }
            });
        }
    }

    // --- Main application (index.html) ---
    if (currentPageId !== 'login-page' && currentPageId !== 'register-page') {
        if (!currentUserToken) {
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

        currentUsernameSpan.textContent = currentUsername;

        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            currentUserToken = null;
            currentUsername = null;
            window.location.href = 'login.html';
        });

        let students = []; // Dữ liệu sinh viên sẽ được tải từ server

        // Hàm chung để gửi request đã xác thực
        async function authenticatedFetch(url, options = {}) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${currentUserToken}`
            };
            const response = await fetch(url, options);
            if (response.status === 401 || response.status === 403) {
                // Token hết hạn hoặc không hợp lệ, yêu cầu đăng nhập lại
                alert('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                window.location.href = 'login.html';
                throw new Error('Unauthorized');
            }
            return response;
        }


        async function fetchStudents() {
            try {
                const response = await authenticatedFetch(`${API_BASE_URL}/students`);
                if (response.ok) {
                    students = await response.json();
                    renderStudents();
                } else {
                    alert('Không thể tải dữ liệu sinh viên.');
                }
            } catch (error) {
                console.error('Lỗi khi lấy danh sách sinh viên:', error);
                // Xử lý lỗi (ví dụ: hiển thị thông báo)
            }
        }

        function renderStudents() {
            gradeTableBody.innerHTML = '';
            students.forEach((student, index) => {
                const row = gradeTableBody.insertRow();
                row.dataset.id = student.id;

                row.insertCell().textContent = index + 1; // STT
                row.insertCell().textContent = student.name; // Tên sinh viên

                ['diemTX1', 'diemTX2', 'diemTX3', 'diemTX4', 'diemGK', 'diemCK'].forEach(scoreKey => {
                    const cell = row.insertCell();
                    const input = document.createElement('input');
                    input.type = 'number';
                    input.min = '0';
                    input.max = '10';
                    input.step = '0.1';
                    input.value = student.scores[scoreKey] !== undefined ? student.scores[scoreKey] : '';
                    input.dataset.scoreKey = scoreKey;
                    input.addEventListener('change', async (e) => { // Dùng 'change' thay vì 'input' để gửi lên server khi focus out
                        let value = parseFloat(e.target.value);
                        if (isNaN(value) || value < 0 || value > 10) {
                            e.target.value = ''; // Clear invalid input
                            student.scores[scoreKey] = undefined;
                        } else {
                            student.scores[scoreKey] = value;
                        }

                        // Gửi yêu cầu cập nhật lên server
                        try {
                            const response = await authenticatedFetch(`${API_BASE_URL}/students/${student.id}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ scores: { [scoreKey]: student.scores[scoreKey] } })
                            });

                            if (!response.ok) {
                                alert('Cập nhật điểm thất bại.');
                                // Có thể fetch lại dữ liệu gốc nếu cập nhật lỗi
                                fetchStudents();
                            } else {
                                const updatedStudent = await response.json();
                                // Cập nhật student trong mảng students của frontend
                                Object.assign(student, updatedStudent);
                            }
                        } catch (error) {
                            console.error('Lỗi khi cập nhật điểm:', error);
                            alert('Không thể kết nối đến máy chủ để cập nhật điểm.');
                            // Có thể fetch lại dữ liệu gốc nếu có lỗi mạng
                            fetchStudents();
                        }
                        updateAverageScore(row, student); // Cập nhật điểm TB trên giao diện ngay lập tức
                    });
                    cell.appendChild(input);
                });

                const diemTBCell = row.insertCell();
                diemTBCell.classList.add('diem-tb-cell');
                updateAverageScore(row, student);

                const actionsCell = row.insertCell();
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Xóa';
                deleteBtn.classList.add('action-btn', 'delete');
                deleteBtn.addEventListener('click', async () => {
                    if (confirm(`Bạn có chắc chắn muốn xóa sinh viên "${student.name}"?`)) {
                        try {
                            const response = await authenticatedFetch(`${API_BASE_URL}/students/${student.id}`, {
                                method: 'DELETE'
                            });

                            if (response.ok) {
                                alert('Xóa sinh viên thành công!');
                                fetchStudents(); // Tải lại danh sách sinh viên sau khi xóa
                            } else {
                                alert('Xóa sinh viên thất bại.');
                            }
                        } catch (error) {
                            console.error('Lỗi khi xóa sinh viên:', error);
                            alert('Không thể kết nối đến máy chủ để xóa sinh viên.');
                        }
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

        addStudentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentName = studentNameInput.value.trim();
            if (studentName) {
                try {
                    const response = await authenticatedFetch(`${API_BASE_URL}/students`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ name: studentName })
                    });

                    if (response.ok) {
                        alert('Thêm sinh viên thành công!');
                        addStudentModal.style.display = 'none';
                        addStudentForm.reset();
                        fetchStudents(); // Tải lại danh sách sinh viên sau khi thêm
                    } else {
                        alert('Thêm sinh viên thất bại.');
                    }
                } catch (error) {
                    console.error('Lỗi khi thêm sinh viên:', error);
                    alert('Không thể kết nối đến máy chủ để thêm sinh viên.');
                }
            } else {
                alert('Tên sinh viên không được để trống.');
            }
        });

        fetchStudents(); // Tải dữ liệu sinh viên khi trang được load
    }
});