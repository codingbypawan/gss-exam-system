// View Marks Logic
let selectedExam = '';
let selectedClass = '';
let allMarks = [];
let filteredMarks = [];
let studentMap = {};
let subjectMap = {};
let isSortedByMarks = false;
let showRank = false;
let isBothMode = false;

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireLogin()) return;
    
    selectedExam = sessionStorage.getItem('selectedExam');
    selectedClass = sessionStorage.getItem('selectedClass');
    isBothMode = (selectedExam === 'both2025');

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
        if (isBothMode) {
            await loadBothExamMarks();
            setupBothExamTable();
        } else {
            await loadMarks();
            updateTableHeader();
            hideExtraSubjectColumns();
        }
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

async function loadBothExamMarks() {
    try {
        const numSubjects = getNumSubjectsForClass(selectedClass);
        const maxMarks = getMaxMarksForClass(selectedClass);
        const maxTotal = maxMarks * numSubjects;

        // Load marks from both exams in parallel
        const [hySnap, yearSnap] = await Promise.all([
            db.collection('marks').doc('hy2025').collection(selectedClass).get(),
            db.collection('marks').doc('year2025').collection(selectedClass).get()
        ]);

        const hyMap = {};
        hySnap.forEach(doc => {
            const data = doc.data();
            hyMap[data.adm_no] = data;
        });

        const yearMap = {};
        yearSnap.forEach(doc => {
            const data = doc.data();
            yearMap[data.adm_no] = data;
        });

        // Merge all admission numbers from both exams
        const allAdmNos = new Set([...Object.keys(hyMap), ...Object.keys(yearMap)]);

        allMarks = [];
        allAdmNos.forEach(admNo => {
            const student = studentMap[admNo];
            if (!student) return;

            const hyData = hyMap[admNo] || {};
            const yearData = yearMap[admNo] || {};

            let hyTotal = 0, yearTotal = 0, aggTotal = 0;
            let hyHasMarks = false, yearHasMarks = false;
            const hySubjects = {}, yearSubjects = {}, aggSubjects = {};

            for (let i = 1; i <= numSubjects; i++) {
                const key = `sub${i}`;
                const hyMark = hyData[key];
                const yearMark = yearData[key];
                let hyVal = null, yearVal = null;

                if (hyMark !== undefined && hyMark !== null && hyMark !== '') {
                    hyVal = parseInt(hyMark);
                    if (hyVal !== -1) hyTotal += hyVal;
                    hyHasMarks = true;
                }
                if (yearMark !== undefined && yearMark !== null && yearMark !== '') {
                    yearVal = parseInt(yearMark);
                    if (yearVal !== -1) yearTotal += yearVal;
                    yearHasMarks = true;
                }

                hySubjects[key] = hyMark;
                yearSubjects[key] = yearMark;

                // Aggregate per subject: sum of non-absent marks
                const hv = (hyVal !== null && hyVal !== -1) ? hyVal : 0;
                const yv = (yearVal !== null && yearVal !== -1) ? yearVal : 0;
                const bothAbsent = (hyVal === -1 || hyVal === null) && (yearVal === -1 || yearVal === null);
                aggSubjects[key] = bothAbsent ? null : (hv + yv);
                if (!bothAbsent) aggTotal += (hv + yv);
            }

            allMarks.push({
                adm_no: admNo,
                name: student.name,
                roll: student.roll,
                hySubjects, yearSubjects, aggSubjects,
                hyTotal, yearTotal, aggTotal,
                hyHasMarks, yearHasMarks,
                hasAnyMarks: hyHasMarks || yearHasMarks,
                aggregate: aggTotal,
                maxTotal: maxTotal
            });
        });

        allMarks.sort((a, b) => parseInt(a.roll || 0) - parseInt(b.roll || 0));
        filteredMarks = [...allMarks];
        console.log(`Loaded ${allMarks.length} student aggregate marks`);
    } catch (error) {
        console.error('Error loading both exam marks:', error);
        throw error;
    }
}

