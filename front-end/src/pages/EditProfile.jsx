import { useState } from "react";
import { Link } from "react-router";
import mockProfile, { allInterests } from "../mocks/mockProfile";
import "./EditProfile.css";

export default function EditProfile() {
  // One state variable for each field, starting with the current profile.
  const [name, setName] = useState(mockProfile.name);
  const [imageUrl, setImageUrl] = useState(mockProfile.imageUrl);
  const [username, setUsername] = useState(mockProfile.username ?? "");
  const [location, setLocation] = useState(mockProfile.location);
  const [bio, setBio] = useState(mockProfile.bio);
  const [interests, setInterests] = useState(mockProfile.interests);
  const [saved, setSaved] = useState(false);

  // Add the interest if it is not picked yet, remove it if it is.
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
        setSaved(false);
      }
    };

    reader.readAsDataURL(file);
  }

  // Runs when the user clicks Save.
  const handleSubmit = (e) => {
    e.preventDefault(); // stop the browser from reloading the page

    // Write the changes back into the shared mock profile.
    mockProfile.name = name;
    mockProfile.username = username.trim();
    mockProfile.imageUrl = imageUrl;
    mockProfile.location = location;
    mockProfile.bio = bio;
    mockProfile.interests = interests;

    setSaved(true);
  };

  return (
    <main className="edit-profile-page">
      <div className="doin-card edit-profile-card">
        <h1 className="edit-profile-title">Edit profile</h1>
        <div className="edit-profile-photo">
          <img
            src={imageUrl}
            alt="Profile preview"
            className="edit-profile-avatar"
          />

          <label htmlFor="edit-profile-photo-input">
            Change profile picture
          </label>

          <input
            id="edit-profile-photo-input"
            type="file"
            accept="image/*"
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
