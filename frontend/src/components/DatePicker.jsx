import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const MIN_DATE = new Date(2000, 0, 1);
const MAX_DATE = new Date();

// Returns 3-letter uppercase weekday: SUN, MON, TUE...
const formatWeekdayName = (date) =>
  date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
const DatePicker = ({ value, onChange, required = false, disabled = false, className = '' }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = value && isValid(parse(value, 'yyyy-MM-dd', new Date()))
    ? parse(value, 'yyyy-MM-dd', new Date())
    : undefined;

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (date) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'));
      setOpen(false);
    }
  };

  const displayValue = selected ? format(selected, 'dd MMM yyyy') : '';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <div
        onClick={() => !disabled && setOpen((p) => !p)}
        className={[
          'w-full flex items-center gap-2 border rounded-lg px-3 py-2 text-sm cursor-pointer',
          'transition-all duration-150 select-none',
          'bg-white dark:bg-gray-800',
          'text-gray-900 dark:text-gray-100',
          'hover:border-primary-500 dark:hover:border-primary-400',
          open
            ? 'border-primary-500 ring-2 ring-primary-500/30'
            : 'border-gray-300 dark:border-gray-600',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <CalendarDays size={15} className="text-gray-400 dark:text-gray-500 shrink-0" />
        <span className={displayValue ? '' : 'text-gray-400 dark:text-gray-500'}>
          {displayValue || 'Select date'}
        </span>
      </div>

      {/* Hidden required sentinel */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value ?? ''}
          onChange={() => {}}
          className="absolute inset-0 opacity-0 pointer-events-none"
        />
      )}

      {/* Calendar panel */}
      {open && (
        <div className="absolute z-60 mt-1 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-3 animate-dropdown">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            disabled={[{ before: MIN_DATE }, { after: MAX_DATE }]}
            defaultMonth={selected ?? MAX_DATE}
            showOutsideDays
            formatters={{ formatWeekdayName }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === 'left'
                  ? <ChevronLeft size={14} />
                  : <ChevronRight size={14} />,
            }}
            classNames={{
              root:            'w-[308px]',
              months:          'flex flex-col',
              month:           'space-y-2',
              month_caption:   'flex items-center justify-between px-1 mb-1',
              caption_label:   'text-sm font-semibold text-gray-900 dark:text-gray-100',
              nav:             'flex items-center gap-1',
              button_previous: [
                'inline-flex items-center justify-center w-7 h-7 rounded-md',
                'text-gray-500 dark:text-gray-400',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
              ].join(' '),
              button_next: [
                'inline-flex items-center justify-center w-7 h-7 rounded-md',
                'text-gray-500 dark:text-gray-400',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-colors disabled:opacity-30 disabled:cursor-not-allowed',
              ].join(' '),
              month_grid:  'w-full border-collapse',
              weekdays:    'flex',
              weekday:     'w-10 text-center text-xs font-semibold text-gray-400 dark:text-gray-500 pb-1 tracking-wide',
              weeks:       'flex flex-col gap-0.5',
              week:        'flex',
              day:         'w-10 h-9 p-0 flex items-center justify-center',
              day_button: [
                'w-10 h-9 rounded-lg text-sm flex items-center justify-center',
                'text-gray-700 dark:text-gray-200',
                'hover:bg-primary-50 dark:hover:bg-primary-900/30',
                'hover:text-primary-700 dark:hover:text-primary-300',
                'transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
              ].join(' '),
              selected: [
                '[&>button]:bg-primary-600 [&>button]:text-white',
                '[&>button]:hover:bg-primary-700',
                '[&>button]:font-semibold',
              ].join(' '),
              today:    '[&>button]:font-bold [&>button]:text-primary-600 dark:[&>button]:text-primary-400',
              outside:  '[&>button]:text-gray-300 dark:[&>button]:text-gray-600 [&>button]:hover:bg-transparent',
              disabled: '[&>button]:text-gray-300 dark:[&>button]:text-gray-600 [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent',
              hidden:   'invisible',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default DatePicker;
