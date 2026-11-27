import UserProfile from "./Components/UserProfile";

export default function PersonDetails({
  person,
  onBack,
  backAriaLabel = "Back to discovery",
  children,
  headingRef,
}) {
  return (
    <UserProfile
      title="Profile"
      headingRef={headingRef}
      name={person.name}
      username={person.username}
      location={person.location}
      bio={person.bio}
      interests={person.interests ?? []}
      imageUrl={person.imageUrl}
      stats={person.stats}
      sharedInterests={person.sharedInterests ?? []}
      onBack={onBack}
      backAriaLabel={backAriaLabel}
    >
      {children}
    </UserProfile>
  );
}
