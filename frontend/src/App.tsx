import { useState } from "react";
import { fetchProfile, processReel, processUpload } from "./api";
import { loadCookies, saveCookies } from "./cookies";
import CookieInput from "./components/CookieInput";
import CustomReelInput from "./components/CustomReelInput";
import DownloadButton from "./components/DownloadButton";
import OutputControls from "./components/OutputControls";
import ProfileCard from "./components/ProfileCard";
import ReelPicker from "./components/ReelPicker";
import UrlForm from "./components/UrlForm";
import VideoUpload from "./components/VideoUpload";
import type { Fit, IgCookies, ProcessResponse, ProfileResponse, Ratio } from "./types";

// Output ratio is fixed at 16:9 per product spec.
const RATIO: Ratio = "16:9";

export default function App() {
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cookies, setCookies] = useState<IgCookies>(() => loadCookies());
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [fit, setFit] = useState<Fit>("pad");
  const [result, setResult] = useState<ProcessResponse | null>(null);

  const uploadActive = uploadFile !== null;
  const customActive = !uploadActive && customUrl.trim().length > 0;
  const canProcess = uploadActive || customActive || selected !== null;

  async function handleCrawl(url: string) {
    setLoadingProfile(true);
    setError(null);
    setData(null);
    setSelected(null);
    setCustomUrl("");
    setUploadFile(null);
    setResult(null);
    try {
      const res = await fetchProfile(url, cookies);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setLoadingProfile(false);
    }
  }

  function handleSelect(shortcode: string) {
    setSelected(shortcode);
    setUploadFile(null); // a featured reel and an upload are mutually exclusive
    setResult(null); // a new pick invalidates the previous render
  }

  function handleCustomUrl(value: string) {
    setCustomUrl(value);
    if (value.trim()) setUploadFile(null); // a pasted URL overrides an upload
    setResult(null);
  }

  function handleUploadChange(file: File | null) {
    setUploadFile(file);
    if (file) {
      setSelected(null); // an upload wins over reel pick + pasted URL
      setCustomUrl("");
    }
    setResult(null);
  }

  function handleSaveCookies(c: IgCookies) {
    saveCookies(c);
    setCookies(c);
  }

  async function handleProcess() {
    if (!canProcess) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      let res: ProcessResponse;
      if (uploadActive) {
        res = await processUpload(uploadFile as File, RATIO, fit);
      } else {
        const target = customActive
          ? { url: customUrl.trim() }
          : { shortcode: selected as string };
        res = await processReel(target, RATIO, fit, cookies);
      }
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no processamento.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-[880px] px-5 pt-8 pb-16">
      <header>
        <h1 className="m-0 bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-3xl font-bold text-transparent">
          Establishment Crawler
        </h1>
        <p className="mt-1 text-muted">
          Cole um perfil do Instagram → escolha um reel em destaque → ajuste e baixe.
        </p>
      </header>

      <CookieInput cookies={cookies} onSave={handleSaveCookies} />

      <UrlForm loading={loadingProfile} onSubmit={handleCrawl} />

      {error && (
        <div className="my-4 rounded-[10px] border border-[#6b2233] bg-[#3a1620] px-4 py-3 text-[#ffc9d4]">
          {error}
        </div>
      )}

      {data && (
        <>
          <ProfileCard profile={data.profile} />
          <ReelPicker
            reels={data.top_reels}
            selected={selected}
            onSelect={handleSelect}
          />

          <CustomReelInput
            value={customUrl}
            active={customActive}
            disabled={processing}
            onChange={handleCustomUrl}
          />
        </>
      )}

      <VideoUpload file={uploadFile} disabled={processing} onChange={handleUploadChange} />

      {canProcess && (
        <>
          <OutputControls fit={fit} onFit={setFit} />
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleProcess}
              disabled={processing}
              className="rounded-[10px] bg-accent px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Processando…" : "Remodelar vídeo"}
            </button>
            {result && <DownloadButton result={result} />}
          </div>
        </>
      )}

      <footer className="mt-12 border-t border-border pt-4 text-muted">
        <small>
          For personal use. Scraping/redistributing content may violate Instagram's Terms of
          Service and copyright.
        </small>
      </footer>
    </div>
  );
}
