// View Marks Logic
let selectedExam = '';
let selectedClass = '';
let allMarks = [];
let filteredMarks = [];
let studentMap = {};
let subjectMap = {};
let isSortedByMarks = false;
let showRank = false;

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireLogin()) return;
    
    selectedExam = sessionStorage.getItem('selectedExam');
    selectedClass = sessionStorage.getItem('selectedClass');

    if (!selectedExam || !selectedClass) {
        alert('Invalid selection. Redirecting to dashboard.');
        window.location.href = 'dashboard.html';
        return;
    }

    document.getElementById('examTitle').textContent = getExamLabel(selectedExam);
    document.getElementById('classTitle').textContent = selectedClass;

    try {
        await loadStudents();
        await loadSubjects();
        await loadMarks();
        updateTableHeader();
        hideExtraSubjectColumns();
        displayMarks(allMarks);
        setupSearch();
    } catch (error) {
        console.error('Error loading marks:', error);
        alert('Failed to load marks. Please try again.');
    }
});

async function loadStudents() {
    try {
        const studentsSnap = await db.collection('students').get();
        studentMap = {};
        studentsSnap.forEach(doc => {
            const student = doc.data();
            studentMap[student.adm_no] = {
                name: student.name,
                roll: student.roll2025
            };
        });
        console.log(`Loaded ${Object.keys(studentMap).length} students`);
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

async function loadSubjects() {
    try {
        // Load all class subjects and filter by class
        const subjectsSnap = await db.collection('classSubjects').get();
        
        subjectMap = {};
        const subjects = [];
        subjectsSnap.forEach(doc => {
            const subject = doc.data();
            if (subject.class === selectedClass) {
                subjectMap[subject.subjectCode] = subject.subjectName;
                subjects.push({code: subject.subjectCode, name: subject.subjectName});
            }
        });
        
        // Sort by subject code to maintain order
        subjects.sort((a, b) => {
            const aNum = parseInt(a.code.replace('sub', ''));
            const bNum = parseInt(b.code.replace('sub', ''));
            return aNum - bNum;
        });
        
        // Store in session for header update
        sessionStorage.setItem('classSubjects', JSON.stringify(subjects));
        console.log(`Loaded ${subjects.length} subjects for ${selectedClass}`);
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

async function loadMarks() {
    try {
        const marksSnapshot = await db.collection('marks')
            .doc(selectedExam)
            .collection(selectedClass)
            .get();

        allMarks = [];
        marksSnapshot.forEach(doc => {
            const data = doc.data();
            const student = studentMap[data.adm_no];
            if (student) {
                allMarks.push({
                    ...data,
                    name: student.name,
                    roll: student.roll
                });
            }
        });

        // Sort by roll number
        allMarks.sort((a, b) => parseInt(a.roll || 0) - parseInt(b.roll || 0));
        filteredMarks = [...allMarks];

        console.log(`Loaded ${allMarks.length} student marks`);
    } catch (error) {
        console.error('Error loading marks:', error);
        throw error;
    }
}

function updateTableHeader() {
    const subjects = JSON.parse(sessionStorage.getItem('classSubjects') || '[]');
    const headerRow = document.querySelector('thead tr:last-child');
    if (headerRow && subjects.length > 0) {
        const cells = headerRow.querySelectorAll('th');
        subjects.forEach((subject, index) => {
            if (cells[index + 2]) { // Skip Roll and Name columns
                cells[index + 2].textContent = subject.name;
            }
        });
    }
    
    // Update total header with correct max marks
    const maxMarks = getMaxMarksForClass(selectedClass);
    const numSubjects = getNumSubjectsForClass(selectedClass);
    const maxTotal = maxMarks * numSubjects;
    const totalHeader = document.getElementById('totalHeader');
    if (totalHeader) {
        totalHeader.textContent = `Total (Out of ${maxTotal})`;
    }
}

function displayMarks(marks) {
    const tableBody = document.getElementById('tableBody');
    
    // Get correct max marks and number of subjects for the selected class
    const maxMarks = getMaxMarksForClass(selectedClass);
    const numSubjects = getNumSubjectsForClass(selectedClass);
    const maxTotal = maxMarks * numSubjects;

    if (marks.length === 0) {
        tableBody.innerHTML = '<tr><td colSpan="11" class="text-center text-muted">No marks entered yet</td></tr>';
        return;
    }

    tableBody.innerHTML = marks.map(m => {
        let total = 0;
        let marksCount = 0;
        let allAbsent = true;

        for (let i = 1; i <= numSubjects; i++) {
            const mark = m[`sub${i}`];
            if (mark !== undefined && mark !== null && mark !== '') {
                const markValue = parseInt(mark);
                if (markValue !== -1) {
                    total += markValue;
                    allAbsent = false;
                }
                marksCount++;
            }
        }

        const rowClass = total === 0 && marksCount === 0 ? 'table-secondary' : (allAbsent ? 'table-warning' : '');

        // Build marks cells based on number of subjects
        let marksCells = '';
        for (let i = 1; i <= numSubjects; i++) {
            marksCells += `<td class="text-center">${formatMark(m[`sub${i}`], maxMarks)}</td>`;
        }

        const rankCell = showRank ? `<td class="text-center fw-bold">${m._rank !== undefined ? m._rank : '-'}</td>` : '';

        return `
            <tr class="${rowClass}">
                <td class="fw-bold">${m.roll || '-'}</td>
                <td>${m.name || '-'}</td>
                ${marksCells}
                <td class="text-center fw-bold">${marksCount > 0 ? total + '/' + maxTotal : '-'}</td>
                ${rankCell}
            </tr>`;
    }).join('');
}

function formatMark(mark, maxMarks) {
    if (mark === undefined || mark === null || mark === '') {
        return '<span class="text-muted">-</span>';
    }
    if (mark === -1) {
        return '<span class="badge bg-danger">A</span>';
    }
    if (parseInt(mark) > maxMarks) {
        return `<span class="text-danger fw-bold">${mark}</span>`;
    }
    return mark;
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        filteredMarks = allMarks.filter(m => 
            m.name.toLowerCase().includes(query) || 
            m.roll.toString().includes(query)
        );

        if (isSortedByMarks) {
            filteredMarks = assignRanks(filteredMarks);
        }

        displayMarks(filteredMarks);
    });
}

function hideExtraSubjectColumns() {
    const numSubjects = getNumSubjectsForClass(selectedClass);
    const headerSpan = document.getElementById('marksHeaderColSpan');
    const s7Header = document.getElementById('s7Header');
    const s8Header = document.getElementById('s8Header');
    
    if (numSubjects === 6) {
        // Hide S7 and S8 columns for IX A
        if (s7Header) s7Header.style.display = 'none';
        if (s8Header) s8Header.style.display = 'none';
        // Update colSpan to 6 instead of 8
        if (headerSpan) headerSpan.colSpan = 6;
    }
}

function getExamLabel(examCode) {
    const labels = {
        'hy2025': 'Half Yearly 2025',
        'year2025': 'Yearly 2025'
    };
    return labels[examCode] || examCode;
}

// --- Sort by Marks & Rank ---
function getStudentTotal(m) {
    const numSubjects = getNumSubjectsForClass(selectedClass);
    let total = 0;
    let hasMarks = false;
    for (let i = 1; i <= numSubjects; i++) {
        const mark = m[`sub${i}`];
        if (mark !== undefined && mark !== null && mark !== '') {
            const v = parseInt(mark);
            if (v !== -1) { total += v; }
            hasMarks = true;
        }
    }
    return hasMarks ? total : -1;
}

function assignRanks(marks) {
    // Sort descending by total; students with no marks get no rank
    const sorted = [...marks].sort((a, b) => getStudentTotal(b) - getStudentTotal(a));
    let rank = 0;
    let prevTotal = null;
    let skip = 0;
    sorted.forEach((m) => {
        const t = getStudentTotal(m);
        if (t < 0) { m._rank = '-'; return; }
        skip++;
        if (t !== prevTotal) { rank = skip; prevTotal = t; }
        m._rank = rank;
    });
    return sorted;
}

function toggleSortByMarks() {
    isSortedByMarks = !isSortedByMarks;
    showRank = isSortedByMarks;

    const btn = document.getElementById('sortRankBtn');
    btn.classList.toggle('active', isSortedByMarks);
    btn.classList.toggle('btn-outline-primary', !isSortedByMarks);
    btn.classList.toggle('btn-primary', isSortedByMarks);

    // Show/hide rank column headers
    document.getElementById('rankColHeader1').style.display = showRank ? '' : 'none';
    document.getElementById('rankColHeader2').style.display = showRank ? '' : 'none';

    if (isSortedByMarks) {
        filteredMarks = assignRanks(filteredMarks);
    } else {
        // Reset to roll order
        filteredMarks.forEach(m => delete m._rank);
        filteredMarks.sort((a, b) => parseInt(a.roll || 0) - parseInt(b.roll || 0));
    }
    displayMarks(filteredMarks);
}

// --- Print ---
function printMarks() {
    // Fill print header
    document.getElementById('printExamTitle').textContent = getExamLabel(selectedExam);
    document.getElementById('printClassTitle').textContent = 'Class: ' + selectedClass;
    window.print();
}
