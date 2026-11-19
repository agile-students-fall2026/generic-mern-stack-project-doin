export function serializePublicUser(user) {
  const { id, name, username, bio, location, imageUrl, interests, profileComplete } = user;
  return { id, name, username, bio, location, imageUrl, interests, profileComplete };
}
