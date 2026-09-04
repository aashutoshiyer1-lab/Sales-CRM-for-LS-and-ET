import React, { useState } from 'react';
import { Lock, Gamepad2, Key, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

export const LoginView = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (username.trim() === 'admin' && password === 'admin1') {
        onLoginSuccess();
      } else {
        setError('Invalid username or password. Use admin / admin1.');
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      
      {/* Decorative Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl mb-4">
            <div className="p-2.5 rounded-xl bg-red-950/80 text-amber-400 border border-amber-500/30">
              <Lock className="w-6 h-6" />
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
              <Gamepad2 className="w-6 h-6" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Sales CRM Portal
          </h1>
          <p className="text-sm text-slate-400 mt-2 font-medium">
            Escape Time & Laser Shooter Venue Management
          </p>
        </div>

        {/* Login Form Card */}
        <div className="glass-panel rounded-3xl p-8 shadow-2xl border border-slate-800/80 relative">
          
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username (admin)"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (admin1)"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>
            </div>

            {/* Quick Demo Credentials Info */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between font-mono">
              <span className="text-slate-500">Demo Access:</span>
              <span className="text-amber-400 font-semibold">admin / admin1</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400 hover:from-cyan-300 hover:to-amber-300 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Powered by Firebase Firestore & React CRM Engine
        </p>

      </div>
    </div>
  );
};
