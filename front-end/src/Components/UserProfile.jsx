import { useRef } from "react";
import "./UserProfile.css";
import BackButton from "./BackButton";

export default function UserProfile({
  title,
  name,
  username,
  location,
  bio,
  interests = [],
  imageUrl,
  stats = [],
  sharedInterests = [],
  children,
  onBack,
  backAriaLabel = "Go back",
}) {
  const photoDialog = useRef(null);

  return (
    <main className="user-profile-page doin-page">
      {onBack && <BackButton onClick={onBack} ariaLabel={backAriaLabel} />}

      <h1 className="doin-page-title">{title}</h1>

      <div className="user-profile-header">
        <button
          type="button"
          className="user-profile-photo-button"
          onClick={() => photoDialog.current?.showModal()}
          disabled={!imageUrl}
          aria-label={`View ${name}'s profile picture`}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="user-profile-photo" />
          ) : (
            <span className="user-profile-photo user-profile-photo-empty">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-5 3-8 8-8s8 3 8 8" />
              </svg>
            </span>
          )}
        </button>

        <div className="user-profile-identity">
          <h2 className="user-profile-name">{name}</h2>

          {username && (
            <p className="user-profile-username">
              @{username.replace(/^@/, "")}
            </p>
          )}

          {location && (
            <p className="user-profile-location">
              <svg
                className="user-profile-location-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              {location}
            </p>
          )}
        </div>
      </div>

      {stats.length > 0 && (
        <div className="user-profile-stats">
          {stats.map((stat) => (
            <div className="user-profile-stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      <section className="user-profile-section">
        <h3>About</h3>
        <p>{bio || "No bio added yet."}</p>
      </section>

      <section className="user-profile-section">
        <h3>Interests</h3>

        <div className="user-profile-interests">
          {interests.length > 0 ? (
            interests.map((interest) => (
              <span className="user-profile-interest" key={interest}>
                {interest}
              </span>
            ))
          ) : (
            <p>No interests selected yet.</p>
          )}
        </div>
      </section>

      {sharedInterests.length > 0 && (
        <section className="user-profile-section">
          <h3>Shared interests</h3>
          <div className="user-profile-interests">
            {sharedInterests.map((interest) => (
              <span className="user-profile-interest" key={interest}>
                {interest}
              </span>
            ))}
          </div>
        </section>
      )}

      {children && <div className="user-profile-actions">{children}</div>}

      <dialog
        ref={photoDialog}
        className="user-profile-photo-dialog"
        aria-label={`${name}'s profile picture`}
      >
        <div className="user-profile-photo-dialog-content">
          <button
            type="button"
            className="user-profile-photo-close"
            onClick={() => photoDialog.current?.close()}
            aria-label="Close profile picture"
          >
            ×
          </button>

          {imageUrl && <img src={imageUrl} alt={`${name}'s profile picture`} />}
        </div>
      </dialog>
    </main>
  );
}
