import { Link } from "react-router";
import "../pages/Auth.css";

export default function SessionBoundary({ session, onRetry, children }) {
  if (session.status !== "loading" && session.status !== "error") {
    return children;
  }

  return (
    <main className="auth-page">
      <div className="auth-container">
        {session.status === "loading" ? (
          <p className="auth-notice" role="status">Restoring your session…</p>
        ) : (
          <>
            <p className="auth-error" role="alert">{session.error}</p>
            <div className="auth-actions">
              <button
                type="button"
                className="doin-button doin-button--primary auth-primary-button"
                onClick={onRetry}
              >
                Retry
              </button>
              <p className="auth-switch"><Link to="/login">Log in</Link></p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
