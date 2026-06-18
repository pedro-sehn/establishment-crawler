import { useState } from "react";

interface Props {
  loading: boolean;
  onSubmit: (url: string) => void;
}

export default function UrlForm({ loading, onSubmit }: Props) {
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (trimmed) onSubmit(trimmed);
  }

  return (
    <form className="url-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="instagram.com/natgeo  (profile, reel, or @handle)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={loading}
      />
      <button type="submit" disabled={loading || !url.trim()}>
        {loading ? "Searching…" : "Crawl"}
      </button>
    </form>
  );
}
