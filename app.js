// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBy9oymFpaG0UIs9R1J8lw1tkvM7nnh8qg",
  authDomain: "gasbygas-8724c.firebaseapp.com",
  projectId: "gasbygas-8724c",
  storageBucket: "gasbygas-8724c.firebasestorage.app",
  messagingSenderId: "965391687466",
  appId: "1:965391687466:web:660231aa0eef9151ef0853",
  measurementId: "G-98CPD8MRQZ"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
console.log("Firebase Initialized!...");

