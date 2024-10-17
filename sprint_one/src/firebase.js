// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics";
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCYITdhyPNQpmNivDuF8KB5X96ujFlnArQ",
  authDomain: "cosmic-war-61067.firebaseapp.com",
  projectId: "cosmic-war-61067",
  storageBucket: "cosmic-war-61067.appspot.com",
  messagingSenderId: "549692016235",
  appId: "1:549692016235:web:f9ca791fcd74c95d1b532e",
  measurementId: "G-0YMSH10CJM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {auth, storage};


