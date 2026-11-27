import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router";
import Avatar from "../Components/Avatar";
import Icon from "../Components/Icon";
import CatalogStatus from "../Components/CatalogStatus";
import { useInterestCatalog } from "../useCatalog";
import { profileBodyError, profileBodyFits, profilePhotoTypes } from "../profilePhoto";
import useProfilePhoto from "../useProfilePhoto";
import { currentUserId, getUserById, updateProfile } from "../api";
import useSubmission from "../useSubmission";
import useToast from "../useToast";
import "./EditProfile.css";

export default function EditProfile({ onUserChange }) {
  const [name, setName] = useState("");
  const photo = useProfilePhoto();
  const { setPhoto, imageUrl } = photo;
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState([]);
  const [interestsChanged, setInterestsChanged] = useState(false);
  const catalog = useInterestCatalog();
  const navigate = useNavigate();
  const showSuccess = useToast();
  const { pending, error, setError, submit } = useSubmission();
  const [loadError, setLoadError] = useState("");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false);
  const photoInputRef = useRef(null);
  const userId = currentUserId();

  // The form starts from the profile the back end returns (#101), using
  // the shared profile endpoint from #98.
  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    const { signal } = controller;
    getUserById(userId, signal)
      .then((profile) => {
        if (signal.aborted) return;
        setName(profile.name ?? "");
        setUsername(profile.username ?? "");
        setOriginalImageUrl(profile.imageUrl ?? "");
        setPhoto(profile.imageUrl ?? "");
        setLocation(profile.location ?? "");
        setBio(profile.bio ?? "");
        setInterests(profile.interests ?? []);
        setProfileLoaded(true);
      })
      .catch(() => {
        if (!signal.aborted) setLoadError("Your profile could not be loaded. Please try again.");
      });
    return () => controller.abort();
  }, [userId, setPhoto]);

  const toggleInterest = (interest) => {
    setInterestsChanged(true);
    if (interests.includes(interest)) {
      setInterests(interests.filter((item) => item !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const profileFields = () => ({
    name,
    username: username.trim(),
    location,
    bio,
    ...(interestsChanged ? { interests } : {}),
  });

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file && !pending && await photo.choosePhoto(file, profileFields())) {
      setPhotoMenuOpen(false);
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userId || !profileLoaded || pending || photo.processing) return;

    const fields = {
      ...profileFields(),
      ...(imageUrl !== originalImageUrl ? { imageUrl } : {}),
    };
    if (!profileBodyFits(fields)) {
      setError(profileBodyError);
      return;
    }

    submit(
      (signal) => updateProfile(userId, fields, signal),
      (profile) => {
        onUserChange(profile);
        showSuccess("Profile saved.");
        navigate("/profile", { replace: true });
      },
    );
  };

  if (!profileLoaded) {
    const message = userId ? loadError : "Please log in to edit your profile.";
    return (
      <main className="edit-profile-page doin-page doin-page--app">
        <h1 className="doin-page-title">Edit Profile</h1>
        {message ? <p role="alert">{message}</p> : <p role="status">Loading your profile...</p>}
        <Link to="/profile" className="doin-button doin-button--secondary">Cancel</Link>
      </main>
    );
  }

  return (
    <main className="edit-profile-page doin-page doin-page--app">
      <Link className="doin-back-button" to="/profile" aria-label="Back to profile">
        <Icon name="back" /> My Profile
      </Link>
      <h1 className="doin-page-title">Edit Profile</h1>
      <form className="edit-profile-form" onSubmit={handleSubmit}>
        <div className="doin-form-card">
          <fieldset className="doin-form-group">
            <legend>Profile information</legend>
            <div className="edit-profile-field">
              <label className="doin-label" htmlFor="name_field">Full name</label>
              <input
                className="doin-input edit-profile-input"
                id="name_field"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                name="name"
                autoComplete="name"
                required
              />
            </div>

            <div className="edit-profile-field">
              <label className="doin-label" htmlFor="username_field">Username</label>
              <input
                className="doin-input edit-profile-input"
                id="username_field"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                name="username"
                autoComplete="username"
                required
              />
            </div>
            <div className="edit-profile-field">
              <label className="doin-label" htmlFor="location_field">Location</label>
              <input
                className="doin-input edit-profile-input"
                id="location_field"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="edit-profile-field">
              <label className="doin-label" htmlFor="bio_field">Biography</label>
              <textarea
                className="doin-input edit-profile-input"
                id="bio_field"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </fieldset>
        </div>
        <div className="doin-form-card">
          <fieldset className="doin-form-group">
            <legend>Interests</legend>
            <CatalogStatus catalog={catalog} label="Interests" />
            {!catalog.data && interests.length > 0 && <p>{interests.join(" • ")}</p>}
            <div className="edit-profile-interests">
              {catalog.data?.map((interest) => (
                <button
                  type="button"
                  key={interest}
                  className={
                    interests.includes(interest)
                      ? "edit-profile-interest edit-profile-interest-on"
                      : "edit-profile-interest"
                  }
                  aria-pressed={interests.includes(interest)}
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="edit-profile-photo">
          <Avatar src={imageUrl} alt="Profile preview" className="edit-profile-avatar" />

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
                disabled={!imageUrl || pending}
                onClick={() => {
                  setPhoto("");
                  setPhotoMenuOpen(false);
                }}
              >
                Remove current picture
              </button>
            </div>
          )}

          <input
            ref={photoInputRef}
            type="file"
            accept={profilePhotoTypes}
            disabled={pending}
            hidden
            onChange={handlePhotoChange}
          />
        </div>
        {photo.processing && <p role="status">Processing photo…</p>}
        {photo.error && <p className="doin-field-error" role="alert">{photo.error}</p>}
        {error && <p className="doin-field-error" role="alert">{error}</p>}

        <div className="edit-profile-actions">
          <button
            type="submit"
            className="doin-button doin-button--primary"
            aria-busy={pending}
            disabled={pending || photo.processing}
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <Link to="/profile" className="doin-button doin-button--secondary">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
