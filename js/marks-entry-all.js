// Marks Entry All - Shows all students on one page
let selectedExam = '';
let selectedClass = '';
let selectedSubjectCode = '';
let selectedSubjectName = '';
let allStudents = [];
let existingMarksMap = {}; // adm_no -> marks data

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireLogin()) return;

    selectedExam = sessionStorage.getItem('selectedExam');
    selectedClass = sessionStorage.getItem('selectedClass');
    selectedSubjectCode = sessionStorage.getItem('selectedSubjectCode');
    selectedSubjectName = sessionStorage.getItem('selectedSubjectName');

    if (!selectedExam || !selectedClass || !selectedSubjectCode) {
        alert('Invalid selection. Redirecting to dashboard.');
        window.location.href = 'dashboard.html';
        return;
    }

    document.getElementById('examTitle').textContent = getExamLabel(selectedExam);
    document.getElementById('classTitle').textContent = selectedClass;
    document.getElementById('subjectTitle').textContent = selectedSubjectName;

    const maxMarks = getMaxMarks();
    document.getElementById('maxMarksInfo').textContent = 'Max: ' + maxMarks;

    try {
        await loadData();
        renderAllStudents();
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Failed to load data. Please try again.');
    }
});

// Load students and existing marks
async function loadData() {
    // Load students
    const studentsSnapshot = await db.collection('students').get();
    const allStudentsData = [];
    studentsSnapshot.forEach(doc => allStudentsData.push(doc.data()));

    allStudents = allStudentsData.filter(s => s.class2025 === selectedClass);
    allStudents.sort((a, b) => parseInt(a.roll2025) - parseInt(b.roll2025));

    // Load existing marks for all students in this class/exam
    const marksSnapshot = await db.collection('marks')
        .doc(selectedExam)
        .collection(selectedClass)
        .get();

    existingMarksMap = {};
    marksSnapshot.forEach(doc => {
        existingMarksMap[doc.id] = doc.data();
    });
}

// Render all student rows
function renderAllStudents() {
    const container = document.getElementById('studentsContainer');
    const maxMarks = getMaxMarks();

    document.getElementById('totalStudents').textContent = allStudents.length;

    if (allStudents.length === 0) {
        container.innerHTML = '<p class="text-center text-muted py-4">No students found for this class.</p>';
        return;
    }

    let html = '';
    allStudents.forEach((student, index) => {
        const existingMarks = existingMarksMap[student.adm_no] || {};
        const existingMark = existingMarks[selectedSubjectCode];
        const markValue = (existingMark !== undefined && existingMark !== null) ? existingMark : '';

        html += `
            <div class="row student-row align-items-center py-2 ${index % 2 === 0 ? 'bg-light' : ''}">
                <div class="col-3 col-md-1 text-center">
                    <span class="roll-no">${student.roll2025}</span>
                </div>
                <div class="col-9 col-md-5">
                    <span class="student-name">${student.name}</span>
                </div>
                <div class="col-7 col-md-3 mt-2 mt-md-0 text-center">
                    <input type="number" class="form-control marks-input mx-auto"
                           id="marks_${student.adm_no}"
                           data-adm="${student.adm_no}"
                           data-name="${student.name}"
                           data-roll="${student.roll2025}"
                           min="-1" max="${maxMarks}"
                           placeholder="0-${maxMarks}"
                           value="${markValue}">
                </div>
                <div class="col-5 col-md-3 mt-2 mt-md-0 text-center">
                    <button type="button" class="btn btn-outline-warning absent-btn"
                            onclick="markAbsent('${student.adm_no}')">
                        ❌ Absent
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;

    // Add validation to all inputs
    container.querySelectorAll('.marks-input').forEach(input => {
        input.addEventListener('change', validateMark);
    });
}

function validateMark(e) {
    const input = e.target;
    const maxMarks = getMaxMarks();
    const value = parseInt(input.value);

    if (input.value === '' || input.value === null) return;

    if (value === -1) {
        input.value = -1;
    } else if (isNaN(value)) {
        input.value = '';
    } else if (value < 0 || value > maxMarks) {
        alert(`Please enter marks between 0 and ${maxMarks}, or -1 for absent`);
        input.value = '';
        input.focus();
    }
}

function markAbsent(admNo) {
    const input = document.getElementById('marks_' + admNo);
    if (input) {
        input.value = -1;
    }
}

function getMaxMarks() {
    return selectedClass === 'IX A' ? 100 : 50;
}

// Save all marks at once
document.getElementById('marksForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const saveBtn = document.getElementById('saveBtn');
    const saveStatus = document.getElementById('saveStatus');
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Saving...';
    saveStatus.style.display = 'block';
    saveStatus.innerHTML = '<span class="text-info">Saving marks for all students...</span>';

    const inputs = document.querySelectorAll('.marks-input');
    const batch = db.batch();
    let count = 0;

    inputs.forEach(input => {
        const admNo = input.dataset.adm;
        const name = input.dataset.name;
        const roll = input.dataset.roll;
        const value = input.value;

        if (value === '' || value === null) return; // Skip empty

        const marksData = {
            adm_no: admNo,
            name: name,
            roll: roll,
            [selectedSubjectCode]: parseInt(value),
            lastUpdated: new Date().toISOString(),
            lastUpdatedBy: getCurrentUser().mobileNo
        };

        const docRef = db.collection('marks')
            .doc(selectedExam)
            .collection(selectedClass)
            .doc(admNo);

        batch.set(docRef, marksData, { merge: true });
        count++;
    });

    if (count === 0) {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save All Marks';
        saveStatus.innerHTML = '<span class="text-warning">No marks to save. Please enter marks first.</span>';
        return;
    }

    try {
        await batch.commit();
        saveStatus.innerHTML = `<span class="text-success fw-bold">✅ Saved marks for ${count} students successfully!</span>`;
        saveBtn.textContent = '✅ Saved!';
        setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.textContent = '💾 Save All Marks';
        }, 2000);
    } catch (error) {
        console.error('Error saving marks:', error);
        saveStatus.innerHTML = '<span class="text-danger">❌ Failed to save. Please try again.</span>';
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save All Marks';
    }
});
