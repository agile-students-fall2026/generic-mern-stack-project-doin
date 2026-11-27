import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { registerAccount } from "../api";
import useSubmission from "../useSubmission";
import "./Auth.css";

export default function Register({ onUserChange }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
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

    if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Please enter your full name.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Please enter a valid email address.";
    }

    const password = formData.password;

    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[^A-Za-z0-9]/.test(password)
    ) {
      newErrors.password =
        "Password must have at least 8 characters, one uppercase letter, one number, and one special character.";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(newErrors);

    const firstInvalid = Object.keys(newErrors)[0];
    if (firstInvalid) {
      const input = event.currentTarget.elements.namedItem(firstInvalid);
      requestAnimationFrame(() => input?.focus());
      return;
    }

    const fields = {
      name: formData.fullName.trim(),
      email: formData.email.trim(),
      password,
    };
    submit(
      (signal) => registerAccount(fields, signal),
      (user) => {
        onUserChange(user);
        navigate("/select-interests");
      },
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-container">
        <header className="auth-header">
          <h1>Create an account</h1>
        </header>

        <form
          className="auth-form"
          action="/api/auth/register"
          method="post"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="auth-field">
            <label className="doin-label" htmlFor="fullName">Full name</label>
            <input
              className="doin-input"
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Your full name"
              autoComplete="name"
              value={formData.fullName}
              onChange={handleChange}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "register-name-error" : undefined}
            />
            {errors.fullName && (
              <p id="register-name-error" className="doin-field-error" role="alert">
                {errors.fullName}
              </p>
            )}
          </div>

          <div className="auth-field">
            <label className="doin-label" htmlFor="email">Email</label>
            <input
              className="doin-input"
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "register-email-error" : undefined}
            />
            {errors.email && (
              <p id="register-email-error" className="doin-field-error" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div className="auth-field">
            <label className="doin-label" htmlFor="password">Password</label>
            <input
              className="doin-input"
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "register-password-error" : undefined}
            />
            {errors.password && (
              <p id="register-password-error" className="doin-field-error" role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <div className="auth-field">
            <label className="doin-label" htmlFor="confirmPassword">Confirm password</label>
            <input
              className="doin-input"
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Enter your password again"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={handleChange}
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? "register-confirm-error" : undefined}
            />
            {errors.confirmPassword && (
              <p id="register-confirm-error" className="doin-field-error" role="alert">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {error && <p className="doin-field-error" role="alert">{error}</p>}

          <div className="auth-actions">
            <button
              type="submit"
              className="doin-button doin-button--primary auth-primary-button"
              aria-busy={pending}
              disabled={pending}
            >
              {pending ? "Creating account…" : "Continue"}
            </button>

            <p className="auth-switch">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
