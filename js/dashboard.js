// Dashboard Logic
let selectedMode = 'entry';
let classSubjects = [];
let currentClassSubjects = [];
let subjectsByClass = {}; // Cache subjects sorted by class

// Check authentication
document.addEventListener('DOMContentLoaded', () => {
    if (!requireLogin()) return;
    
    const user = getCurrentUser();
    document.getElementById('userName').textContent = user.name;
    
    // Show Admin Panel link if user is admin
    if (user.role === 'admin') {
        document.getElementById('adminLinkContainer').style.display = 'block';
    }
    
    loadClassSubjects();
    setupEventListeners();
    setMode('entry'); // Initialize mode to show subject dropdown
});

function setupEventListeners() {
    // Show/hide subject select based on mode
    document.getElementById('examSelect').addEventListener('change', enableClassSelect);
    document.getElementById('classSelect').addEventListener('change', loadSubjectsForClass);
}

function enableClassSelect() {
    const exam = document.getElementById('examSelect').value;
    document.getElementById('classSelect').disabled = !exam;
    document.getElementById('classSelect').value = '';
    document.getElementById('subjectSelect').value = '';
    document.getElementById('subjectSelect').innerHTML = '<option value="">-- Choose Subject --</option>';
}

// Load all class-subject mappings from Firestore
async function loadClassSubjects() {
    try {
        const snapshot = await db.collection('classSubjects').get();
        const classesSet = new Set();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            classSubjects.push(data);
            classesSet.add(data.class);
        });

        // Pre-sort and cache subjects by class for faster access
        classesSet.forEach(cls => {
            subjectsByClass[cls] = classSubjects
                .filter(s => s.class === cls)
                .sort((a, b) => {
                    const aNum = parseInt(a.subjectCode.replace(/\D/g, ''));
                    const bNum = parseInt(b.subjectCode.replace(/\D/g, ''));
                    return aNum - bNum;
                });
        });

        // Populate class dropdown with unique classes
        const classSelect = document.getElementById('classSelect');
        const sortedClasses = Array.from(classesSet).sort();
        
        sortedClasses.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls;
            option.textContent = cls;
            classSelect.appendChild(option);
        });

        classSelect.disabled = false;
    } catch (error) {
        console.error('Error loading classes:', error);
        alert('Failed to load classes. Please refresh.');
    }
}

// Load subjects for selected class
function loadSubjectsForClass() {
    const selectedClass = document.getElementById('classSelect').value;
    const subjectSelect = document.getElementById('subjectSelect');
    
    // Get cached, pre-sorted subjects for this class
    currentClassSubjects = subjectsByClass[selectedClass] || [];

    // Populate subject dropdown (use fragment for faster DOM update)
    subjectSelect.innerHTML = '<option value="">-- Choose Subject --</option>';
    
    // Use document fragment for batch DOM insertion (faster)
    const fragment = document.createDocumentFragment();
    currentClassSubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.subjectCode + '|' + subject.subjectName;
        option.textContent = subject.subjectName;
        fragment.appendChild(option);
    });
    
    subjectSelect.appendChild(fragment);
    subjectSelect.disabled = currentClassSubjects.length === 0;
}

function setMode(mode) {
    selectedMode = mode;
    document.getElementById('btnEntry').classList.toggle('active', mode === 'entry');
    document.getElementById('btnView').classList.toggle('active', mode === 'view');
    
    const subjectSelect = document.getElementById('subjectSelect');
    
    // Show subject select only for entry mode
    document.getElementById('subjectGroupDiv').style.display = mode === 'entry' ? 'block' : 'none';
    
    // Toggle required attribute based on mode
    if (mode === 'entry') {
        subjectSelect.setAttribute('required', '');
    } else {
        subjectSelect.removeAttribute('required');
    }
    
    // Reset subject select when switching modes
    subjectSelect.value = '';
}

// Handle form submission
document.getElementById('dashboardForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const exam = document.getElementById('examSelect').value;
    const cls = document.getElementById('classSelect').value;
    
    if (!exam || !cls) {
        alert('Please select both exam and class');
        return;
    }

    // For entry mode, require subject selection
    if (selectedMode === 'entry') {
        const subjectValue = document.getElementById('subjectSelect').value;
        if (!subjectValue) {
            alert('Please select a subject for marks entry');
            return;
        }
        
        const [subjectCode, subjectName] = subjectValue.split('|');
        sessionStorage.setItem('selectedSubjectCode', subjectCode);
        sessionStorage.setItem('selectedSubjectName', subjectName);
    }

    // Store selection in sessionStorage
    sessionStorage.setItem('selectedExam', exam);
    sessionStorage.setItem('selectedClass', cls);
    sessionStorage.setItem('selectedMode', selectedMode);

    // Redirect based on mode
    if (selectedMode === 'entry') {
        window.location.href = 'marks-entry.html';
    } else {
        window.location.href = 'view-marks.html';
    }
});
