import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { setupProfile } from "../api";
import "./SetupProfile.css";

export default function SetupProfile() {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const routeLocation = useLocation();

  function handlePhotoChange(event) {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    // The server only accepts request bodies up to a fixed size, so a
    // large photo would fail with a 413 error when the form is saved.
    // Refuse it here with a clear message instead.
    if (file.size > 70000) {
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

  // Finish sends the form to the profile setup endpoint (#98), which
  // fills in the record that registration created for the signed in
  // user. The interests come from the interests page before this one.
  async function handleFinish(event) {
    event.preventDefault();

    if (!username.trim()) {
      return;
    }

    setError("");

    const fields = {
      username: username.trim(),
      bio: bio.trim(),
      location: location.trim(),
      imageUrl: photoPreview,
    };

    // The interests only go out when the user actually picked some on
    // the interests page. Leaving the field out keeps the interests
    // already saved on the record instead of replacing them with an
    // empty list.
    const chosenInterests = routeLocation.state?.interests;
    if (Array.isArray(chosenInterests) && chosenInterests.length > 0) {
      fields.interests = chosenInterests;
    }

    try {
      await setupProfile(fields);
      navigate("/profile");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="setup-profile-page">
      <div className="doin-card setup-profile-container">
        <header className="setup-profile-header">
          <h1>Set up your profile</h1>
        </header>

        <form onSubmit={handleFinish} className="setup-profile-form">
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
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />
          </div>

          <div className="setup-profile-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
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
              type="text"
              className="doin-input setup-profile-input"
              placeholder="e.g. New York, NY"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>

          {error && <p>{error}</p>}

          <button
            type="submit"
            className="doin-button doin-button--primary setup-profile-finish"
          >
            Finish setup
          </button>
        </form>
      </div>
    </main>
  );
}
