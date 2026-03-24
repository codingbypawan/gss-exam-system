// Utility Functions

// Format date to readable format
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Get exam label
function getExamLabel(examCode) {
    const labels = {
        'hy2025': 'Half Yearly 2025',
        'year2025': 'Yearly 2025'
    };
    return labels[examCode] || examCode;
}

// Get max marks for a class
function getMaxMarksForClass(classCode) {
    return classCode === 'IX A' ? 100 : 50;
}

// Validate mark input
function isValidMark(mark, maxMarks) {
    const val = parseInt(mark);
    return val === -1 || (val >= 0 && val <= maxMarks);
}

// Calculate total marks
function calculateTotal(marks, maxMarks) {
    let total = 0;
    for (let i = 1; i <= 8; i++) {
        const mark = marks[`sub${i}`];
        if (mark && mark !== -1 && mark !== null && mark !== '') {
            total += parseInt(mark);
        }
    }
    return total;
}

// Check if all subjects have marks
function allSubjectsHaveMarks(marks) {
    for (let i = 1; i <= 8; i++) {
        if (!marks[`sub${i}`] && marks[`sub${i}`] !== 0) {
            return false;
        }
    }
    return true;
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastHTML = `
        <div class="toast align-items-center text-white bg-${type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    toastContainer.innerHTML = toastHTML;
    
    const toast = new bootstrap.Toast(toastContainer.querySelector('.toast'));
    toast.show();
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '1050';
    document.body.appendChild(container);
    return container;
}

// Debounce function for search
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}
