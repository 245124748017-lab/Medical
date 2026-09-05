// User-friendly conversion of Firebase and authentication error codes
export const formatAuthError = (error) => {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const code = error.code || '';
  const message = error.message || '';

  if (code === 'auth/invalid-credential' || message.includes('auth/invalid-credential')) {
    return 'Email or password is incorrect. Please verify your credentials.';
  }
  if (code === 'auth/user-not-found' || message.includes('auth/user-not-found')) {
    return 'No clinical reviewer account found with this email address.';
  }
  if (code === 'auth/wrong-password' || message.includes('auth/wrong-password')) {
    return 'Email or password is incorrect.';
  }
  if (code === 'auth/email-already-in-use' || message.includes('auth/email-already-in-use')) {
    return 'An account already exists with this email address. Please sign in instead.';
  }
  if (code === 'auth/weak-password' || message.includes('auth/weak-password')) {
    return 'Password is too weak. Please use at least 6 characters with a combination of letters and numbers.';
  }
  if (code === 'auth/invalid-email' || message.includes('auth/invalid-email')) {
    return 'Please enter a valid work email address.';
  }
  if (code === 'auth/too-many-requests' || message.includes('auth/too-many-requests')) {
    return 'Too many unsuccessful attempts. Access is temporarily restricted for security; please try again shortly.';
  }
  if (code === 'auth/popup-closed-by-user' || message.includes('auth/popup-closed-by-user')) {
    return 'Google authentication was cancelled before completing.';
  }
  if (code === 'auth/operation-not-allowed' || message.includes('auth/operation-not-allowed')) {
    return 'Email/password sign-in is not enabled in Firebase Console.';
  }
  if (code === 'auth/unauthorized-domain' || message.includes('auth/unauthorized-domain')) {
    return 'Current domain is not authorized in Firebase Authentication authorized domains.';
  }

  // Safe fallback stripping any raw stack traces or internal tokens
  return 'Authentication could not be completed. Please check your credentials and try again.';
};
