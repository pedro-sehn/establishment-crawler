import type { Fit } from "../types";

interface Props {
  fit: Fit;
  onFit: (f: Fit) => void;
}

const FITS: { value: Fit; label: string; hint: string }[] = [
  { value: "pad", label: "Fundo desfocado", hint: "Mantém o vídeo inteiro, preenche as bordas com desfoque" },
  { value: "crop", label: "Corte central", hint: "Preenche o quadro, corta topo/base" },
];

export default function OutputControls({ fit, onFit }: Props) {
  return (
    <section className="mt-6 mb-2 flex flex-wrap gap-6">
      <div>
        <span className="mb-1.5 block text-sm text-muted">Proporção</span>
        <span className="inline-flex items-center rounded-lg border border-border bg-panel px-3 py-2 text-sm font-semibold">
          16:9 (1920×1080) · fixo
        </span>
      </div>
      <div>
        <span className="mb-1.5 block text-sm text-muted">Modo de ajuste</span>
        <div className="inline-flex overflow-hidden rounded-lg border border-border">
          {FITS.map((f) => (
            <button
              key={f.value}
              type="button"
              title={f.hint}
              onClick={() => onFit(f.value)}
              className={`px-3.5 py-2 text-sm transition-colors ${
                fit === f.value ? "bg-accent text-white" : "bg-panel text-text hover:bg-panel-2"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
