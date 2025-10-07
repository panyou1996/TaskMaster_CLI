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
      <p className="text-center text-sm text-gray-600 -mt-4 mb-6">
        Enter your email and we'll send you a link to get back into your account.
      </p>
      <form className="space-y-6" onSubmit={handleSendLink}>
        <InputField id="email" label="Email" type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
        {message && <p className="text-green-600 text-sm text-center">{message}</p>}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-gray-600">
        <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Back to Login
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ResetPasswordScreen;