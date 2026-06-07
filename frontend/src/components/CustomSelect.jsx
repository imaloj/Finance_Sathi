import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

const CustomSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  searchable = false,
  disabled = false,
  className = '',
  required = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const id = useId();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open, searchable]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Normalise options into grouped format for uniform rendering
  const isGrouped = options.length > 0 && options[0].group !== undefined;
  const groups = isGrouped
    ? options
    : [{ group: null, items: options }];

  // Filter by search query
  const filtered = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase())
      ),
    }))
    .filter((g) => g.items.length > 0);

  // Resolve display label for current value
  const allItems = groups.flatMap((g) => g.items);
  const selected = allItems.find((o) => o.value === value);
  const displayLabel = selected ? selected.label : null;

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`
          w-full flex items-center justify-between gap-2
          border rounded-lg px-3 py-2 text-sm text-left
          transition-all duration-150 outline-none
          bg-white dark:bg-gray-800
          border-gray-300 dark:border-gray-600
          text-gray-900 dark:text-gray-100
          hover:border-primary-500 dark:hover:border-primary-400
          focus:ring-2 focus:ring-primary-500 focus:border-primary-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${open ? 'border-primary-500 ring-2 ring-primary-500/30' : ''}
        `}
      >
        <span className={displayLabel ? '' : 'text-gray-400 dark:text-gray-500'}>
          {displayLabel ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Hidden required sentinel for form validation */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value ?? ''}
          onChange={() => {}}
          className="absolute inset-0 w-full opacity-0 pointer-events-none"
        />
      )}

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          className={`
            absolute z-50 mt-1 w-full min-w-40
            bg-white dark:bg-gray-800
            border border-gray-200 dark:border-gray-600
            rounded-lg shadow-lg
            overflow-hidden
            animate-dropdown
          `}
          style={{ top: '100%' }}
        >
          {/* Search box */}
          {searchable && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md
                    bg-gray-50 dark:bg-gray-700
                    border border-gray-200 dark:border-gray-600
                    text-gray-900 dark:text-gray-100
                    placeholder:text-gray-400 dark:placeholder:text-gray-500
                    focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <ul className="dropdown-scroll max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500 text-center">
                No results
              </li>
            ) : (
              filtered.map((group, gi) => (
                <div key={gi}>
                  {/* Group label */}
                  {group.group && (
                    <li className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {group.group}
                    </li>
                  )}
                  {group.items.map((opt) => {
                    const isActive = opt.value === value;
                    return (
                      <li
                        key={opt.value}
                        role="option"
                        aria-selected={isActive}
                        onMouseDown={() => handleSelect(opt.value)}
                        className={`
                          flex items-center justify-between
                          px-3 py-2 text-sm cursor-pointer
                          transition-colors duration-100
                          ${isActive
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                            : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }
                        `}
                      >
                        <span>{opt.label}</span>
                        {isActive && <Check size={14} className="text-primary-600 dark:text-primary-400 shrink-0" />}
                      </li>
                    );
                  })}
                </div>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
