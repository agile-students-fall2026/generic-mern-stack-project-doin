// Adapt discovery and connection records without adding missing profile facts.
export default function normalizePerson(person, currentInterests = []) {
  const interests = person.interests ?? (
    Array.isArray(person.hobbies)
      ? person.hobbies
      : (person.hobbies ?? "").split(" • ").filter(Boolean)
  );

  return {
    ...person,
    imageUrl: person.imageUrl ?? person.image,
    interests,
    sharedInterests: interests.filter((interest) =>
      currentInterests.includes(interest),
    ),
  };
}
