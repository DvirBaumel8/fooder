import { useEffect, useRef, useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectProfile = (name: Profile) => {
    onChange(name);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="profile-menu-root">
      <button
        ref={triggerRef}
        type="button"
        className="profile-trigger"
        aria-label={`פרופיל: ${profile}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {profile.slice(0, 1)}
      </button>
      {isOpen && (
        <div className="profile-menu" role="menu">
          {(["דביר", "מאי"] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="menuitemradio"
              aria-checked={name === profile}
              onClick={() => selectProfile(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
