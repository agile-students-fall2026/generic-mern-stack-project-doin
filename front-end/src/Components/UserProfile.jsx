import { useRef, useState } from "react";
import "./UserProfile.css";
import Avatar from "./Avatar";
import BackButton from "./BackButton";
import Icon from "./Icon";

export default function UserProfile({
  title,
  name,
  username,
  location,
  bio,
  interests = [],
  imageUrl,
  stats,
  headingRef,
  sharedInterests = [],
  children,
  onBack,
  backAriaLabel = "Go back",
  backLabel,
}) {
  const photoDialog = useRef(null);
  const [unavailablePhoto, setUnavailablePhoto] = useState(null);
  const photo = imageUrl?.trim();
  const hasPhoto = Boolean(photo && photo !== unavailablePhoto);

  return (
    <main className="user-profile-page doin-page doin-page--app">
      {onBack && <BackButton onClick={onBack} ariaLabel={backAriaLabel} label={backLabel} />}

      {title && <h1 className="doin-page-title">{title}</h1>}

      <div className="user-profile-header">
        <button
          type="button"
          className="user-profile-photo-button"
          onClick={() => photoDialog.current?.showModal()}
          disabled={!hasPhoto}
          aria-label={`View ${name}'s profile picture`}
        >
          <Avatar src={photo} className="user-profile-photo" onUnavailable={setUnavailablePhoto} />
        </button>

        <div className="user-profile-identity">
          {title
            ? <h2 className="user-profile-name">{name}</h2>
            : <h1 className="doin-page-title user-profile-name" ref={headingRef} tabIndex={-1}>{name}</h1>}

          {username && (
            <p className="user-profile-username">
              @{username.replace(/^@/, "")}
            </p>
          )}

          {location && (
            <p className="user-profile-location">
              <Icon name="pin" />
              {location}
            </p>
          )}
        </div>
      </div>

      {stats && (
        <dl className="user-profile-stats">
          {[["Connections", stats.connections], ["Hosted", stats.hosted], ["Attended", stats.attended]].map(([label, value]) => (
            <div className="user-profile-stat" key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <section className="user-profile-section">
        <h2>About</h2>
        <p>{bio || "No bio added yet."}</p>
      </section>

      <section className="user-profile-section">
        <h2>Interests</h2>

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
          <h2>Shared interests</h2>
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

          {hasPhoto && <Avatar src={photo} alt={`${name}'s profile picture`} />}
        </div>
      </dialog>
    </main>
  );
}
