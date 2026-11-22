import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { logIn } from "../api";
import { signedInPath } from "../useSession";
import useSubmission from "../useSubmission";
import "./Auth.css";

export default function Login({ onUserChange }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [resetMessage, setResetMessage] = useState("");
  const { pending, error, setError, submit } = useSubmission();

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    const newErrors = {};

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!formData.password) {
      newErrors.password = "Please enter your password.";
    }

    setErrors(newErrors);

    const firstInvalid = Object.keys(newErrors)[0];
    if (firstInvalid) {
      const input = event.currentTarget.elements.namedItem(firstInvalid);
      requestAnimationFrame(() => input?.focus());
      return;
    }

    const credentials = { email: formData.email.trim(), password: formData.password };
    submit(
      (signal) => logIn(credentials, signal),
      (user) => {
        onUserChange(user);
        navigate(signedInPath(user));
      },
    );
  }

  function handleForgotPassword() {
    setResetMessage(
      "Password reset will be available when account services are connected.",
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-container">
        <header className="auth-header">
          <h1>Welcome back</h1>
        </header>

        <form
          className="auth-form"
          action="/api/auth/login"
          method="post"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="auth-field">
            <label htmlFor="login-email">Email</label>
            <input
              className="doin-input"
              id="login-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "login-email-error" : undefined}
            />

            {errors.email && (
              <p id="login-email-error" className="auth-error" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <input
              className="doin-input"
              id="login-password"
              name="password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "login-password-error" : undefined}
            />

            {errors.password && (
              <p id="login-password-error" className="auth-error" role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <div className="auth-forgot">
            <button type="button" onClick={handleForgotPassword}>
              Forgot password?
            </button>
          </div>

          {resetMessage && (
            <p className="auth-notice" role="status">
              {resetMessage}
            </p>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}

          <div className="auth-actions">
            <button
              type="submit"
              className="doin-button doin-button--primary auth-primary-button"
              disabled={pending}
            >
              {pending ? "Logging in…" : "Log in"}
            </button>

            <p className="auth-switch">
              New to Doin? <Link to="/register">Create an account</Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
