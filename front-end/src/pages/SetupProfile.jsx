import { useState } from "react";
import { useNavigate } from "react-router";
import { setupProfile } from "../api";
import useSubmission from "../useSubmission";
import "./Auth.css";
import "./SetupProfile.css";

export default function SetupProfile({ onUserChange }) {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const { pending, error, setError, submit } = useSubmission();
  const navigate = useNavigate();

  function handlePhotoChange(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    // Leave room for base64 encoding and profile fields in Express's JSON body limit.
    if (file.size > 70_000) {
      setError("That photo is too large. Please choose a smaller photo.");
      return;
    }
    setError("");

    const reader = new FileReader();

    reader.onload = () => {
      setPhotoPreview(reader.result);
    };

    reader.readAsDataURL(file);
  }

  function handleFinish(event) {
    event.preventDefault();

    if (!username.trim()) {
      return;
    }

    // Interests are already on the registered user's record.
    const fields = {
      username: username.trim(),
      bio: bio.trim(),
      location: location.trim(),
      imageUrl: photoPreview,
    };
    submit(
      (signal) => setupProfile(fields, signal),
      (user) => {
        onUserChange(user);
        navigate("/profile");
      },
    );
  }

  return (
    <main className="setup-profile-page">
      <div className="doin-card setup-profile-container">
        <header className="setup-profile-header">
          <h1>Set up your profile</h1>
        </header>

        <form
          action="/api/profiles"
          method="post"
          onSubmit={handleFinish}
          className="setup-profile-form"
        >
          <div className="setup-profile-photo">
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="Your profile preview"
                className="setup-profile-avatar"
              />
            ) : (
              <div className="setup-profile-avatar" />
            )}

            <label htmlFor="profile-photo">Add photo</label>

            <input
              id="profile-photo"
              name="photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />
          </div>

          <div className="setup-profile-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              className="doin-input setup-profile-input"
              placeholder="Choose a username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>

          <div className="setup-profile-field">
            <label htmlFor="bio">Short bio</label>
            <textarea
              id="bio"
              name="bio"
              className="doin-input setup-profile-input"
              placeholder="Tell us a little about yourself"
              rows="3"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
          </div>

          <div className="setup-profile-field">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              name="location"
              type="text"
              className="doin-input setup-profile-input"
              placeholder="e.g. New York, NY"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button
            type="submit"
            className="doin-button doin-button--primary setup-profile-finish"
            disabled={pending}
          >
            {pending ? "Saving profile…" : "Finish setup"}
          </button>
        </form>
      </div>
    </main>
  );
}
