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
    <div className="flex gap-1 text-sm">
      {(["דביר", "מאי"] as const).map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(name)}
          className={
            name === profile
              ? "rounded-full bg-blue-600 px-3 py-1 text-white"
              : "rounded-full border border-slate-300 px-3 py-1"
          }
        >
          {name}
        </button>
      ))}
    </div>
  );
}
