import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseApp } from 'firebase/app';

export const auth: Auth;
export const db: Firestore;
export const storage: FirebaseStorage;
export const app: FirebaseApp;
