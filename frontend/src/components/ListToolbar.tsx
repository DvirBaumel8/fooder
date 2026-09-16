import { useEffect, useRef, useState } from "react";
import type { ListSort } from "../lib/listPresentation";

type ListToolbarProps = {
  shopName: string;
  value: string;
  onSearchChange: (value: string) => void;
  sort: ListSort;
  onSortChange: (sort: ListSort) => void;
};

const sortOptions: Array<{ value: ListSort; label: string }> = [
  { value: "newest", label: "חדש ביותר" },
  { value: "name", label: "לפי שם" },
  { value: "category", label: "לפי קטגוריה" },
];

function SortIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M7 6h10M9 12h6m-8 6h10" />
    </svg>
  );
}

export function ListToolbar({ shopName, value, onSearchChange, sort, onSortChange }: ListToolbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(value);
  const sortTriggerRef = useRef<HTMLButtonElement>(null);
  const selectedSort = sortOptions.find((option) => option.value === sort) ?? sortOptions[0];

  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  function closeSortMenu() {
    setIsMenuOpen(false);
    sortTriggerRef.current?.focus();
  }

  function selectSort(nextSort: ListSort) {
    onSortChange(nextSort);
    closeSortMenu();
  }

  return (
    <section className="list-toolbar" role="search">
      <input
        className="list-search"
        type="search"
        value={searchValue}
        onChange={(event) => {
          setSearchValue(event.target.value);
          onSearchChange(event.target.value);
        }}
        aria-label={`חיפוש ברשימת ${shopName}`}
        placeholder="חיפוש פריט"
      />
      <div
        className="sort-control"
        onKeyDown={(event) => {
          if (event.key === "Escape") closeSortMenu();
        }}
      >
        <button
          ref={sortTriggerRef}
          type="button"
          className="sort-trigger"
          aria-label={`מיון: ${selectedSort.label}`}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
        >
          <SortIcon />
        </button>
        {isMenuOpen ? (
          <div className="sort-menu" role="menu" aria-label="אפשרויות מיון">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={sort === option.value}
                onClick={() => selectSort(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
