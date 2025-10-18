import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCx9calMgJXkjAUvSXTTLyOBLbcZOEydwU",
  authDomain: "fit5032-final-haoyang.firebaseapp.com",
  projectId: "fit5032-final-haoyang",
  storageBucket: "fit5032-final-haoyang.firebasestorage.app",
  messagingSenderId: "588552046705",
  appId: "1:588552046705:web:a914ec2b5343a6590473d0",
  measurementId: "G-KHPZZXT9H6"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

console.log('firebase app options =', app.options)