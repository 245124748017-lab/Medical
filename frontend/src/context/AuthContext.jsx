import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  isConfigured,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
} from '../services/firebase.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for persistent demo session
    const savedDemo = localStorage.getItem('medlens_demo_user');
    if (savedDemo) {
      try {
        setCurrentUser(JSON.parse(savedDemo));
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('medlens_demo_user');
      }
    }

    if (auth && isConfigured) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const token = await user.getIdToken();
          localStorage.setItem('medlens_auth_token', token);
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL,
            role: 'clinician',
            isDemo: false,
          });
        } else {
          localStorage.removeItem('medlens_auth_token');
          setCurrentUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const loginWithEmail = async (email, password) => {
    if (isConfigured && auth) {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const token = await res.user.getIdToken();
      localStorage.setItem('medlens_auth_token', token);
      return res.user;
    } else {
      // Fallback demo login if Firebase keys not configured
      return loginWithDemo(email);
    }
  };

  const signupWithEmail = async (email, password) => {
    if (isConfigured && auth) {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const token = await res.user.getIdToken();
      localStorage.setItem('medlens_auth_token', token);
      return res.user;
    } else {
      return loginWithDemo(email);
    }
  };

  const loginWithGoogle = async () => {
    if (isConfigured && auth) {
      const res = await signInWithPopup(auth, googleProvider);
      const token = await res.user.getIdToken();
      localStorage.setItem('medlens_auth_token', token);
      return res.user;
    } else {
      return loginWithDemo('google.clinician@medlens.health');
    }
  };

  const loginWithDemo = (customEmail = null) => {
    const demoUser = {
      uid: 'demo_user_clinician_01',
      email: customEmail || 'dr.alex.vance@medlens.health',
      displayName: 'Dr. Alex Vance, MD',
      role: 'clinician',
      isDemo: true,
    };
    localStorage.setItem('medlens_auth_token', 'demo-token-medlens');
    localStorage.setItem('medlens_demo_user', JSON.stringify(demoUser));
    setCurrentUser(demoUser);
    return demoUser;
  };

  const logout = async () => {
    localStorage.removeItem('medlens_auth_token');
    localStorage.removeItem('medlens_demo_user');
    if (auth && isConfigured) {
      await fbSignOut(auth);
    }
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isAuthenticated: !!currentUser,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        loginWithDemo,
        logout,
        isFirebaseConfigured: isConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
