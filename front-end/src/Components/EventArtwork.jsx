import { useState } from "react";

const defaultArtwork = "/static/images/event-default.svg";

function EventImage({ source, className }) {
  const [failed, setFailed] = useState(false);
  const fallback = !source || failed || source === defaultArtwork;

  return (
    <img
      className={className}
      src={fallback ? defaultArtwork : source}
      alt=""
      data-event-fallback={fallback ? "" : undefined}
      onError={fallback ? undefined : () => setFailed(true)}
    />
  );
}

export default function EventArtwork({ src, className }) {
  const source = typeof src === "string" ? src.trim() : "";
  return <EventImage key={source} source={source} className={className} />;
}
