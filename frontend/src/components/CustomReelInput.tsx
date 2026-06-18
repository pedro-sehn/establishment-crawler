interface Props {
  value: string;
  active: boolean;
  disabled: boolean;
  onChange: (v: string) => void;
}

export default function CustomReelInput({ value, active, disabled, onChange }: Props) {
  return (
    <section className={`custom-reel${active ? " active" : ""}`}>
      <label htmlFor="custom-reel-url">
        Or paste a specific reel/post URL <span className="optional">(optional)</span>
      </label>
      <input
        id="custom-reel-url"
        type="text"
        placeholder="https://www.instagram.com/reel/ABC123xyz/"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      {active && (
        <p className="custom-hint">
          Using your pasted URL — this overrides any reel selected above.
        </p>
      )}
    </section>
  );
}
