import UserProfile from "./Components/UserProfile";

export default function PersonDetails({
  person,
  onBack,
  backAriaLabel = "Back to discovery",
  backLabel,
  children,
  headingRef,
}) {
  return (
    <UserProfile
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
      backLabel={backLabel}
    >
      {children}
    </UserProfile>
  );
}
