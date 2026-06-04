"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Checkbox } from "primereact/checkbox";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get("from");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed. Please try again.");
        return;
      }

      router.push(from ?? data.redirectTo ?? "/");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <i className="pi pi-send" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)" }}>
              JP Tourism
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
              Travel Platform
            </div>
          </div>
        </div>

        <h1 className="login-title">Welcome back</h1>
        <p className="login-subtitle">
          Sign in to your account to continue
        </p>

        {error && (
          <Message
            severity="error"
            text={error}
            style={{ width: "100%", marginBottom: "1rem", borderRadius: "10px" }}
          />
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="login-field">
            <label htmlFor="email">Email address</label>
            <span className="p-input-icon-left" style={{ width: "100%" }}>
              <i className="pi pi-envelope" style={{ zIndex: 1 }} />
              <InputText
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                style={{ paddingLeft: "2.5rem" }}
              />
            </span>
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <Password
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              feedback={false}
              toggleMask
              required
              inputStyle={{ paddingLeft: "1rem" }}
            />
          </div>

          {/* Remember + Forgot */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.25rem",
            }}
          >
            <label
              htmlFor="remember"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              <Checkbox
                inputId="remember"
                checked={remember}
                onChange={(e) => setRemember(e.checked)}
              />
              Remember me
            </label>
            <a
              href="/forgot-password"
              style={{
                fontSize: "0.8rem",
                color: "var(--brand-primary)",
                textDecoration: "none",
              }}
            >
              Forgot password?
            </a>
          </div>

          <Button
            type="submit"
            label={loading ? "Signing in…" : "Sign in"}
            icon={loading ? "pi pi-spin pi-spinner" : "pi pi-arrow-right"}
            iconPos="right"
            loading={loading}
            className="btn-primary-gradient"
            id="btn-login-submit"
          />
        </form>

        {/* Footer */}
        <p
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          © {new Date().getFullYear()} JP Tourism Platform · All rights reserved
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
