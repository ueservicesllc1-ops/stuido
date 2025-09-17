// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "studio-6535297076-d41dd",
  "appId": "1:422491258476:web:30cb91a9f529989b56a249",
  "storageBucket": "studio-6535297076-d41dd.appspot.com",
  "apiKey": "AIzaSyA-LyWDGq-VnM1WwbkwtD0x8cOD6L7tIc0",
  "authDomain": "studio-6535297076-d41dd.firebaseapp.com",
  "measurementId": "G-5G12932W8E",
  "messagingSenderId": "422491258476"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Si estamos en desarrollo, conectamos al emulador
if (process.env.NODE_ENV === 'development') {
    try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log("🔥 Conectado al emulador de Firestore en localhost:8080");
    } catch (e) {
        console.warn("⚠️ No se pudo conectar al emulador de Firestore. ¿Está corriendo? `firebase emulators:start`");
    }
}


export { app, db };
