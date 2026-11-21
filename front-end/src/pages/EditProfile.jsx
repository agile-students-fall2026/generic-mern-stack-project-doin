import { useEffect, useState, useRef } from "react";
import { Link } from "react-router";
import { allInterests } from "../data/interests";
import { currentUserId, getPerson, updateProfile } from "../api";
import "./EditProfile.css";

export default function EditProfile() {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState(null);

  // The form starts from the profile the back end returns (#101), using
  // the shared profile endpoint from #98.
  useEffect(() => {
    const id = currentUserId();
    if (!id) {
      setError("Please log in to edit your profile.");
      return;
    }
    setUserId(id);
    getPerson(id)
      .then((profile) => {
        setName(profile.name ?? "");
        setUsername(profile.username ?? "");
        setImageUrl(profile.imageUrl ?? "");
        setLocation(profile.location ?? "");
        setBio(profile.bio ?? "");
        setInterests(profile.interests ?? []);
      })
      .catch(() => setError("Your profile could not be loaded. Please try again."));
  }, []);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const photoInputRef = useRef(null);

  const toggleInterest = (interest) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((item) => item !== interest));
    } else {
      setInterests([...interests, interest]);
    }
    setSaved(false);
  };

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
        setPhotoMenuOpen(false);
        setSaved(false);
      }
    };

    reader.readAsDataURL(file);
  }

  // Save sends the form to the profile update endpoint (#98) and only
  // shows Saved when the server accepts it. A server error, such as a
  // username that is already taken, is shown on the page instead.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!userId) {
      setError("Please log in to edit your profile.");
      return;
    }

    try {
      await updateProfile(userId, {
        name,
        username: username.trim(),
        imageUrl,
        location,
        bio,
        interests,
      });
      setSaved(true);
    } catch (err) {
      setSaved(false);
      setError(err.message);
    }
  };

  return (
    <main className="edit-profile-page">
      <div className="doin-card edit-profile-card">
        <h1 className="edit-profile-title">Edit profile</h1>

        <div className="edit-profile-photo">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Profile preview"
              className="edit-profile-avatar"
            />
          ) : (
            <div className="edit-profile-avatar edit-profile-avatar-empty">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-5 3-8 8-8s8 3 8 8" />
              </svg>
            </div>
          )}

          <button
            type="button"
            className="doin-button doin-button--secondary edit-profile-photo-edit"
            aria-expanded={photoMenuOpen}
            aria-controls="edit-profile-photo-menu"
            onClick={() => setPhotoMenuOpen((previous) => !previous)}
          >
            Edit picture
          </button>

          {photoMenuOpen && (
            <div
              id="edit-profile-photo-menu"
              className="edit-profile-photo-menu"
            >
              <button
                type="button"
                className="doin-button doin-button--secondary"
                onClick={() => photoInputRef.current?.click()}
              >
                Choose photo
              </button>

              <button
                type="button"
                className="doin-button doin-button--secondary"
                disabled={!imageUrl}
                onClick={() => {
                  setImageUrl("");
                  setPhotoMenuOpen(false);
                  setSaved(false);
                }}
              >
                Remove current picture
              </button>
            </div>
          )}

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handlePhotoChange}
          />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="edit-profile-field">
            <label htmlFor="username_field">Username:</label>
            <input
              className="doin-input edit-profile-input"
              id="username_field"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setSaved(false);
              }}
              required
            />
          </div>
          <div className="edit-profile-field">
            <label htmlFor="name_field">Name:</label>
            <input
              className="doin-input edit-profile-input"
              id="name_field"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
            />
          </div>

          <div className="edit-profile-field">
            <label htmlFor="location_field">Location:</label>
            <input
              className="doin-input edit-profile-input"
              id="location_field"
              type="text"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setSaved(false);
              }}
            />
          </div>

          <div className="edit-profile-field">
            <label htmlFor="bio_field">Bio:</label>
            <input
              className="doin-input edit-profile-input"
              id="bio_field"
              type="text"
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                setSaved(false);
              }}
            />
          </div>

          <p className="edit-profile-label">Interests:</p>
          <div className="edit-profile-interests">
            {allInterests.map((interest) => (
              <button
                type="button"
                key={interest}
                className={
                  interests.includes(interest)
                    ? "edit-profile-interest edit-profile-interest-on"
                    : "edit-profile-interest"
                }
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </button>
            ))}
          </div>

          {error && <p>{error}</p>}

          {saved && <p className="edit-profile-saved">Saved!</p>}

          <div className="edit-profile-actions">
            <button type="submit" className="doin-button doin-button--primary">
              Save
            </button>
            <Link to="/profile" className="doin-button doin-button--secondary">
              Back to profile
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
