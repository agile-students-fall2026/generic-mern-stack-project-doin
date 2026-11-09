import UserProfile from "./Components/UserProfile";

export default function PersonDetails({
  person,
  onBack,
  requested,
  onRequest,
  backAriaLabel = "Back to discovery",
  children,
}) {
  return (
    <UserProfile
      title="Profile"
      name={person.name}
      username={person.username}
      location={person.location}
      bio={person.bio}
      interests={person.interests ?? []}
      imageUrl={person.imageUrl}
      sharedInterests={person.sharedInterests ?? []}
      onBack={onBack}
      backAriaLabel={backAriaLabel}
    >
      {children ?? (
        <button
          type="button"
          className={
            requested
              ? "doin-button doin-button--secondary"
              : "doin-button doin-button--primary"
          }
          onClick={onRequest}
        >
          {requested ? "Cancel request" : "Send connection request"}
        </button>
      )}
    </UserProfile>
  );
}
