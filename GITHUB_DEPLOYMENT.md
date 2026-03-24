# GitHub Deployment Guide for GSS Exam System

This guide will walk you through deploying the GSS Exam System to GitHub Pages in under 10 minutes.

## Step-by-Step Deployment

### Step 1: Prepare Your Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click your project
3. Click the gear icon (⚙️) → Project Settings
4. Scroll down to "Your apps" section
5. Look for your web app configuration
6. Copy the entire config object that looks like:
   ```javascript
   apiKey: "AIzaSyD...",
   authDomain: "your-project.firebaseapp.com",
   projectId: "your-project",
   storageBucket: "your-project.appspot.com",
   messagingSenderId: "123456...",
   appId: "1:123456:web:abc123..."
   ```

### Step 2: Update config.js Locally

1. Open `js/config.js` in a text editor
2. Replace the placeholder values with your Firebase credentials:
   ```javascript
   const firebaseConfig = {
       apiKey: "YOUR_ACTUAL_API_KEY",
       authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
       projectId: "YOUR_ACTUAL_PROJECT_ID",
       storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
       messagingSenderId: "YOUR_ACTUAL_MESSAGING_SENDER_ID",
       appId: "YOUR_ACTUAL_APP_ID"
   };
   ```
3. Save the file

### Step 3: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com)
2. Log in to your account
3. Click the **+** icon in the top right → "New repository"
4. Name it: `gss-exam-system` (or any name you prefer)
5. Add description: "GSS Examination System - Half Yearly and Yearly Exams"
6. Select "Public" (for GitHub Pages)
7. Do NOT add README, .gitignore (we already have these)
8. Click "Create repository"

### Step 4: Push Your Code to GitHub

Open Command Prompt or Terminal in your project folder and run:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: GSS Exam System"

# Add GitHub as remote (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/gss-exam-system.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Example** (with real values):
```bash
git remote add origin https://github.com/john-doe/gss-exam-system.git
git push -u origin main
```

### Step 5: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (top right)
3. Scroll down to **Pages** section (left sidebar)
4. Under "Build and deployment":
   - Source: Select "Deploy from a branch"
   - Branch: Select "main"
   - Folder: Select "/ (root)"
5. Click "Save"
6. Wait 1-2 minutes for deployment
7. GitHub will show your live URL: `https://YOUR_USERNAME.github.io/gss-exam-system/`

### Step 6: Update GitHub Pages in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Open your project
3. Go to **Build > Firestore Database**
4. Click **Rules** tab
5. Update rules to allow your GitHub Pages domain (see Security Rules section below)
6. Deploy the rules

## Firestore Security Rules

Replace the default Firestore rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to read/write users (for login)
    match /users/{document=**} {
      allow read, write: if true;
    }
    
    // Allow authenticated users to access marks
    match /marks/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Allow authenticated users to access students
    match /students/{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // Allow authenticated users to access classSubjects
    match /classSubjects/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Using Your Deployed System

### Access Your System

Go to: `https://YOUR_USERNAME.github.io/gss-exam-system/`

Example: `https://john-doe.github.io/gss-exam-system/`

### Initial Login (Admin)

1. Login page will appear
2. Enter:
   - **Mobile Number**: 9919199848
   - **Password**: password123
3. Click "Login"

### First-Time Setup

1. After login, click "Admin Panel" or go to: `/admin.html`
2. Complete data import:
   - Click "Import Students"
   - Click "Import Class Subjects"
   - Click "Import Exam Data"
3. Create teacher accounts:
   - Enter mobile number
   - Set password
   - Select "Teacher" role
   - Click "Create User"

## Making Updates

### Edit Files Locally

1. Make changes to files locally
2. Test in browser (Python: `python -m http.server 8000`)
3. Push to GitHub:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```

### Changes are Live

After pushing, your changes will be live on GitHub Pages within seconds!

## Common Issues & Solutions

### Issue: Page shows 404
**Solution**: 
- Check your repository name is correct in the URL
- Wait 2 minutes for GitHub Pages to build
- Go to Settings > Pages to verify it's enabled

### Issue: Firebase errors on page
**Solution**:
1. Open browser Console (F12)
2. Check if Firebase config is loaded correctly
3. Verify API key in config.js
4. Check Firestore Rules allow access

### Issue: "Cannot import data" when importing
**Solution**:
1. Verify you're logged in as admin
2. Check Firebase project is active
3. Verify Firestore database exists
4. Check Security Rules allow writes

### Issue: Login doesn't work
**Solution**:
1. Ensure you've imported users (admin creates them)
2. Check exact mobile number and password
3. Clear browser cache and try again
4. Check browser console for errors

## Sharing Your System

### Share the Link

Your system is now live at:
```
https://YOUR_USERNAME.github.io/gss-exam-system/
```

### For Teachers/Students

1. Give them the URL
2. They can login with their mobile number and password
3. They can only access their assigned classes/subjects

## Advanced: Custom Domain

To use your own domain instead of github.io:

1. Go to your domain registrar
2. Add CNAME record pointing to: `YOUR_USERNAME.github.io`
3. In GitHub repo Settings > Pages:
   - Add your custom domain
   - Enable HTTPS

## Maintenance

### Backup Your Data

Firebase automatically backs up your data. You can export it:

1. Go to Firebase Console
2. Firestore Database → Import/Export
3. Click "Export Collection"
4. Select collections to export

### Monitor System

1. Go to Firebase Console
2. Check "Storage" tab for database usage
3. Check "Billing" if using paid plan

### Update Security Rules

Always keep Security Rules updated for production use.

## Next Steps

After deployment:

1. ✅ Test login with admin account
2. ✅ Create teacher accounts
3. ✅ Import student data
4. ✅ Have teachers enter marks
5. ✅ Generate reports
6. ✅ Share link with users

## Support

If you encounter issues:

1. Check the README.md file
2. Check browser console (F12) for errors
3. Review Firestore Rules in Firebase Console
4. Verify Firebase credentials in config.js

## Security Reminder

⚠️ **Important**: This system uses basic password storage for demo purposes. For production:

1. Implement proper password hashing
2. Use Firebase Authentication
3. Implement role-based access control
4. Use HTTPS everywhere (GitHub Pages uses this by default)
5. Regular security audits

---

**Deployment Checklist:**
- [ ] Firebase project created
- [ ] config.js updated with Firebase credentials
- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] GitHub Pages enabled
- [ ] System accessible at GitHub Pages URL
- [ ] Firestore Security Rules updated
- [ ] Admin account works
- [ ] Data imported successfully
- [ ] System ready for teachers/students!