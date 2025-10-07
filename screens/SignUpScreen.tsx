import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layouts/AuthLayout';
import InputField from '../components/common/InputField';
import Button from '../components/common/Button';
import { useData } from '../contexts/DataContext';

const GoogleIcon: React.FC = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.19,4.73C14.03,4.73 15.69,5.36 16.95,6.58L19.05,4.58C17.22,2.91 14.88,2 12.19,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.19,22C17.6,22 21.54,18.33 21.54,12.29C21.54,11.76 21.48,11.43 21.35,11.1Z"></path></svg>
);
const AppleIcon: React.FC = () => (
    <svg className="h-6 w-6" viewBox="0 0 24 24"><path fill="currentColor" d="M19.1,12.87c0-2,.83-3.6,2.2-4.71a.51.51,0,0,0,.1-.55,4.48,4.48,0,0,0-3.3-2.07c-1.3-.11-2.91.56-3.71,1.44a4.1,4.1,0,0,0-1.4,3.1,3.42,3.42,0,0,0,1,2.44,3.23,3.23,0,0,0,2.1,1.15.5.5,0,0,0,.4-.13,3.74,3.74,0,0,0,1.3-2.73m-4-6.41c.81-.88,1.62-1.4,2.81-1.46a4.34,4.34,0,0,1,1.61.29,3.8,3.8,0,0,0-3.1,3.12,3.94,3.94,0,0,0,1.4,2.83c.8.9,1.5,1.5,2.9,1.5a2.58,2.58,0,0,0,1.6-.51,4.5,4.5,0,0,1-3.7,2.57,4.8,4.8,0,0,1-4.2-2.4c-2.3-3.71-.8-8,1.4-10.38"></path></svg>
);

const SignUpScreen: React.FC = () => {
    const navigate = useNavigate();
    const { signup } = useData();
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }
        if (username.length < 3) {
            setError("Username must be at least 3 characters long.");
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            await signup(email, password, fullName, username);
            alert('Sign up successful! Please check your email to confirm your account.');
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Failed to sign up.');
        } finally {
            setLoading(false);
        }
    };

  return (
    <AuthLayout title="Create a New Account">
      <form className="space-y-4" onSubmit={handleSignUp}>
        <InputField id="fullName" label="Full Name" type="text" placeholder="John Doe" required value={fullName} onChange={e => setFullName(e.target.value)} />
        <InputField id="username" label="Username" type="text" placeholder="johndoe" required value={username} onChange={e => setUsername(e.target.value)} />
        <InputField id="email" label="Email" type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
        <InputField id="password" label="Password" type="password" placeholder="••••••••" required value={password} onChange={e => setPassword(e.target.value)} />
        <InputField id="confirm-password" label="Confirm Password" type="password" placeholder="••••••••" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        {error && <p className="text-[var(--color-functional-red)] text-xs text-center">{error}</p>}
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Signing up...' : 'Sign Up'}
        </Button>
      </form>
      
      <div className="my-4 flex items-center">
          <div className="flex-grow border-t border-[var(--color-border)]"></div>
          <span className="mx-4 text-xs text-[var(--color-text-secondary)]">Or sign up with</span>
          <div className="flex-grow border-t border-[var(--color-border)]"></div>
      </div>

      <div className="space-y-3">
          <Button variant="social" onClick={() => alert('Social login not implemented yet.')}><GoogleIcon /><span>Sign up with Google</span></Button>
          <Button variant="social" onClick={() => alert('Social login not implemented yet.')}><AppleIcon /><span>Sign up with Apple</span></Button>
      </div>

      <p className="mt-6 text-center text-xs text-[var(--color-text-secondary)]">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-[var(--color-primary-500)] hover:opacity-80">
          Log In
        </Link>
      </p>
    </AuthLayout>
  );
};

export default SignUpScreen;