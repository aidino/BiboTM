"use client";

import { useState, FormEvent } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        window.location.href = "/";
        return;
      }

      setError(data.error || "Login failed.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo / Brand */}
        <div className="login-brand">
          <div className="login-logo">
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                width="36"
                height="36"
                rx="10"
                fill="var(--action-bg)"
              />
              <path
                d="M10 18C10 13.5817 13.5817 10 18 10C22.4183 10 26 13.5817 26 18"
                stroke="var(--action-fg)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M14 18C14 15.7909 15.7909 14 18 14C20.2091 14 22 15.7909 22 18"
                stroke="var(--action-fg)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="18" cy="18" r="2" fill="var(--action-fg)" />
              <path
                d="M18 20V26"
                stroke="var(--action-fg)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h1 className="login-title">BiBoTM Studio</h1>
          <p className="login-subtitle">
            Sign in to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="login-password" className="login-label">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="login-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="login-error" role="alert">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="login-error-icon"
              >
                <circle
                  cx="8"
                  cy="8"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M8 4.5V8.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="8" cy="11" r="0.75" fill="currentColor" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={loading || !password.trim()}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              "Sign in"
            )}
          </button>
        </form>

      </div>

      <style>{`
        .login-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 1.5rem;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          border: 1px solid var(--panel-border);
          border-radius: var(--radius-container);
          background: var(--panel);
          box-shadow: var(--shadow-lg);
          padding: 2.5rem 2rem 2rem;
          animation: loginFadeIn 500ms cubic-bezier(0.2, 0.74, 0.2, 1) both;
        }

        @keyframes loginFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .login-brand {
          text-align: center;
          margin-bottom: 2rem;
        }

        .login-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .login-title {
          font-family: var(--font-display);
          font-size: 2rem;
          letter-spacing: 0.04em;
          color: var(--foreground);
          margin: 0 0 0.35rem;
          line-height: 1;
        }

        .login-subtitle {
          color: var(--muted-foreground);
          font-size: 0.85rem;
          margin: 0;
          line-height: 1.5;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .login-field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .login-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: color-mix(in oklch, var(--foreground) 82%, var(--muted-foreground) 18%);
          letter-spacing: 0.01em;
        }

        .login-input {
          width: 100%;
          height: 44px;
          padding: 0 0.85rem;
          font-size: 0.88rem;
          font-family: var(--font-mono);
          color: var(--foreground);
          border: 1px solid var(--sidebar-input-border);
          border-radius: var(--radius-small);
          background: var(--sidebar-input-bg);
          outline: none;
          transition:
            border-color 180ms ease,
            box-shadow 180ms ease;
        }

        .login-input::placeholder {
          color: var(--muted-foreground);
          opacity: 0.6;
        }

        .login-input:focus {
          border-color: color-mix(in oklch, var(--ring) 72%, var(--sidebar-input-border));
          box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 22%, transparent);
        }

        .login-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.85rem;
          font-size: 0.82rem;
          line-height: 1.4;
          color: var(--danger-soft-fg);
          background: var(--danger-soft-bg);
          border: 1px solid var(--danger-soft-border);
          border-radius: var(--radius-small);
          animation: loginShake 400ms ease;
        }

        .login-error-icon {
          flex-shrink: 0;
        }

        @keyframes loginShake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-3px); }
          40%, 60% { transform: translateX(3px); }
        }

        .login-submit {
          display: inline-flex;
          height: 44px;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-small);
          border: 1px solid var(--action-border);
          background: var(--action-bg);
          color: var(--action-fg);
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          cursor: pointer;
          transition:
            background-color 180ms ease,
            filter 180ms ease,
            opacity 180ms ease;
        }

        .login-submit:hover:not(:disabled) {
          background: var(--action-bg-hover);
        }

        .login-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .login-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid color-mix(in oklch, var(--action-fg) 30%, transparent);
          border-top-color: var(--action-fg);
          border-radius: 50%;
          animation: loginSpin 600ms linear infinite;
        }

        @keyframes loginSpin {
          to { transform: rotate(360deg); }
        }


      `}</style>
    </div>
  );
}
