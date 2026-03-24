# Quick Start - 5 Minute Setup

## What You Need

- GitHub account (free at github.com)
- Firebase project (free tier available)
- Your project folder: `c:\Users\pawan\Downloads\GSS\GSSExam\gss-exam-system\`

## Step 1: Get Firebase Credentials (2 min)

1. Go to https://console.firebase.google.com/
2. Create or open your project
3. Settings ⚙️ → Project Settings
4. Copy this config:
```javascript
apiKey: "YOUR_KEY",
authDomain: "PROJECT.firebaseapp.com",
projectId: "PROJECT",
storageBucket: "PROJECT.appspot.com",
messagingSenderId: "SENDER_ID",
appId: "APP_ID"
```

## Step 2: Update config.js (1 min)

Open `js/config.js` and replace with your Firebase credentials:
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

## Step 3: Create GitHub Repo (1 min)

1. Go to https://github.com/new
2. Name: `gss-exam-system`
3. Select "Public"
4. Click "Create repository"

## Step 4: Deploy to GitHub (1 min)

Open PowerShell in your project folder and run:

```powershell
git init
git add .
git commit -m "GSS Exam System"
git remote add origin https://github.com/YOUR_USERNAME/gss-exam-system.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 5: Enable GitHub Pages (1 min)

Your repo → Settings → Pages:
- Source: "Deploy from a branch"
- Branch: "main"
- Folder: "/ (root)"

Wait 1 minute...

## Your System is LIVE! 🎉

Access at: `https://YOUR_USERNAME.github.io/gss-exam-system/`

## Login Details

- **Mobile**: 9919199848
- **Password**: password123

## What to Do First

1. Login with above credentials
2. Go to `/admin.html` and import your data:
   - Import Students
   - Import Class Subjects
   - Import Exams
3. Create teacher accounts in admin panel
4. Share the link with teachers!

## Troubleshooting

### 404 Error?
- Wait 2 minutes for GitHub Pages to build

### Firebase errors?
- Check config.js has your actual credentials
- Check Firestore database exists

### Can't login?
- Go to admin panel
- Create user with mobile + password

---

**Need detailed guide?** → Read `GITHUB_DEPLOYMENT.md`

**Need technical details?** → Read `README.md`