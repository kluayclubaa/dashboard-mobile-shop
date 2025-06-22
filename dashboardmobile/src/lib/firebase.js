// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCHJCdKoWaOeM29Z8ubWWyULAXrvbTjb5s",
  authDomain: "ipro-a0e3a.firebaseapp.com",
  projectId: "ipro-a0e3a",
  storageBucket: "ipro-a0e3a.firebasestorage.app",
  messagingSenderId: "816977961038",
  appId: "1:816977961038:web:c2b1a6e7be95766462631f",
  measurementId: "G-GGBX7T7WGL"
};

let app;
// ตรวจสอบว่าแอปถูก initialize แล้วหรือยัง เพื่อป้องกันการสร้างซ้ำ
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0]; // ใช้แอปที่มีอยู่แล้ว
}
// Initialize Firebase
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };