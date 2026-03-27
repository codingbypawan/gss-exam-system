// Progress Report Logic
let allStudents = [];
let studentMap = {};
let subjectsByClass = {};
let hyMarks = {};   // adm_no -> marks for Half Yearly
let yearMarks = {}; // adm_no -> marks for Yearly

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireLogin()) return;

    try {
        document.getElementById('statusText').textContent = 'Loading data...';
        await Promise.all([loadStudents(), loadClassSubjects()]);
        populateClassDropdown();
        setupEventListeners();
        document.getElementById('statusText').textContent = 'Select a class to generate progress reports.';
    } catch (error) {
        console.error('Error initializing:', error);
        document.getElementById('statusText').textContent = 'Failed to load data. Please refresh.';
    }
});

async function loadStudents() {
    const snap = await db.collection('students').get();
    allStudents = [];
    studentMap = {};
    snap.forEach(doc => {
        const s = doc.data();
        allStudents.push(s);
        studentMap[s.adm_no] = s;
    });
}

async function loadClassSubjects() {
    const snap = await db.collection('classSubjects').get();
    subjectsByClass = {};
    snap.forEach(doc => {
        const d = doc.data();
        if (!subjectsByClass[d.class]) subjectsByClass[d.class] = [];
        subjectsByClass[d.class].push({ code: d.subjectCode, name: d.subjectName });
    });
    // Sort subjects by code number
    Object.keys(subjectsByClass).forEach(cls => {
        subjectsByClass[cls].sort((a, b) => {
            return parseInt(a.code.replace('sub', '')) - parseInt(b.code.replace('sub', ''));
        });
    });
}

function populateClassDropdown() {
    const select = document.getElementById('reportClassSelect');
    const classes = [...new Set(allStudents.map(s => s.class2025))].sort();
    classes.forEach(cls => {
        const opt = document.createElement('option');
        opt.value = cls;
        opt.textContent = cls;
        select.appendChild(opt);
    });
}

function setupEventListeners() {
    document.getElementById('reportClassSelect').addEventListener('change', function () {
        const cls = this.value;
        const studentSelect = document.getElementById('reportStudentSelect');
        studentSelect.innerHTML = '<option value="">-- All Students --</option>';

        if (!cls) {
            studentSelect.disabled = true;
            return;
        }

        const classStudents = allStudents
            .filter(s => s.class2025 === cls)
            .sort((a, b) => parseInt(a.roll2025 || 0) - parseInt(b.roll2025 || 0));

        classStudents.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.adm_no;
            opt.textContent = `${s.roll2025} - ${s.name}`;
            studentSelect.appendChild(opt);
        });

        studentSelect.disabled = false;
    });
}

async function generateReport() {
    const selectedClass = document.getElementById('reportClassSelect').value;
    const selectedStudent = document.getElementById('reportStudentSelect').value;

    if (!selectedClass) {
        alert('Please select a class.');
        return;
    }

    document.getElementById('generateBtn').disabled = true;
    document.getElementById('statusText').textContent = 'Loading marks data...';

    try {
        // Load marks for both exams
        await Promise.all([
            loadMarksForExam('hy2025', selectedClass),
            loadMarksForExam('year2025', selectedClass)
        ]);

        // Get students for this class
        let students = allStudents
            .filter(s => s.class2025 === selectedClass)
            .sort((a, b) => parseInt(a.roll2025 || 0) - parseInt(b.roll2025 || 0));

        // Filter to single student if selected
        if (selectedStudent) {
            students = students.filter(s => s.adm_no === selectedStudent);
        }

        if (students.length === 0) {
            document.getElementById('reportsContainer').innerHTML =
                '<div class="text-center text-muted mt-4">No students found.</div>';
            return;
        }

        // Get subjects for this class
        const subjects = subjectsByClass[selectedClass] || [];
        const maxMarks = getMaxMarksForClass(selectedClass);
        const numSubjects = getNumSubjectsForClass(selectedClass);

        // Calculate aggregate ranks across all students in the class
        const allClassStudents = allStudents
            .filter(s => s.class2025 === selectedClass)
            .sort((a, b) => parseInt(a.roll2025 || 0) - parseInt(b.roll2025 || 0));

        const rankMap = calculateClassRanks(allClassStudents, numSubjects, maxMarks);

        // Generate HTML
        const html = students.map((student, idx) => {
            return buildReportCard(student, subjects, numSubjects, maxMarks, rankMap, idx < students.length - 1);
        }).join('');

        document.getElementById('reportsContainer').innerHTML = html;
        document.getElementById('printBtn').disabled = false;
        document.getElementById('statusText').textContent =
            `Generated ${students.length} report(s) for ${selectedClass}.`;
    } catch (error) {
        console.error('Error generating report:', error);
        document.getElementById('statusText').textContent = 'Error generating report. Please try again.';
    } finally {
        document.getElementById('generateBtn').disabled = false;
    }
}

