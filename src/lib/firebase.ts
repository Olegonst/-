import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Try to load config from file or environment variables
let firebaseConfig: any = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
};

// Only try to import the local file if we're in a dev environment OR if env vars aren't set
const loadLocalConfig = async () => {
  if (!firebaseConfig.apiKey) {
    try {
      // @ts-ignore
      const config = await import('../../firebase-applet-config.json');
      console.log('Successfully loaded local firebase-applet-config.json');
      return config.default || config;
    } catch (e) {
      console.warn('Local firebase-applet-config.json not found, using env vars');
    }
  }
  return null;
};

// Initialize with a dummy or existing values, then update
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Update config from local file if needed
loadLocalConfig().then(localConfig => {
  if (localConfig && localConfig.apiKey) {
    // Re-initialize or update references if needed (Firebase 9+ handles re-init better)
    // For simplicity in this app, we assume if it's not in env, it's in the file.
  }
});

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
