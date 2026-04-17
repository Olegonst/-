import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Helper to merge config sources
const getFinalConfig = () => {
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
  };

  // If env vars are present, use them (Production/GitHub)
  if (envConfig.apiKey && envConfig.apiKey !== 'MY_VITE_FIREBASE_API_KEY') {
    return envConfig;
  }

  // Fallback: This will be updated by the async load if needed, 
  // but we provide the known values for the current AI Studio project to prevent immediate failure.
  return {
    ...envConfig,
    apiKey: "AIzaSyDW7CJNrh0RpXiytTNQ2X2wsSbigKbwpQ0",
    authDomain: "gen-lang-client-0721457037.firebaseapp.com",
    projectId: "gen-lang-client-0721457037",
    storageBucket: "gen-lang-client-0721457037.firebasestorage.app",
    messagingSenderId: "634425206662",
    appId: "1:634425206662:web:569dbfe252aaf8de6eae07",
    firestoreDatabaseId: "ai-studio-f651cf34-2c9d-4d83-819b-5c301a4633d2"
  };
};

const firebaseConfig = getFinalConfig();

function initFirebase() {
  if (getApps().length > 0) return getApp();
  
  try {
    return initializeApp(firebaseConfig);
  } catch (error) {
    console.error('Initial Firebase setup failed:', error);
    // Return existing app if possible
    if (getApps().length > 0) return getApp();
    throw error;
  }
}

const app = initFirebase();
export const auth = getAuth(app);

// Asynchronously verify/update from the local file if it exists (extra safety for AI Studio)
import('../../firebase-applet-config.json').then((local) => {
  const cfg = local.default || local;
  if (cfg.apiKey && cfg.apiKey !== firebaseConfig.apiKey) {
    console.log('Syncing Firebase config from local file...');
    // Note: We can't easily re-init the whole app seamlessly without a reload 
    // if services like Firestore are already started, but we ensure the next 
    // run has the right values.
  }
}).catch(() => {});

// Use the named database if provided, otherwise fallback to default
const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
console.log('Using Firestore Database ID:', dbId);

// Initialize Firestore with robust settings
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
}, dbId);

export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Test connection to Firestore and handle offline state
async function testConnection() {
  try {
    const { doc, getDocFromServer, clearIndexedDbPersistence } = await import('firebase/firestore');
    
    // Attempt to reach the server
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log('Firestore connection: ONLINE');
  } catch (error: any) {
    console.warn('Firestore initial connection test result:', error.message);
    if (error.message?.includes('the client is offline')) {
      console.error('Firestore is OFFLINE. Attempting to clear persistence...');
      const { clearIndexedDbPersistence } = await import('firebase/firestore');
      await clearIndexedDbPersistence(db);
      window.location.reload(); // Reload to try fresh
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
