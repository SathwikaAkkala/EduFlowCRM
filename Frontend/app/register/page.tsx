// app/register/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { Zap, User, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(name, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-glow">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink-1">KALNET CRM</h1>
            <p className="text-[11px] font-mono text-ink-4">Create Account</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface-1 border border-ink-5 rounded-2xl p-8 shadow-card">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-ink-1">Create your account</h2>
            <p className="text-sm text-ink-4 mt-1">Get started with KALNET CRM</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-danger-muted border border-danger-border rounded-lg px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-danger shrink-0" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-3 uppercase tracking-wider font-mono">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-5 pointer-events-none" />
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full bg-surface-3 border border-ink-5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-ink-1 placeholder:text-ink-5 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-3 uppercase tracking-wider font-mono">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-5 pointer-events-none" />
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-surface-3 border border-ink-5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-ink-1 placeholder:text-ink-5 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-3 uppercase tracking-wider font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-5 pointer-events-none" />
                <input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  className="w-full bg-surface-3 border border-ink-5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-ink-1 placeholder:text-ink-5 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-colors"
                />
              </div>
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-400 text-white font-medium text-sm py-2.5 rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-sm"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-ink-4">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-brand-400 hover:text-brand-300 font-medium transition-colors"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-ink-5 font-mono mt-6">
          KALNET CRM · Internal Use Only
        </p>
      </div>
    </div>
  );
}

