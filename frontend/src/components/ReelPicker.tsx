import { useState } from "react";
import type { Reel } from "../types";

interface Props {
  reels: Reel[];
  selected: string | null;
  onSelect: (shortcode: string) => void;
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

export default function ReelPicker({ reels, selected, onSelect }: Props) {
  // Which reel is currently previewing (playing inline).
  const [playing, setPlaying] = useState<string | null>(null);

  if (reels.length === 0) {
    return <p className="text-muted">Nenhum reel encontrado nesta conta.</p>;
  }

  return (
    <section className="mt-2">
      <h3 className="text-base font-semibold">
        Top {reels.length} reels mais vistos — escolha o seu favorito
      </h3>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {reels.map((reel) => {
          const isSelected = reel.shortcode === selected;
          const isPlaying = playing === reel.shortcode;
          return (
            <div
              key={reel.shortcode}
              className={`relative aspect-[9/16] overflow-hidden rounded-xl border-2 bg-panel transition-colors ${
                isSelected ? "border-accent shadow-[0_0_0_2px_var(--color-accent)]" : "border-border"
              }`}
            >
              {isPlaying && reel.video_url ? (
                <video
                  src={reel.video_url}
                  className="h-full w-full object-cover"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(reel.shortcode)}
                  className="h-full w-full"
                >
                  <img
                    src={reel.thumbnail_url}
                    alt={reel.caption || reel.shortcode}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </button>
              )}

              <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/65 px-1.5 py-0.5 text-xs text-white">
                ▶ {formatViews(reel.view_count)} visualizações
              </span>

              {isSelected && !isPlaying && (
                <span className="pointer-events-none absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-accent font-bold text-white">
                  ✓
                </span>
              )}

              {reel.video_url && (
                <button
                  type="button"
                  onClick={() => setPlaying(isPlaying ? null : reel.shortcode)}
                  className="absolute left-2 top-2 rounded-md bg-black/65 px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-accent"
                >
                  {isPlaying ? "✕ Fechar" : "▶ Prévia"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
