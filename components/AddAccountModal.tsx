import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, KeyRound, Activity } from 'lucide-react';

interface AddAccountModalProps {
  isLoggingIn: boolean;
  loginError: string | null;
  onLogin: (username: string) => void;
  onClose: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isLoggingIn,
  loginError,
  onLogin,
  onClose,
}) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.replace('@', '').trim().toLowerCase();
    if (clean) onLogin(clean);
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-start justify-center pt-20">
      <div className="bg-white rounded-xl shadow-xl w-[320px] p-5 mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800">Add Account</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Hive Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="username"
                autoFocus
                className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {loginError && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{loginError}</p>
          )}

          <button
            type="submit"
            disabled={isLoggingIn || !username.trim()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg font-medium text-sm transition-all"
          >
            {isLoggingIn ? <Activity size={15} className="animate-spin" /> : <KeyRound size={15} />}
            {isLoggingIn ? 'Verifying...' : 'Login with Keychain'}
          </button>

          <p className="text-[10px] text-center text-slate-400">
            Requires Hive Keychain extension to be installed and unlocked.
          </p>
        </form>
      </div>
    </div>,
    document.body
  );
};
