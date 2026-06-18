import { useState } from "react";
import { fetchProfile, processReel } from "./api";
import CustomReelInput from "./components/CustomReelInput";
import DownloadButton from "./components/DownloadButton";
import OutputControls from "./components/OutputControls";
import ProfileCard from "./components/ProfileCard";
import ReelPicker from "./components/ReelPicker";
import UrlForm from "./components/UrlForm";
import type { Fit, ProcessResponse, ProfileResponse, Ratio } from "./types";

export default function App() {
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<ProfileResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [ratio, setRatio] = useState<Ratio>("16:9");
  const [fit, setFit] = useState<Fit>("pad");
  const [result, setResult] = useState<ProcessResponse | null>(null);

  const customActive = customUrl.trim().length > 0;
  const canProcess = customActive || selected !== null;

  async function handleCrawl(url: string) {
    setLoadingProfile(true);
    setError(null);
    setData(null);
    setSelected(null);
    setCustomUrl("");
    setResult(null);
    try {
      const res = await fetchProfile(url);
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoadingProfile(false);
    }
  }

  function handleSelect(shortcode: string) {
    setSelected(shortcode);
    setResult(null); // a new pick invalidates the previous render
  }

  function handleCustomUrl(value: string) {
    setCustomUrl(value);
    setResult(null);
  }

  async function handleProcess() {
    if (!canProcess) return;
    const target = customActive
      ? { url: customUrl.trim() }
      : { shortcode: selected as string };
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const res = await processReel(target, ratio, fit);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Processing failed.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Establishment Crawler</h1>
        <p className="tagline">
          Paste an Instagram profile → pick a top reel → reshape & download.
        </p>
      </header>

      <UrlForm loading={loadingProfile} onSubmit={handleCrawl} />

      {error && <div className="error">{error}</div>}

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

          {canProcess && (
            <>
              <OutputControls
                ratio={ratio}
                fit={fit}
                onRatio={setRatio}
                onFit={setFit}
              />
              <div className="process-row">
                <button
                  className="process-btn"
                  type="button"
                  onClick={handleProcess}
                  disabled={processing}
                >
                  {processing ? "Processing…" : "Reshape video"}
                </button>
                {result && <DownloadButton result={result} />}
              </div>
            </>
          )}
        </>
      )}

      <footer>
        <small>
          For personal use. Scraping/redistributing content may violate Instagram's
          Terms of Service and copyright.
        </small>
      </footer>
    </div>
  );
}
