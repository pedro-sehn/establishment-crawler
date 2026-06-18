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
  if (reels.length === 0) {
    return <p className="empty">No reels found on this account.</p>;
  }
  return (
    <section>
      <h3>Top {reels.length} most-viewed reels — pick your favorite</h3>
      <div className="reel-grid">
        {reels.map((reel) => {
          const isSelected = reel.shortcode === selected;
          return (
            <button
              key={reel.shortcode}
              className={`reel-card${isSelected ? " selected" : ""}`}
              onClick={() => onSelect(reel.shortcode)}
              type="button"
            >
              <img
                src={reel.thumbnail_url}
                alt={reel.caption || reel.shortcode}
                referrerPolicy="no-referrer"
              />
              <span className="views">▶ {formatViews(reel.view_count)} views</span>
              {isSelected && <span className="check">✓</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
