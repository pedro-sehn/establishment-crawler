import type { Profile } from "../types";

export default function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <section className="profile-card">
      <img
        className="avatar"
        src={profile.profile_pic_url}
        alt={`${profile.username} profile`}
        referrerPolicy="no-referrer"
      />
      <div className="profile-meta">
        <h2>@{profile.username}</h2>
        {profile.full_name && <p className="full-name">{profile.full_name}</p>}
        {profile.biography && <p className="bio">{profile.biography}</p>}
      </div>
    </section>
  );
}
