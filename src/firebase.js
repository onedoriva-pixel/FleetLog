import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAEh6ihFtU3lMXp-XVPwlX71b3jkVReNH4",
  authDomain: "travelschedule-f31ae.firebaseapp.com",
  projectId: "travelschedule-f31ae",
  storageBucket: "travelschedule-f31ae.firebasestorage.app",
  messagingSenderId: "240872829259",
  appId: "1:240872829259:web:14210a8333dea3df02f8ce",
  measurementId: "G-WG1NVQ9JZ4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
