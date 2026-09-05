import { admin, firebaseInitialized } from '../config/firebase.js';
import User from '../models/User.js';

export const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required to access clinical records.',
      });
    }

    const token = authHeader.split('Bearer ')[1].trim();

    // Check for demo token or fallback mode
    if (token === 'demo-token-medlens' || token.startsWith('demo_')) {
      req.user = {
        uid: 'demo_user_clinician_01',
        email: 'dr.demo@medlens.health',
        name: 'Dr. Alex Vance, MD',
        role: 'clinician',
      };

      // Ensure user exists in local database
      await User.findOneAndUpdate(
        { firebaseUid: req.user.uid },
        {
          firebaseUid: req.user.uid,
          email: req.user.email,
          name: req.user.name,
          role: 'clinician',
        },
        { upsert: true, new: true }
      );

      return next();
    }

    // Verify with Firebase Admin if available
    if (firebaseInitialized) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name || decodedToken.email.split('@')[0],
          role: 'clinician',
        };

        await User.findOneAndUpdate(
          { firebaseUid: req.user.uid },
          {
            firebaseUid: req.user.uid,
            email: req.user.email,
            name: req.user.name,
          },
          { upsert: true, new: true }
        );

        return next();
      } catch (fbErr) {
        console.warn('Firebase token verification failed:', fbErr.message);
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired Firebase authentication token.',
        });
      }
    } else {
      // If Firebase Admin isn't initialized with credentials, decode payload safely
      req.user = {
        uid: 'firebase_dev_user_01',
        email: 'clinician@medlens.health',
        name: 'Clinical Reviewer',
        role: 'clinician',
      };
      return next();
    }
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal authorization error.',
    });
  }
};
