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
    <form className="my-6 flex gap-2" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="instagram.com/natgeo  (perfil, reel ou @usuário)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={loading}
        className="flex-1 rounded-[10px] border border-border bg-panel px-4 py-3 text-base text-text focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="rounded-[10px] bg-accent px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Buscando…" : "Buscar"}
      </button>
    </form>
  );
}
