# GSS Examination System

A web-based examination marking and reporting system built with HTML5, CSS3, JavaScript, and Firebase. Easily deployable to GitHub Pages.

## Features

- **Admin Login**: Secure authentication using mobile number and password
- **Marks Entry**: Per-student marks entry with real-time validation
- **Marks Viewing**: View and search marks with filtering options
- **Multi-Exam Support**: Support for Half-Yearly and Yearly exams
- **Multiple Classes**: Support for classes from LKG to X A
- **Responsive Design**: Mobile-friendly interface
- **Real-time Data**: Firebase Firestore for instant data sync

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **UI Framework**: Bootstrap 5.3.0
- **Backend**: Firebase (Firestore + Authentication)
- **Deployment**: GitHub Pages

## Prerequisites

- Firebase account with Firestore enabled
- GitHub account
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation & Setup

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Firestore Database (Start in production mode)
4. Go to Project Settings → General
5. Copy your Firebase configuration:
   ```
   apiKey
   authDomain
   projectId
   storageBucket
   messagingSenderId
   appId
   ```

### 2. Update Firebase Config

Edit `js/config.js` and replace the placeholder values with your Firebase credentials:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 3. Run Locally

Open `index.html` in your browser. Due to CORS restrictions with Firebase, you may need to use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server
```

Access at: `http://localhost:8000`

### 4. Import Data to Firestore

1. Login with admin credentials:
   - **Mobile**: 9919199848
   - **Password**: password123

2. Navigate to Admin Panel (or access admin.html directly)

3. Click buttons to import:
   - Import Students
   - Import Class Subjects
   - Import Exam Data (HY 2025)

### 5. Create Additional Users (Teachers)

In Admin Panel:
1. Enter mobile number (10 digits)
2. Set password
3. Select role (Teacher or Admin)
4. Click "Create User"

## Usage

### For Teachers/Admins

1. **Login**: Use mobile number and password
2. **Select Exam & Class**: Choose examination and class from dashboard
3. **Choose Mode**:
   - **Entry Mode**: Add/edit marks for students
   - **View Mode**: View marks and generate reports
4. **Enter Marks**: For each student, enter marks for all subjects
   - Valid range: 0-70 (Class IX), 0-50 (Other classes)
   - Use -1 to mark as "Absent"
5. **Save**: Clicks automatically save and move to next student

### Marks Validation Rules

- Class IX A: Max 70 marks per subject
- All other classes: Max 50 marks per subject
- Absent: Mark as -1
- Not enrolled: Leave as 0

## File Structure

```
gss-exam-system/
├── index.html              # Login page
├── admin.html              # Admin panel
├── dashboard.html          # Post-login dashboard
├── marks-entry.html        # Marks entry form
├── view-marks.html         # Marks viewing/reporting
├── css/
│   └── style.css          # Complete responsive styling
├── js/
│   ├── config.js          # Firebase configuration (UPDATE THIS)
│   ├── auth.js            # Authentication logic
│   ├── admin.js           # Admin operations
│   ├── dashboard.js       # Dashboard logic
│   ├── marks-entry.js     # Marks entry logic
│   ├── view-marks.js      # View marks logic
│   └── utils.js           # Utility functions
└── data/
    ├── student.json       # Student records
    ├── classsubject.json  # Class-subject mappings
    └── exam2025hy.json    # Half-yearly marks
```

## Firestore Collections Structure

### Users Collection
```
users/
  9919199848/
    - mobile: "9919199848"
    - password: "password123"
    - role: "admin"
    - createdAt: timestamp
```

### Students Collection
```
students/
  20190125/
    - adm_no: "20190125"
    - name: "Km. Pari Patwa"
    - class2025: "IX A"
    - roll2025: "28"
    - fatherName: "..."
    - ... (more fields)
```

### Class Subjects Collection
```
classSubjects/
  "IX A_sub1"/
    - class: "IX A"
    - subjectCode: "sub1"
    - subjectName: "Hindi"
    - teacher: "ALL"
```

### Marks Collection
```
marks/
  hy2025/(exam code)
    IX A/(class name)
      20190125/(admission no)
        - sub1: 55
        - sub2: 52
        - ... (up to sub8)
        - lastUpdated: timestamp
        - lastUpdatedBy: "9919199848"
```

## GitHub Deployment

### 1. Create GitHub Repository

```bash
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial GSS Exam System"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/gss-exam-system.git

# Push to GitHub
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to your repository on GitHub
2. Settings → Pages
3. Select `main` branch as source
4. Click Save
5. Your site will be available at: `https://YOUR_USERNAME.github.io/gss-exam-system/`

### 3. Update Firebase CORS

In Firebase Console:
1. Go to Authentication → Sign-in methods
2. Authorize GitHub Pages domain in Firestore security rules

## Security Notes

⚠️ **Important**: 
- Current implementation stores passwords in plain text (for demo purposes)
- For production, implement password hashing (bcrypt/argon2)
- Use Firebase Authentication for better security
- Implement proper access control with Firestore Security Rules

## Firestore Security Rules Example

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /marks/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /students/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Troubleshooting

### Issue: "Firebase is not defined"
**Solution**: Ensure `config.js` is loaded before other JS files and Firebase credentials are correct

### Issue: "Cannot import data"
**Solution**: 
1. Verify Firebase config in `js/config.js`
2. Check Firestore permissions
3. Ensure data files are in `/data/` folder

### Issue: Marks not saving
**Solution**:
1. Check browser console for errors
2. Verify Firestore Security Rules allow writes
3. Ensure user is logged in

## Support

For issues or feature requests, please create an issue on GitHub.

## License

This project is provided as-is for educational purposes.

## Credits

Built for GSS (School Name) - Examination System