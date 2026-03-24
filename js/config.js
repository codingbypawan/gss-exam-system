// Firebase Configuration
// Get these values from Firebase Console > Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyAUATW7C8Dl74Hdhy2jW7R797BzDuBxqwE",
  authDomain: "gss-examination.firebaseapp.com",
  projectId: "gss-examination",
  storageBucket: "gss-examination.firebasestorage.app",
  messagingSenderId: "148049572817",
  appId: "1:148049572817:web:9ce2ed30e0e9de5c7d26f0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Enable offline persistence
db.enablePersistence().catch((err) => {
  if (err.code == 'failed-precondition') {
    console.log('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
  } else if (err.code == 'unimplemented') {
    console.log('The current browser does not support persistence.');
  }
});
