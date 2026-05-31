'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      redirect: false,
      username,
      password
    });

    if (result?.error) {
      setError('Invalid username or password');
      setLoading(false);
    } else {
      // Role redirection happens in the layout/middleware, but we can force a push here
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212]">
      <div className="card w-full max-w-md p-8">
        <div className="flex flex-col items-center justify-center mb-8">
           <div className="bg-red-500/10 p-4 rounded-full mb-4">
              <Lock className="text-red-500 w-8 h-8" />
           </div>
           <h1 className="text-2xl font-bold text-white text-center tracking-tight">
             <span className="text-red-500">VARSHNEY</span> ELECTRICAL INDUSTRIES
           </h1>
           <p className="text-gray-400 mt-2">Secure ERP Portal</p>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-500 text-red-500 p-3 rounded mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Username</label>
            <input
              type="text"
              className="input-field w-full"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              className="input-field w-full"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 font-bold flex justify-center items-center"
          >
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
