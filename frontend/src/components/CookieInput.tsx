import { useState } from "react";
import { parseCookieString } from "../cookies";
import type { IgCookies } from "../types";

interface Props {
  cookies: IgCookies;
  onSave: (c: IgCookies) => void;
}

export default function CookieInput({ cookies, onSave }: Props) {
  const [raw, setRaw] = useState("");
  const saved = cookies.sessionid.trim().length > 0;

  function handleSave() {
    onSave(parseCookieString(raw));
    setRaw("");
  }

  function handleClear() {
    onSave({ sessionid: "", csrftoken: "", ds_user_id: "" });
    setRaw("");
  }

  return (
    <section
      className={`mt-6 rounded-xl border bg-panel p-4 ${
        saved ? "border-solid border-accent" : "border-dashed border-border"
      }`}
    >
      <label
        htmlFor="ig-cookies"
        className="mb-1.5 block text-sm font-semibold"
      >
        Cookies do Instagram
      </label>
      <p className="mb-2.5 text-[0.82rem] text-muted">
        Abra o instagram.com (logado) → DevTools → Application ▸ Cookies, depois
        cole seus <code className="text-[0.8rem] text-accent-2">sessionid</code>
        , <code className="text-[0.8rem] text-accent-2">csrftoken</code> e{" "}
        <code className="text-[0.8rem] text-accent-2">ds_user_id</code> aqui
        (uma string de cookie completa também funciona). Salvos apenas no seu
        navegador.
      </p>
      <textarea
        id="ig-cookies"
        rows={3}
        placeholder="sessionid=...; csrftoken=...; ds_user_id=..."
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        className="w-full resize-y rounded-[10px] border border-border bg-panel-2 px-3.5 py-2.5 font-mono text-[0.85rem] text-text focus:border-accent focus:outline-none"
      />
      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={!raw.trim()}
          className="rounded-[10px] bg-accent px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Salvar cookies
        </button>
        {saved && (
          <>
            <span className="text-[0.82rem] text-[#51cf66]">
              Salvo ✓ {cookies.csrftoken ? "csrftoken ✓" : "csrftoken —"}{" "}
              {cookies.ds_user_id ? "ds_user_id ✓" : "ds_user_id —"}
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-[10px] border border-border bg-transparent px-4 py-2 text-sm text-muted"
            >
              Limpar
            </button>
          </>
        )}
      </div>
    </section>
  );
}
