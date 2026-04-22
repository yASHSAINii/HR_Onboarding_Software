import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setPassword: setNewPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await setNewPassword(password, confirmPassword);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to set password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-indigo-700 p-5">
      <div className="bg-white rounded-12px shadow-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-dark mb-2">Set Your Password</h2>
        <p className="text-gray-500 text-center mb-6">Choose a strong password for your account.</p>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2 mb-4">
            <label className="font-medium text-sm text-gray-700">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="p-3 border border-gray-light rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-2 mb-4">
            <label className="font-medium text-sm text-gray-700">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="p-3 border border-gray-light rounded-lg focus:outline-none focus:border-primary"
            />
          </div>
          {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
          <button
            className="w-full bg-rose-800 text-white border border-gray-light py-2.5 px-4 rounded-12px font-semibold text-base cursor-pointer transition-all duration-300 hover:bg-rose-900 disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Setting...' : 'Set Password & Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;