import { useState } from "react";
import defaultAvatar from "../assets/default-avatar.svg";

function AvatarImage({ src, className, alt, onUnavailable }) {
  const [failed, setFailed] = useState(false);
  const fallback = !src || failed;

  return (
    <img
      className={className}
      src={fallback ? defaultAvatar : src}
      alt={alt}
      data-avatar-fallback={fallback ? "" : undefined}
      onError={fallback ? undefined : () => {
        setFailed(true);
        onUnavailable?.(src);
      }}
    />
  );
}

export default function Avatar({ src, className, alt = "", onUnavailable }) {
  const source = src?.trim();
  return <AvatarImage key={source} src={source} className={className} alt={alt} onUnavailable={onUnavailable} />;
}
