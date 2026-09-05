import admin from 'firebase-admin';

let firebaseInitialized = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    console.log('Firebase Admin initialized with service account JSON.');
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
    firebaseInitialized = true;
    console.log(`Firebase Admin initialized with individual credentials for Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
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
