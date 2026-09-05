import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Stethoscope, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginWithEmail, signupWithEmail, loginWithGoogle, loginWithDemo } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegistering) {
        await signupWithEmail(email, password);
        addToast('Account registered successfully.', 'success');
      } else {
        await loginWithEmail(email, password);
        addToast('Welcome back to MedLens.', 'success');
      }
      navigate('/app/dashboard');
    } catch (err) {
      addToast(err.message || 'Authentication failed. Please verify credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      addToast('Authenticated with Google.', 'success');
      navigate('/app/dashboard');
    } catch (err) {
      addToast(err.message || 'Google sign-in could not be completed.', 'error');
    }
  };

  const handleDemoLogin = () => {
    loginWithDemo();
    addToast('Signed in with Demo Clinician Profile.', 'success');
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-sm">
            <Stethoscope className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold text-slate-900 tracking-tight">MedLens</span>
        </Link>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          {isRegistering ? 'Create Clinical Reviewer Account' : 'Clinical Portal Sign In'}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          AI-Powered Clinical Information Intelligence & Verification
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-card border border-slate-200 rounded-2xl sm:px-10">
          {/* Quick 1-Click Demo Login Banner */}
          <div className="mb-6 p-4 rounded-xl bg-teal-50 border border-teal-200">
            <div className="flex items-center gap-2 text-teal-900 font-semibold text-xs mb-1">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>Hackathon Quick-Access</span>
            </div>
            <p className="text-xs text-teal-800 mb-3">
              Explore all features immediately with pre-loaded clinician credentials.
            </p>
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Launch Demo Access as Dr. Vance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400 font-medium">Or continue with credentials</span>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Work Email</label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="clinician@hospital.org"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : isRegistering ? 'Register Account' : 'Sign In'}
            </button>
          </form>

          {/* Google Login button */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            {isRegistering ? (
              <span>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegistering(false)}
                  className="font-semibold text-teal-600 hover:text-teal-500"
                >
                  Sign in here
                </button>
              </span>
            ) : (
              <span>
                New reviewer?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="font-semibold text-teal-600 hover:text-teal-500"
                >
                  Create an account
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
