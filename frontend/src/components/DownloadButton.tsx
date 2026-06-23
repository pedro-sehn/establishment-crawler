import { downloadUrl } from "../api";
import type { ProcessResponse } from "../types";

export default function DownloadButton({
  result,
}: {
  result: ProcessResponse;
}) {
  return (
    <div className="flex items-center gap-3 text-muted">
      <p className="m-0">
        Pronto — {result.width}×{result.height}
      </p>
      <a
        className="inline-block rounded-[10px] bg-[#2f9e44] px-5 py-2.5 font-semibold text-white no-underline"
        href={downloadUrl(result.job_id)}
        download
      >
        ⬇ Baixar vídeo
      </a>
    </div>
  );
}
