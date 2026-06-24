"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { Zap, User, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { ROLES, type Role } from "@/lib/roles";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("agent");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await register(name, email, password, role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-0 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 shadow-glow">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink-1">EduFlow CRM</h1>
            <p className="font-mono text-[11px] text-ink-4">Create Account</p>
          </div>
        </div>

        <div className="rounded-2xl border border-ink-5 bg-surface-1 p-6 shadow-card sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-ink-1">Create your account</h2>
            <p className="mt-1 text-sm text-ink-4">Get started with EduFlow CRM</p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-danger-border bg-danger-muted px-4 py-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-danger" />
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs font-medium uppercase tracking-wider text-ink-3">
                Full Name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-5" />
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full rounded-lg border border-ink-5 bg-surface-3 py-2.5 pl-10 pr-4 text-sm text-ink-1 placeholder:text-ink-5 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs font-medium uppercase tracking-wider text-ink-3">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-5" />
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-ink-5 bg-surface-3 py-2.5 pl-10 pr-4 text-sm text-ink-1 placeholder:text-ink-5 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs font-medium uppercase tracking-wider text-ink-3">
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-5" />
                <input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-ink-5 bg-surface-3 py-2.5 pl-10 pr-4 text-sm text-ink-1 placeholder:text-ink-5 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="register-role" className="font-mono text-xs font-medium uppercase tracking-wider text-ink-3">
                Role
              </label>
              <select
                id="register-role"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-lg border border-ink-5 bg-surface-3 px-4 py-2.5 text-sm text-ink-1 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/30"
              >
                {ROLES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-ink-4">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-brand-400 transition-colors hover:text-brand-300">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-[11px] text-ink-5">
          EduFlow CRM · Internal Use Only
        </p>

        <div className="mt-4 flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-ink-5 bg-surface-1 px-4 py-2 text-sm font-medium text-ink-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-4 hover:bg-surface-2"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
