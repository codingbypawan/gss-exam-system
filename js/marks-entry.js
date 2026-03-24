// Marks Entry Logic
let selectedExam = '';
let selectedClass = '';
let selectedSubjectCode = '';
let selectedSubjectName = '';
let allStudents = [];
let currentStudentIndex = 0;
let classSubjectMappings = [];
let currentMarks = {};

// Initialize on page load
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

    try {
        await loadStudentsAndSubjects();
        displayCurrentStudent();
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Failed to load data. Please try again.');
    }
});

// Load students for the selected class
async function loadStudentsAndSubjects() {
    try {
        // Load all students
        const studentsSnapshot = await db.collection('students').get();
        const allStudentsData = [];
        
        studentsSnapshot.forEach(doc => {
            allStudentsData.push(doc.data());
        });

        // Filter students by selected class
        allStudents = allStudentsData.filter(s => s.class2025 === selectedClass);
        allStudents.sort((a, b) => parseInt(a.roll2025) - parseInt(b.roll2025));

        // Load class-subject mappings (for reference)
        const classSubjSnapshot = await db.collection('classSubjects').get();
        classSubjectMappings = [];
        
        classSubjSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.class === selectedClass) {
                classSubjectMappings.push(data);
            }
        });

        console.log(`Loaded ${allStudents.length} students`);
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// Display current student's form
async function displayCurrentStudent() {
    if (allStudents.length === 0) {
        alert('No students found for this class.');
        window.location.href = 'dashboard.html';
        return;
    }

    if (currentStudentIndex >= allStudents.length) {
        alert('All students processed!');
        window.location.href = 'dashboard.html';
        return;
    }

    const student = allStudents[currentStudentIndex];
    
    // Update progress
    document.getElementById('progressText').textContent = 
        `Student ${currentStudentIndex + 1} of ${allStudents.length}`;

    // Fill student info
    document.getElementById('studentName').textContent = student.name;
    document.getElementById('rollNo').textContent = student.roll2025;

    document.getElementById('prevBtn').disabled = currentStudentIndex === 0;

    // Load existing marks if any
    try {
        const marksRef = db.collection('marks')
            .doc(selectedExam)
            .collection(selectedClass)
            .doc(student.adm_no);
        
        const marksDoc = await marksRef.get();
        currentMarks = marksDoc.exists ? marksDoc.data() : {};
    } catch (error) {
        console.error('Error loading marks:', error);
        currentMarks = {};
    }

    // Create single subject input field
    createSubjectField();
}

// Create single subject marks input field
function createSubjectField() {
    const container = document.getElementById('subjectsContainer');
    container.innerHTML = '';

    // Find the subject object
    const subject = classSubjectMappings.find(s => s.subjectCode === selectedSubjectCode);
    if (!subject) {
        container.innerHTML = '<p class="text-danger">Subject not found</p>';
        return;
    }

    const subCode = subject.subjectCode;
    const subName = subject.subjectName;
    const existingMark = currentMarks[subCode] || '';

    const maxMarks = getMaxMarks();

    const fieldHTML = `
        <div class="row mb-3">
            <div class="col-12">
                <label class="form-label fw-bold">${subName}</label>
                <div class="d-grid gap-2 d-sm-flex gap-sm-2">
                    <div class="input-group input-group-lg flex-grow-1">
                        <input type="number" class="form-control marks-input" 
                               id="marksInput"
                               data-subject="${subCode}"
                               data-max="${maxMarks}"
                               min="-1" max="${maxMarks}" 
                               placeholder="Enter marks" 
                               value="${existingMark}"
                               autofocus>
                        <span class="input-group-text bg-light fw-bold">Max: ${maxMarks}</span>
                    </div>
                    <button type="button" class="btn btn-warning" id="absentBtn" 
                            onclick="markAbsent()">
                        ❌ Absent
                    </button>
                </div>
                <small class="text-muted d-block mt-2">Click "Absent" for -1, or enter marks directly</small>
            </div>
        </div>
    `;
    container.innerHTML = fieldHTML;

    // Focus on input
    const input = document.getElementById('marksInput');
    if (input) input.focus();

    // Add validation
    document.querySelectorAll('.marks-input').forEach(input => {
        input.addEventListener('change', validateMark);
    });
}

function validateMark(e) {
    const input = e.target;
    const maxMarks = parseInt(input.dataset.max);
    const value = parseInt(input.value);

    if (value === -1) {
        input.value = -1; // Absent
    } else if (isNaN(value) || value === '') {
        input.value = '';
    } else if (value < 0 || value > maxMarks) {
        alert(`Please enter marks between 0 and ${maxMarks}, or -1 for absent`);
        input.value = '';
    }
}

function markAbsent() {
    const input = document.getElementById('marksInput');
    if (input) {
        input.value = -1;
        input.focus();
    }
}

function getMaxMarks() {
    return selectedClass === 'IX A' ? 100 : 50;
}

function getExamLabel(examCode) {
    const labels = {
        'hy2025': 'Half Yearly 2025',
        'year2025': 'Yearly 2025'
    };
    return labels[examCode] || examCode;
}

// Handle form submission (Save marks)
document.getElementById('marksForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const student = allStudents[currentStudentIndex];
    const marksData = {
        adm_no: student.adm_no,
        name: student.name,
        roll: student.roll2025,
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: getCurrentUser().mobileNo
    };

    // Collect all mark inputs
    document.querySelectorAll('.marks-input').forEach(input => {
        const subject = input.dataset.subject;
        const value = input.value;
        marksData[subject] = value === '' ? null : parseInt(value);
    });

    try {
        // Save to Firestore
        await db.collection('marks')
            .doc(selectedExam)
            .collection(selectedClass)
            .doc(student.adm_no)
            .set(marksData, { merge: true });

        console.log(`Marks saved for ${student.name}`);
        
        // Move to next student
        currentStudentIndex++;
        if (currentStudentIndex < allStudents.length) {
            displayCurrentStudent();
            document.getElementById('marksForm').scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('All students processed! Going back to dashboard.');
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error('Error saving marks:', error);
        alert('Failed to save marks. Please try again.');
    }
});

function previousStudent() {
    if (currentStudentIndex > 0) {
        currentStudentIndex--;
        displayCurrentStudent();
        document.getElementById('marksForm').scrollIntoView({ behavior: 'smooth' });
    }
}
