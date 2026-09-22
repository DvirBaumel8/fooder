import { useCallback, useEffect, useRef, useState } from "react";
import { useDismissOnOutsidePointerDown } from "../hooks/useDismissOnOutsidePointerDown";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeMenu = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useDismissOnOutsidePointerDown(rootRef, isOpen, () => closeMenu());

  const selectProfile = (name: Profile) => {
    onChange(name);
    closeMenu(true);
  };

  return (
    <div
      ref={rootRef}
      className="profile-menu-root"
      onKeyDown={(event) => {
        if (isOpen && event.key === "Escape") closeMenu(true);
      }}
    >
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
              {name === profile && <span className="profile-menu-selection" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