function setupBothExamTable() {
    const subjects = JSON.parse(sessionStorage.getItem('classSubjects') || '[]');
    const numSubjects = getNumSubjectsForClass(selectedClass);
    const maxMarks = getMaxMarksForClass(selectedClass);

    let subjectHeaders = '';
    for (let i = 0; i < numSubjects; i++) {
        const name = subjects[i] ? subjects[i].name : `S${i + 1}`;
        subjectHeaders += `<th class="text-center">${name}</th>`;
    }

    const thead = document.querySelector('#marksTable thead');
    thead.innerHTML = `
        <tr>
            <th>Roll</th>
            <th>Name</th>
            <th>Exam</th>
            ${subjectHeaders}
            <th class="text-center fw-bold">Total</th>
            <th class="text-center fw-bold">%</th>
            <th class="text-center fw-bold" id="rankColBoth" style="display:none;">Rank</th>
        </tr>`;
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

    if (marks.length === 0) {
        const cols = isBothMode ? 6 : 11;
        tableBody.innerHTML = `<tr><td colSpan="${cols}" class="text-center text-muted">No marks entered yet</td></tr>`;
        return;
    }

    if (isBothMode) {
        const numSubjects = getNumSubjectsForClass(selectedClass);
        const maxMarks = getMaxMarksForClass(selectedClass);
        const maxTotal = maxMarks * numSubjects;
        const cols = 3 + numSubjects + 1 + (showRank ? 1 : 0);

        tableBody.innerHTML = marks.map(m => {
            const rankCell = showRank ? `<td rowspan="3" class="text-center fw-bold align-middle">${m._rank !== undefined ? m._rank : '-'}</td>` : '';

            // HY row marks
            let hyCells = '';
            for (let i = 1; i <= numSubjects; i++) {
                hyCells += `<td class="text-center">${formatMark(m.hySubjects[`sub${i}`], maxMarks)}</td>`;
            }

            // Yearly row marks
            let yearCells = '';
            for (let i = 1; i <= numSubjects; i++) {
                yearCells += `<td class="text-center">${formatMark(m.yearSubjects[`sub${i}`], maxMarks)}</td>`;
            }

            // Aggregate row marks
            let aggCells = '';
            for (let i = 1; i <= numSubjects; i++) {
                const val = m.aggSubjects[`sub${i}`];
                aggCells += `<td class="text-center fw-bold">${val !== null ? val : '-'}</td>`;
            }

            // Percentage calculations
            const hyPct = m.hyHasMarks ? ((m.hyTotal / maxTotal) * 100).toFixed(1) + '%' : '-';
            const yearPct = m.yearHasMarks ? ((m.yearTotal / maxTotal) * 100).toFixed(1) + '%' : '-';
            const aggPct = m.hasAnyMarks ? ((m.aggTotal / (maxTotal * 2)) * 100).toFixed(1) + '%' : '-';

            return `
                <tr class="border-top">
                    <td rowspan="3" class="fw-bold align-middle">${m.roll || '-'}</td>
                    <td rowspan="3" class="align-middle">${m.name || '-'}</td>
                    <td><span class="badge bg-info">HY</span></td>
                    ${hyCells}
                    <td class="text-center">${m.hyHasMarks ? m.hyTotal + '/' + maxTotal : '-'}</td>
                    <td class="text-center">${hyPct}</td>
                    ${rankCell}
                </tr>
                <tr>
                    <td><span class="badge bg-primary">Yearly</span></td>
                    ${yearCells}
                    <td class="text-center">${m.yearHasMarks ? m.yearTotal + '/' + maxTotal : '-'}</td>
                    <td class="text-center">${yearPct}</td>
                </tr>
                <tr class="table-warning">
                    <td><span class="badge bg-dark">Agg</span></td>
                    ${aggCells}
                    <td class="text-center fw-bold">${m.hasAnyMarks ? m.aggTotal + '/' + (maxTotal * 2) : '-'}</td>
                    <td class="text-center fw-bold">${aggPct}</td>
                </tr>`;
        }).join('');
        return;
    }

    // Single exam mode
    const maxMarks = getMaxMarksForClass(selectedClass);
    const numSubjects = getNumSubjectsForClass(selectedClass);
    const maxTotal = maxMarks * numSubjects;

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
    
    // Reset visibility first
    if (s7Header) s7Header.style.display = '';
    if (s8Header) s8Header.style.display = '';
    if (headerSpan) headerSpan.colSpan = numSubjects;

    if (numSubjects <= 6) {
        // Hide S7 and S8 columns for 6-subject classes
        if (s7Header) s7Header.style.display = 'none';
        if (s8Header) s8Header.style.display = 'none';
    } else if (numSubjects === 7) {
        // Hide S8 column for LKG/UKG (7 subjects)
        if (s8Header) s8Header.style.display = 'none';
    }
}

function getExamLabel(examCode) {
    const labels = {
        'hy2025': 'Half Yearly 2025',
        'year2025': 'Yearly 2025',
        'both2025': 'Both Exams - Aggregate 2025'
    };
    return labels[examCode] || examCode;
}

// --- Sort by Marks & Rank ---
function getStudentTotal(m) {
    if (isBothMode) {
        return m.hasAnyMarks ? m.aggregate : -1;
    }
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
    if (isBothMode) {
        const rankColBoth = document.getElementById('rankColBoth');
        if (rankColBoth) rankColBoth.style.display = showRank ? '' : 'none';
    } else {
        document.getElementById('rankColHeader1').style.display = showRank ? '' : 'none';
        document.getElementById('rankColHeader2').style.display = showRank ? '' : 'none';
    }

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
