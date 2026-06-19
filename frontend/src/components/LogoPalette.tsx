import { useEffect, useState } from "react";
import { extractPalette } from "../palette";

interface Props {
  imageUrl: string;
}

export default function LogoPalette({ imageUrl }: Props) {
  const [colors, setColors] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setColors([]);
    extractPalette(imageUrl, 6)
      .then((c) => alive && setColors(c))
      .catch(() => alive && setColors([]));
    return () => {
      alive = false;
    };
  }, [imageUrl]);

  async function copy(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      setTimeout(() => setCopied((c) => (c === hex ? null : c)), 1200);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  if (colors.length === 0) return null;

  return (
    <div className="mt-3">
      <span className="block text-xs text-muted mb-1.5">
        Paleta do logo — passe o mouse para ver o hex, clique para copiar
      </span>
      <div className="flex flex-wrap gap-2">
        {colors.map((hex) => (
          <button
            key={hex}
            type="button"
            title={hex}
            onClick={() => copy(hex)}
            className="group relative h-10 w-10 rounded-lg border border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent"
            style={{ backgroundColor: hex }}
          >
            <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 font-mono text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
              {copied === hex ? "copiado!" : hex}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
