// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA2787iOsA2kcVrpQWWo0ah0JOsRyh5KPc",
  authDomain: "ipro-7c4de.firebaseapp.com",
  projectId: "ipro-7c4de",
  storageBucket: "ipro-7c4de.firebasestorage.app",
  messagingSenderId: "166429737945",
  appId: "1:166429737945:web:b0a7235da647bd82fd0fc8",
  measurementId: "G-6VQXVMCHZ5"
};

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)