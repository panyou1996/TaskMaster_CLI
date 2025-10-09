import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/layouts/AuthLayout';
import InputField from '../components/common/InputField';
import Button from '../components/common/Button';
import { useData } from '../contexts/DataContext';

const ResetPasswordScreen: React.FC = () => {
  const navigate = useNavigate();
  const { resetPassword } = useData();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await resetPassword(email);
      setMessage('Password reset link sent! Please check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset Your Password">
      <p className="text-center text-xs text-[var(--color-text-secondary)] -mt-4 mb-4">
        Enter your email and we'll send you a link to get back into your account.
      </p>
      <form className="space-y-4" onSubmit={handleSendLink}>
        <InputField id="email" label="Email" type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
        {message && <p className="text-green-600 dark:text-green-400 text-xs text-center">{message}</p>}
        {error && <p className="text-[var(--color-functional-red)] text-xs text-center">{error}</p>}
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-[var(--color-text-secondary)]">
        <Link to="/login" className="font-medium text-[var(--color-primary-500)] hover:opacity-80">
          Back to Login
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ResetPasswordScreen;