import { useRef } from "react";

interface Props {
  file: File | null;
  disabled: boolean;
  onChange: (f: File | null) => void;
}

function prettySize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function VideoUpload({ file, disabled, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const active = file !== null;

  return (
    <section
      className={`mt-6 rounded-xl border bg-panel p-4 ${
        active ? "border-solid border-accent" : "border-dashed border-border"
      }`}
    >
      <span className="mb-2 block text-sm">
        Ou envie seu próprio vídeo{" "}
        <span className="font-normal text-muted">(opcional)</span>
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        disabled={disabled}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="rounded-[10px] border border-border bg-panel-2 px-3.5 py-2.5 text-[0.95rem] text-text hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {active ? "Escolher outro arquivo" : "Escolher arquivo de vídeo"}
        </button>
        {active && (
          <>
            <span className="text-[0.9rem] text-text">
              {file.name}{" "}
              <span className="text-muted">({prettySize(file.size)})</span>
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="text-[0.82rem] text-muted underline hover:text-text disabled:opacity-50"
            >
              Remover
            </button>
          </>
        )}
      </div>

      {active && (
        <p className="mt-2 mb-0 text-[0.82rem] text-accent-2">
          Usando o arquivo enviado — isso substitui qualquer reel ou URL selecionado acima.
        </p>
      )}
    </section>
  );
}
