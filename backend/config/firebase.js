import admin from 'firebase-admin';

let firebaseInitialized = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('Firebase Admin initialized with service account credentials.');
  } else if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    firebaseInitialized = true;
    console.log(`Firebase Admin initialized with Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
  } else {
    console.log('Firebase Admin: No service account credentials found. Demo/development auth mode enabled.');
  }
} catch (err) {
  console.warn('Firebase Admin initialization notice:', err.message);
}

export { admin, firebaseInitialized };
