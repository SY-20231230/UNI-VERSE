export default function Avatar({ user, size = 38 }) {
  if (user.avatarUrl) {
    return (
      <img
        className="avatar"
        src={user.avatarUrl}
        alt={user.name || ''}
        style={{ width: size, height: size, objectFit: 'cover' }}
      />
    );
  }
  const initial = (user.name || '?').slice(-2);
  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.36, background: user.color }}
    >
      {initial}
    </div>
  );
}
