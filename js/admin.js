// Check if user is admin
document.addEventListener('DOMContentLoaded', function() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    document.getElementById('currentUser').textContent = user.mobile;
    checkDatabaseConnection();
});

function checkDatabaseConnection() {
    try {
        if (firebase.auth && firebase.firestore) {
            document.getElementById('dbStatus').textContent = 'Connected';
            document.getElementById('dbStatus').parentElement.style.color = 'green';
        } else {
            document.getElementById('dbStatus').textContent = 'Not configured - Please update config.js';
            document.getElementById('dbStatus').parentElement.style.color = 'red';
        }
    } catch (error) {
        document.getElementById('dbStatus').textContent = 'Error: ' + error.message;
        document.getElementById('dbStatus').parentElement.style.color = 'red';
    }
}

function showStatus(elementId, message, isSuccess) {
    const element = document.getElementById(elementId);
    element.innerHTML = '<div class="status-message ' + (isSuccess ? 'status-success' : 'status-error') + '">' + message + '</div>';
}

// Create new user
async function createUser() {
    const mobile = document.getElementById('userMobile').value.trim();
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;

    if (!mobile || !password) {
        showStatus('userStatus', 'Please fill all fields', false);
        return;
    }

    if (mobile.length !== 10 || !/^\d+$/.test(mobile)) {
        showStatus('userStatus', 'Mobile number must be 10 digits', false);
        return;
    }

    try {
        const db = firebase.firestore();
        const usersRef = db.collection('users').doc(mobile);
        
        // Check if user exists
        const snapshot = await usersRef.get();
        if (snapshot.exists) {
            showStatus('userStatus', 'User already exists', false);
            return;
        }

        // Create user
        await usersRef.set({
            mobile: mobile,
            password: password, // WARNING: In production, hash this password
            role: role,
            createdAt: new Date().toISOString()
        });

        showStatus('userStatus', 'User created successfully: ' + mobile, true);
        document.getElementById('userMobile').value = '';
        document.getElementById('userPassword').value = '';
    } catch (error) {
        showStatus('userStatus', 'Error: ' + error.message, false);
    }
}

// Import Students
async function importStudents() {
    showStatus('importStatus', 'Loading students...', true);
    try {
        const response = await fetch('data/student.json');
        const students = await response.json();
        
        const db = firebase.firestore();
        const batch = db.batch();
        let count = 0;

        students.forEach(student => {
            const docRef = db.collection('students').doc(student.adm_no);
            batch.set(docRef, {
                adm_no: student.adm_no,
                name: student.name,
                class2025: student.class2025,
                roll2025: student.roll2025,
                fatherName: student.father_name,
                motherName: student.mother_name,
                contact1: student.contact1,
                contact2: student.contact2,
                address1: student.add1,
                address2: student.add2,
                createdAt: new Date().toISOString()
            });
            count++;
        });

        await batch.commit();
        showStatus('importStatus', 'Successfully imported ' + count + ' students', true);
    } catch (error) {
        showStatus('importStatus', 'Error importing students: ' + error.message, false);
    }
}

// Import Class Subjects
async function importClassSubjects() {
    showStatus('importStatus', 'Loading class subjects...', true);
    try {
        const response = await fetch('data/classsubject.json');
        const subjects = await response.json();
        
        const db = firebase.firestore();
        const batch = db.batch();
        let count = 0;

        subjects.forEach(subject => {
            const docId = subject.class + '_' + subject.subjectCode;
            const docRef = db.collection('classSubjects').doc(docId);
            batch.set(docRef, {
                id: subject.id,
                class: subject.class,
                subjectCode: subject.subjectCode,
                subjectName: subject.subjectName,
                teacher: subject.teacher,
                createdAt: new Date().toISOString()
            });
            count++;
        });

        await batch.commit();
        showStatus('importStatus', 'Successfully imported ' + count + ' class subjects', true);
    } catch (error) {
        showStatus('importStatus', 'Error importing class subjects: ' + error.message, false);
    }
}

// Import Exam Data
async function importExams() {
    showStatus('importStatus', 'Loading exam data and students...', true);
    try {
        const db = firebase.firestore();
        
        // First, fetch all students to map admission numbers to classes
        const studentsSnap = await db.collection('students').get();
        const studentMap = {};
        studentsSnap.forEach(doc => {
            const student = doc.data();
            studentMap[student.adm_no] = student.class2025;
        });

        // Now fetch exam data
        const response = await fetch('data/exam2025hy.json');
        const marks = await response.json();
        
        const batch = db.batch();
        let count = 0;
        let skipped = 0;

        marks.forEach(mark => {
            const adm_no = mark.adm_no;
            const studentClass = studentMap[adm_no];
            
            if (!studentClass) {
                skipped++;
                return; // Skip if student not found
            }

            const docRef = db.collection('marks')
                .doc('hy2025')
                .collection(studentClass)
                .doc(adm_no);
            
            batch.set(docRef, {
                adm_no: adm_no,
                sub1: parseInt(mark.sub1) || 0,
                sub2: parseInt(mark.sub2) || 0,
                sub3: parseInt(mark.sub3) || 0,
                sub4: parseInt(mark.sub4) || 0,
                sub5: parseInt(mark.sub5) || 0,
                sub6: parseInt(mark.sub6) || 0,
                sub7: parseInt(mark.sub7) || 0,
                sub8: parseInt(mark.sub8) || 0,
                lastUpdated: new Date().toISOString(),
                lastUpdatedBy: 'import'
            });
            count++;
        });

        await batch.commit();
        let message = 'Successfully imported ' + count + ' exam records';
        if (skipped > 0) {
            message += ' (Skipped ' + skipped + ' - student not found)';
        }
        showStatus('importStatus', message, true);
    } catch (error) {
        showStatus('importStatus', 'Error importing exam data: ' + error.message, false);
        console.error(error);
    }
}

// Logout (delegates to auth.js logout function)
function adminLogout() {
    logout(); // Uses the logout function from auth.js
}