async function loadMarksForExam(examCode, selectedClass) {
    const snap = await db.collection('marks').doc(examCode).collection(selectedClass).get();
    const marksMap = examCode === 'hy2025' ? hyMarks : yearMarks;

    // Clear previous
    Object.keys(marksMap).forEach(k => delete marksMap[k]);

    snap.forEach(doc => {
        const d = doc.data();
        marksMap[d.adm_no] = d;
    });
}

function calculateClassRanks(students, numSubjects, maxMarks) {
    const maxPerExam = maxMarks * numSubjects;
    const grandMax = maxPerExam * 2; // HY + Yearly

    // Calculate aggregate total for each student
    const totals = students.map(s => {
        const hy = getExamTotal(s.adm_no, 'hy', numSubjects);
        const yr = getExamTotal(s.adm_no, 'year', numSubjects);
        const aggregate = (hy >= 0 ? hy : 0) + (yr >= 0 ? yr : 0);
        const hasData = hy >= 0 || yr >= 0;
        return { adm_no: s.adm_no, aggregate, hasData };
    });

    // Sort descending by aggregate
    totals.sort((a, b) => b.aggregate - a.aggregate);

    const rankMap = {};
    let rank = 0;
    let prevTotal = null;
    let skip = 0;

    totals.forEach(t => {
        if (!t.hasData) {
            rankMap[t.adm_no] = null;
            return;
        }
        skip++;
        if (t.aggregate !== prevTotal) {
            rank = skip;
            prevTotal = t.aggregate;
        }
        rankMap[t.adm_no] = rank;
    });

    return rankMap;
}

function getExamTotal(admNo, examType, numSubjects) {
    const marks = examType === 'hy' ? hyMarks[admNo] : yearMarks[admNo];
    if (!marks) return -1;

    let total = 0;
    let hasAny = false;

    for (let i = 1; i <= numSubjects; i++) {
        const v = marks[`sub${i}`];
        if (v !== undefined && v !== null && v !== '') {
            const num = parseInt(v);
            if (num !== -1) {
                total += num;
            }
            hasAny = true;
        }
    }

    return hasAny ? total : -1;
}

function getMarkValue(admNo, examType, subCode) {
    const marks = examType === 'hy' ? hyMarks[admNo] : yearMarks[admNo];
    if (!marks) return null;
    const v = marks[subCode];
    if (v === undefined || v === null || v === '') return null;
    return parseInt(v);
}

