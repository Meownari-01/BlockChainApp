import { auth } from "../firebase/config";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
  updatePassword
} from "firebase/auth";
import { db } from "../firebase/config";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  serverTimestamp,
  orderBy,
  limit
} from "firebase/firestore";

export const login = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const signup = async (email, password) => {
  try {
    const { createUserWithEmailAndPassword } = require("firebase/auth");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Resets the password using Firebase's standard email reset flow.
 */
export const resetUserPassword = async (email) => {
  try {
    console.log(`[AUTH] Attempting password reset for: ${email}`);
    await sendPasswordResetEmail(auth, email);
    console.log(`[AUTH] Firebase reported success for: ${email}`);
    return { success: true, error: null };
  } catch (error) {
    console.error(`[AUTH] Firebase Reset Error for ${email}:`, error.code, error.message);
    return { success: false, error: error.message };
  }
};
