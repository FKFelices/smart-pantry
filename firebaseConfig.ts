import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';
// @ts-ignore: Known Firebase typing mismatch.
import { getReactNativePersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAMg3PqO9Yd37EEEThuR7GE5Wr97YM0Q8U",
  authDomain: "smart-pantry-production.firebaseapp.com",
  projectId: "smart-pantry-production",
  storageBucket: "smart-pantry-production.firebasestorage.app",
  messagingSenderId: "168082337730",
  appId: "1:168082337730:web:afae5c62c9b17cf2f0305b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// THE CROSS-PLATFORM FIX:
// If on the web, use the standard getAuth(). 
// If on a phone, use the custom AsyncStorage persistence.
export const auth = Platform.OS === 'web' 
  ? getAuth(app) 
  : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });