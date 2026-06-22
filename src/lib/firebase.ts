import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  linkWithPopup,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocFromServer,
  writeBatch,
  enableIndexedDbPersistence,
  type Firestore,
  type CollectionReference,
} from 'firebase/firestore';
import { logDebug, logError, logWarn } from './utils';
import { initAppCheck, isAppCheckConfigured } from './appCheck';

export { initAppCheck, isAppCheckConfigured };

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const PLACEHOLDER_VALUES = new Set(['sua_api_key', 'your_api_key', '']);

const missingKeys = (Object.entries(firebaseConfig) as [string, string | undefined][])
  .filter(([, value]) => !value || PLACEHOLDER_VALUES.has(value))
  .map(([key]) => key);

export const isFirebaseValid = missingKeys.length === 0;

if (!isFirebaseValid) {
  logError(
    'Firebase',
    'Configuração incompleta. Variáveis ausentes ou com placeholder:',
    missingKeys,
    '\n→ Copie .env.example para .env e preencha todas as VITE_FIREBASE_*'
  );
} else {
  logDebug('Firebase', 'Configuração OK', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
  });
}

const app = initializeApp(firebaseConfig);

if (isFirebaseValid) {
  initAppCheck(app);
}

export const auth = getAuth(app);
auth.languageCode = 'pt-BR';
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

console.log('[DMX:Firebase] Inicializado', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  isValid: isFirebaseValid,
});

logDebug('Firebase', 'Firestore inicializado para projeto:', firebaseConfig.projectId);

if (isFirebaseValid) {
  enableIndexedDbPersistence(db).catch((err: { code?: string }) => {
    logWarn('Firebase', 'Modo offline não suportado neste navegador.', err.code);
  });
}

export const fbCollection = (dbInstance: Firestore, ...path: string[]) =>
  collection(dbInstance, path[0], ...path.slice(1));

export const fbDoc = (dbInstance: Firestore | CollectionReference, ...path: string[]) => {
  if (path.length === 0 && 'type' in dbInstance && dbInstance.type === 'collection') {
    return doc(dbInstance as CollectionReference);
  }
  if ('type' in dbInstance && dbInstance.type === 'collection') {
    return doc(dbInstance as CollectionReference, path[0], ...path.slice(1));
  }
  return doc(dbInstance as Firestore, path[0], ...path.slice(1));
};

export {
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  getDocFromServer,
  writeBatch,
  onAuthStateChanged,
  onIdTokenChanged,
};
export type { User };

export const fb = {
  db,
  auth,
  isValid: isFirebaseValid,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  linkWithPopup,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  googleProvider,
  sendPasswordResetEmail,
};
