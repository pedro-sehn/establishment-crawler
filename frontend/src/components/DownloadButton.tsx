import { downloadUrl } from "../api";
import type { ProcessResponse } from "../types";

export default function DownloadButton({ result }: { result: ProcessResponse }) {
  return (
    <div className="download-box">
      <p>
        Ready — {result.width}×{result.height}
      </p>
      <a className="download-btn" href={downloadUrl(result.job_id)} download>
        ⬇ Download video
      </a>
    </div>
  );
}
