// Firebase configuration for PolePlantingApp
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

// Using same Firebase project as FibreFlow
const firebaseConfig = {
  apiKey: "AIzaSyCdpp9ViBcfb37o4V2_OCzWO9nUhCiv9Vc",
  authDomain: "fibreflow-73daf.firebaseapp.com",
  projectId: "fibreflow-73daf",
  storageBucket: "fibreflow-73daf.firebasestorage.app",
  messagingSenderId: "296054249427",
  appId: "1:296054249427:web:2f0d6482daa6beb0624126",
  measurementId: "G-J0P7YRLGPW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with cache settings (new API)
export const db = initializeFirestore(app, {
  cache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Initialize other services
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;