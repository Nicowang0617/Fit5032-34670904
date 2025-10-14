import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD6GP9AVzLAavPFB_stJ2A6ZbbPT1egUrU",
  authDomain: "fit5032-final-haoyangwang.firebaseapp.com",
  projectId: "fit5032-final-haoyangwang",
  storageBucket: "fit5032-final-haoyangwang.firebasestorage.app",
  messagingSenderId: "573796189821",
  appId: "1:573796189821:web:9bc37f092c72b958149314"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

console.log("✅ Firebase initialized successfully:", app.name);