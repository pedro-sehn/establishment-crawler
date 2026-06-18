import type { Fit, Ratio } from "../types";

interface Props {
  ratio: Ratio;
  fit: Fit;
  onRatio: (r: Ratio) => void;
  onFit: (f: Fit) => void;
}

const RATIOS: { value: Ratio; label: string }[] = [
  { value: "16:9", label: "16:9 (1920×1080)" },
  { value: "4:3", label: "4:3 (1440×1080)" },
];

const FITS: { value: Fit; label: string; hint: string }[] = [
  { value: "pad", label: "Blurred pad", hint: "Keeps full video, fills bars with blur" },
  { value: "crop", label: "Center crop", hint: "Fills the frame, trims top/bottom" },
];

export default function OutputControls({ ratio, fit, onRatio, onFit }: Props) {
  return (
    <section className="controls">
      <div className="control-group">
        <span className="control-label">Aspect ratio</span>
        <div className="segmented">
          {RATIOS.map((r) => (
            <button
              key={r.value}
              type="button"
              className={ratio === r.value ? "active" : ""}
              onClick={() => onRatio(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="control-group">
        <span className="control-label">Fit mode</span>
        <div className="segmented">
          {FITS.map((f) => (
            <button
              key={f.value}
              type="button"
              title={f.hint}
              className={fit === f.value ? "active" : ""}
              onClick={() => onFit(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
