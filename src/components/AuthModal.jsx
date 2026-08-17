import React, { useState } from 'react';
import { Key, ShieldCheck, Lock, ExternalLink, AlertCircle } from 'lucide-react';
import { validateToken } from '../services/githubClient';

export default function AuthModal({ onAuthenticate }) {
  const [token, setToken] = useState(() => localStorage.getItem('vault_github_pat') || '');
  const [owner, setOwner] = useState(() => localStorage.getItem('vault_github_owner') || 'corymacculloch-wq');
  const [repo, setRepo] = useState(() => localStorage.getItem('vault_github_repo') || 'Vault');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('Please enter a GitHub Personal Access Token.');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await validateToken(token.trim());
    setLoading(false);

    if (result.valid) {
      localStorage.setItem('vault_github_pat', token.trim());
      localStorage.setItem('vault_github_owner', owner.trim());
      localStorage.setItem('vault_github_repo', repo.trim());
      onAuthenticate({ token: token.trim(), owner: owner.trim(), repo: repo.trim() });
    } else {
      setError(result.error || 'Authentication failed. Please check your token.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100">
        <div className="flex items-center gap-3 mb-4 text-indigo-400">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Vault Authentication</h2>
            <p className="text-xs text-slate-400">Connect to your private GitHub repository</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">GitHub Owner / Username</label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="corymacculloch-wq"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Repository Name</label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="Vault"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
              <span>Personal Access Token (PAT)</span>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=VaultTaskCockpit"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 text-[11px]"
              >
                Create Token <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="relative">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                required
              />
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Token requires <code className="text-slate-400 bg-slate-950 px-1 py-0.5 rounded">repo</code> permission to read and commit task Markdown files.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Connect Private Vault</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500">
            🔒 Token is stored locally in your browser&apos;s encrypted <code className="text-slate-400">localStorage</code> and never sent to third-party servers.
          </p>
        </div>
      </div>
    </div>
  );
}
