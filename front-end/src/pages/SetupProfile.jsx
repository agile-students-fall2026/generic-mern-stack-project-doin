import { useState } from "react";
import { setupProfile } from "../api";
import Avatar from "../Components/Avatar";
import { profileBodyError, profileBodyFits, profilePhotoTypes } from "../profilePhoto";
import useProfilePhoto from "../useProfilePhoto";
import useSubmission from "../useSubmission";
import useToast from "../useToast";
import "./Auth.css";
import "./SetupProfile.css";

export default function SetupProfile({ user, onUserChange }) {
  const [name, setName] = useState(user.name ?? "");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const photo = useProfilePhoto();
  const { pending, error, setError, submit } = useSubmission();
  const showSuccess = useToast();

  const profileFields = () => ({
    name: name.trim(),
    username: username.trim(),
    bio: bio.trim(),
    location: location.trim(),
  });

  function handlePhotoChange(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (file && !pending) photo.choosePhoto(file, profileFields());
  }

  function handleFinish(event) {
    event.preventDefault();
    if (photo.processing || pending) return;
    if (!name.trim() || !username.trim()) {
      setError("Enter your name and choose a username.");
      return;
    }

    const fields = { ...profileFields(), imageUrl: photo.imageUrl };
    if (!profileBodyFits(fields)) {
      setError(profileBodyError);
      return;
    }
    submit((signal) => setupProfile(fields, signal), (profile) => {
      onUserChange(profile);
      showSuccess("Profile saved.");
    });
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
            <Avatar src={photo.imageUrl} alt="Your profile preview" className="setup-profile-avatar" />

            <label className="doin-label" htmlFor="profile-photo">Add photo</label>

            <input
              id="profile-photo"
              name="photo"
              type="file"
              accept={profilePhotoTypes}
              disabled={pending}
              onChange={handlePhotoChange}
            />
          </div>

          <div className="setup-profile-field">
            <label className="doin-label" htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              name="name"
              type="text"
              autoComplete="name"
              className="doin-input setup-profile-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="setup-profile-field">
            <label className="doin-label" htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              className="doin-input setup-profile-input"
              placeholder="Choose a username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>

          <div className="setup-profile-field">
            <label className="doin-label" htmlFor="bio">Short bio</label>
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
            <label className="doin-label" htmlFor="location">Location</label>
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

          {photo.processing && <p role="status">Processing photo…</p>}
          {photo.error && <p className="doin-field-error" role="alert">{photo.error}</p>}
          {error && <p className="doin-field-error" role="alert">{error}</p>}

          <button
            type="submit"
            className="doin-button doin-button--primary setup-profile-finish"
            aria-busy={pending}
            disabled={pending || photo.processing}
          >
            {pending ? "Saving profile…" : "Finish setup"}
          </button>
        </form>
      </div>
    </main>
  );
}
