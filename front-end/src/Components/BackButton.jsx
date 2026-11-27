import Icon from "./Icon";
import "./BackButton.css";

export default function BackButton({ onClick, ariaLabel = "Go back", label = "Back", disabled }) {
  return (
    <button type="button" className="doin-back-button" onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      <Icon name="back" />
      <span>{label}</span>
    </button>
  );
}
