import "./BackButton.css";

export default function BackButton({ onClick, ariaLabel = "Go back" }) {
  return (
    <button
      type="button"
      className="doin-back-button"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>

      <span>Back</span>
    </button>
  );
}
