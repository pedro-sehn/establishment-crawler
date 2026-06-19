import type { Profile } from "../types";
import LogoPalette from "./LogoPalette";

export default function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <section className="my-6 flex flex-col gap-5 rounded-2xl border border-border bg-panel p-5 sm:flex-row">
      <div className="flex flex-col items-center gap-2">
        <img
          className="h-[84px] w-[84px] shrink-0 rounded-full border-2 border-accent object-cover"
          src={profile.profile_pic_url}
          alt={`Logo de ${profile.username}`}
          referrerPolicy="no-referrer"
        />
        <a
          href={profile.profile_pic_url}
          download={`${profile.username}-logo.jpg`}
          className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-text"
        >
          ⬇ Baixar logo
        </a>
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="m-0 text-xl font-bold">@{profile.username}</h2>
        {profile.full_name && (
          <p className="mt-0.5 mb-0 font-semibold text-text">{profile.full_name}</p>
        )}
        {profile.biography && (
          <p className="mt-1 mb-0 whitespace-pre-wrap text-muted">{profile.biography}</p>
        )}
        {profile.external_url && (
          <a
            href={profile.external_url}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-flex items-center gap-1 break-all text-sm font-medium text-accent-2 hover:underline"
          >
            🔗 {profile.external_url}
          </a>
        )}

        <LogoPalette imageUrl={profile.profile_pic_url} />
      </div>
    </section>
  );
}
