import React from 'react';
import { Search, X, RotateCcw } from 'lucide-react';

export function CommonFilterBar({
  search = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  filters = [],
  onReset,
  hasActiveFilters = false,
  activeFilterCount = 0
}) {
  return (
    <div className="admin-filter-bar">
      <div className="search-box">
        <Search size={15} className="search-icon" />
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          aria-label={searchPlaceholder}
        />
        {search && (
          <button
            type="button"
            className="clear-search"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {filters.map(filter => (
        <select
          key={filter.id}
          className="filter-select"
          value={filter.value}
          onChange={e => filter.onChange(e.target.value)}
          aria-label={filter.ariaLabel || filter.label || filter.id}
        >
          {filter.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}

      {hasActiveFilters && (
        <button
          type="button"
          className="reset-filter-btn"
          onClick={onReset}
          title="Reset all active filters"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
          {activeFilterCount > 0 && <span className="active-dot">{activeFilterCount}</span>}
        </button>
      )}
    </div>
  );
}

export default CommonFilterBar;
