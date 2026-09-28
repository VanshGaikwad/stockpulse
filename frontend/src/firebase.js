// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDdhzAn1tB7Nm3kF48RnpyDHKtvMPZwm1c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "zycus-hackathon.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "zycus-hackathon",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "zycus-hackathon.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "159395198853",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:159395198853:web:29b80032782eade86576ec"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

console.log("[Firebase] Frontend connected to Firebase project:", firebaseConfig.projectId);
