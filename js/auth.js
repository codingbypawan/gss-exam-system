// Authentication Logic
let currentUser = null;

async function handleLogin(e) {
    e.preventDefault();
    const mobileNo = document.getElementById('mobileNo').value.trim();
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    const errorText = document.getElementById('errorText');

    // Clear previous errors
    errorMsg.classList.add('hide');

    try {
        // Validate user from Firestore
        const userRef = db.collection('users').doc(mobileNo);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new Error('User not found. Please check your mobile number.');
        }

        const userData = userDoc.data();
        
        // Verify password (simple comparison - in production use hashing)
        if (userData.password !== password) {
            throw new Error('Incorrect password.');
        }

        // Store in localStorage
        currentUser = {
            mobileNo: mobileNo,
            name: userData.name,
            role: userData.role
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        localStorage.setItem('lastLogin', new Date().toISOString());

        // Redirect based on role
        if (userData.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }

    } catch (error) {
        console.error('Login error:', error);
        errorText.textContent = error.message || 'Login failed. Please try again.';
        errorMsg.classList.remove('hide');
    }
}

// Check if already logged in
window.addEventListener('load', () => {
    const user = localStorage.getItem('currentUser');
    if (user && window.location.pathname.includes('index.html')) {
        const userData = JSON.parse(user);
        if (userData.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    }
});

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('lastLogin');
    currentUser = null;
    window.location.href = 'index.html';
}

function getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

function requireLogin() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}
