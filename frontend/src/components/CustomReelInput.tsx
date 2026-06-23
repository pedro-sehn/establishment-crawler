interface Props {
  value: string;
  active: boolean;
  disabled: boolean;
  onChange: (v: string) => void;
}

export default function CustomReelInput({
  value,
  active,
  disabled,
  onChange,
}: Props) {
  return (
    <section
      className={`mt-6 rounded-xl border bg-panel p-4 ${
        active ? "border-solid border-accent" : "border-dashed border-border"
      }`}
    >
      <label htmlFor="custom-reel-url" className="mb-2 block text-sm">
        Ou cole a URL de um reel/post específico{" "}
        <span className="font-normal text-muted">(opcional)</span>
      </label>
      <input
        id="custom-reel-url"
        type="text"
        placeholder="https://www.instagram.com/reel/ABC123xyz/"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-[10px] border border-border bg-panel-2 px-3.5 py-2.5 text-[0.95rem] text-text focus:border-accent focus:outline-none"
      />
      {active && (
        <p className="mt-2 mb-0 text-[0.82rem] text-accent-2">
          Usando a URL colada — isso substitui qualquer reel selecionado acima.
        </p>
      )}
    </section>
  );
}
