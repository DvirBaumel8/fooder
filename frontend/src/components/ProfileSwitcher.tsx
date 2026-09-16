import { useEffect, useState } from "react";

export type Profile = "דביר" | "מאי";

const STORAGE_KEY = "fooder.profile";

function readStoredProfile(): Profile {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "דביר" || stored === "מאי" ? stored : "דביר";
}

export function useProfile(): [Profile, (profile: Profile) => void] {
  const [profile, setProfile] = useState<Profile>(readStoredProfile);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, profile);
  }, [profile]);

  return [profile, setProfile];
}

interface ProfileSwitcherProps {
  profile: Profile;
  onChange: (profile: Profile) => void;
}

export function ProfileSwitcher({ profile, onChange }: ProfileSwitcherProps) {
  return (
    <div className="profile-switcher" role="group" aria-label="בחירת פרופיל">
      {(["דביר", "מאי"] as const).map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          aria-pressed={name === profile}
          className={name === profile ? "profile-chip profile-chip-active" : "profile-chip"}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
