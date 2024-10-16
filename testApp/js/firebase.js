// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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