function buildReportCard(student, subjects, numSubjects, maxMarks, rankMap, addPageBreak) {
    const admNo = student.adm_no;
    const maxPerExam = maxMarks * numSubjects;
    const grandMax = maxPerExam * 2;

    // Calculate totals
    const hyTotal = getExamTotal(admNo, 'hy', numSubjects);
    const yearTotal = getExamTotal(admNo, 'year', numSubjects);
    const aggregateTotal = (hyTotal >= 0 ? hyTotal : 0) + (yearTotal >= 0 ? yearTotal : 0);

    const hyPercentage = maxPerExam > 0 && hyTotal >= 0 ? ((hyTotal / maxPerExam) * 100) : 0;
    const yearPercentage = maxPerExam > 0 && yearTotal >= 0 ? ((yearTotal / maxPerExam) * 100) : 0;
    const aggPercentage = grandMax > 0 ? ((aggregateTotal / grandMax) * 100) : 0;

    // Passed if aggregate >= 40%, else Promoted
    const passed = aggPercentage >= 40;
    const rank = rankMap[admNo];

    // Build subject rows
    let subjectRows = '';
    for (let i = 0; i < numSubjects; i++) {
        const sub = subjects[i];
        if (!sub) continue;
        const subCode = sub.code;

        const hyMark = getMarkValue(admNo, 'hy', subCode);
        const yrMark = getMarkValue(admNo, 'year', subCode);

        const hyDisplay = hyMark === null ? '-' : (hyMark === -1 ? 'A' : hyMark);
        const yrDisplay = yrMark === null ? '-' : (yrMark === -1 ? 'A' : yrMark);

        const hyNum = (hyMark !== null && hyMark !== -1) ? hyMark : 0;
        const yrNum = (yrMark !== null && yrMark !== -1) ? yrMark : 0;
        const agg = hyNum + yrNum;
        const aggDisplay = (hyMark === null && yrMark === null) ? '-' : agg;

        subjectRows += `
            <tr>
                <td class="subject-name">${sub.name}</td>
                <td>${maxMarks}</td>
                <td>${hyDisplay}</td>
                <td>${maxMarks}</td>
                <td>${yrDisplay}</td>
                <td>${maxMarks * 2}</td>
                <td><strong>${aggDisplay}</strong></td>
            </tr>`;
    }

    // Result text — Passed or Promoted
    const resultText = passed
        ? '<span class="result-value passed">Passed</span>'
        : '<span class="result-value failed">Promoted</span>';

    // Rank display (only top 3)
    let rankDisplay = '';
    if (rank !== null && rank <= 3) {
        rankDisplay = `<span class="result-value rank-value">#${rank}</span>`;
    }

    return `
    <div class="report-card ${addPageBreak ? 'page-break' : ''}">
        <!-- Watermark -->
        <img src="logo.jpg" class="watermark" alt="">

        <!-- School Header with Logo -->
        <div class="school-header">
            <img src="logo.jpg" class="school-logo" alt="Logo">
            <div class="school-text">
                <h2>Gurukul Shikshan Sansthan</h2>
                <div class="school-address">Khampar (Jaipur), Deoria (U.P.)</div>
                <div class="school-contact">
                    &#x260E; 9628123917, 9919821260 &nbsp;|&nbsp;
                    &#x2709; gurukulkhampar@gmail.com &nbsp;|&nbsp;
                    &#x1F310; gurukulkhampar.in
                </div>
            </div>
        </div>

        <!-- Title -->
        <div class="report-title">Progress Report 2025-26</div>

        <!-- Student Info — 3 rows, 2 columns -->
        <div class="student-info">
            <div class="info-item">
                <span class="info-label">Name :</span>
                <span class="info-value">${(student.name || '').trim()}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Adm No. :</span>
                <span class="info-value">${student.adm_no || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Father's Name :</span>
                <span class="info-value">${(student.fatherName || student.father_name || '').trim()}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Class :</span>
                <span class="info-value">${student.class2025 || ''}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Mother's Name :</span>
                <span class="info-value">${(student.motherName || student.mother_name || '').trim()}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Roll No. :</span>
                <span class="info-value">${student.roll2025 || ''}</span>
            </div>
        </div>

        <!-- Marks Table -->
        <table class="marks-table">
            <thead>
                <tr>
                    <th rowspan="2" style="width:28%">Subject</th>
                    <th colspan="2">Half Yearly</th>
                    <th colspan="2">Yearly</th>
                    <th colspan="2">Aggregate</th>
                </tr>
                <tr>
                    <th>Max</th>
                    <th>Obt.</th>
                    <th>Max</th>
                    <th>Obt.</th>
                    <th>Max</th>
                    <th>Obt.</th>
                </tr>
            </thead>
            <tbody>
                ${subjectRows}
            </tbody>
            <tfoot>
                <tr style="font-weight:700; background:#e8e8e8;">
                    <td style="text-align:left; font-weight:700;">Total</td>
                    <td>${maxPerExam}</td>
                    <td>${hyTotal >= 0 ? hyTotal : '-'}</td>
                    <td>${maxPerExam}</td>
                    <td>${yearTotal >= 0 ? yearTotal : '-'}</td>
                    <td>${grandMax}</td>
                    <td><strong>${aggregateTotal}</strong></td>
                </tr>
                <tr style="font-weight:700;">
                    <td style="text-align:left; font-weight:700;">Percentage</td>
                    <td colspan="2">${hyTotal >= 0 ? hyPercentage.toFixed(2) + '%' : '-'}</td>
                    <td colspan="2">${yearTotal >= 0 ? yearPercentage.toFixed(2) + '%' : '-'}</td>
                    <td colspan="2" style="font-size:16px;"><strong>${aggPercentage.toFixed(2)}%</strong></td>
                </tr>
            </tfoot>
        </table>

        <!-- Result Section -->
        <div class="result-section">
            <div class="result-box">
                <div class="result-label">Total</div>
                <div class="result-value" style="font-size:26px;">${aggregateTotal} / ${grandMax}</div>
            </div>
            <div class="result-box">
                <div class="result-label">Percentage</div>
                <div class="result-value" style="font-size:22px;">${aggPercentage.toFixed(2)}%</div>
            </div>
            <div class="result-box">
                <div class="result-label">Result</div>
                ${resultText}
            </div>${rank !== null && rank <= 3 ? `
            <div class="result-box">
                <div class="result-label">Rank</div>
                <span class="result-value rank-value">#${rank}</span>
            </div>` : ''}
        </div>

        <!-- Signatures -->
        <div class="signature-section">
            <div class="sig-box">
                <div class="sig-line">Parent / Guardian</div>
            </div>
            <div class="sig-box">
                <div class="sig-line">Class Teacher</div>
            </div>
            <div class="sig-box">
                <img src="sign.jpeg" alt="Principal" style="height:40px; display:block; margin:0 auto 2px;">
                <div class="sig-line">Principal</div>
            </div>
        </div>
    </div>`;
}
