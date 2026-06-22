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
  const [dropdownStyle, setDropdownStyle] = useState({});
  const containerRef = useRef(null);
  const searchRef = useRef(null);
  const id = useId();

  // Calculate fixed position when opening
  const handleOpen = () => {
    if (disabled) return;
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setOpen(prev => !prev);
  };

  // Recalculate on scroll/resize
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownStyle(s => ({ ...s, top: rect.bottom + 4, left: rect.left, width: rect.width }));
      }
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

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

  // Focus search when opened
  useEffect(() => {
    if (open && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open, searchable]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const isGrouped = options.length > 0 && options[0].group !== undefined;
  const groups = isGrouped ? options : [{ group: null, items: options }];

  const filtered = groups
    .map(g => ({ ...g, items: g.items.filter(o => o.label.toLowerCase().includes(query.toLowerCase())) }))
    .filter(g => g.items.length > 0);

  const allItems = groups.flatMap(g => g.items);
  const selected = allItems.find(o => o.value === value);
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
        onClick={handleOpen}
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

      {/* Hidden required sentinel */}
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

      {/* Dropdown panel — fixed position, never affects document flow */}
      {open && (
        <div
          role="listbox"
          style={dropdownStyle}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden animate-dropdown"
        >
          {searchable && (
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
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

          <ul className="dropdown-scroll max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500 text-center">No results</li>
            ) : (
              filtered.map((group, gi) => (
                <div key={gi}>
                  {group.group && (
                    <li className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {group.group}
                    </li>
                  )}
                  {group.items.map(opt => {
                    const isActive = opt.value === value;
                    return (
                      <li
                        key={opt.value}
                        role="option"
                        aria-selected={isActive}
                        onMouseDown={() => handleSelect(opt.value)}
                        className={`
                          flex items-center justify-between px-3 py-2 text-sm cursor-pointer
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
