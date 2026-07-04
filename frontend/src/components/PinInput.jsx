import { useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * OTP-style 6-digit PIN input.
 * Props:
 *   length     — number of digits (default 6)
 *   onComplete — called with the full PIN string when all digits entered
 *   error      — show red/shake state
 *   disabled   — disable all inputs
 */
const PinInput = ({ length = 6, onComplete, error = false, disabled = false }) => {
  const [digits, setDigits] = useState(Array(length).fill(''));
  const [focused, setFocused] = useState(null);
  const [visible, setVisible] = useState(false);
  const refs = useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const val = value.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);

    if (val && index < length - 1) refs.current[index + 1]?.focus();

    if (newDigits.every(d => d !== '')) onComplete?.(newDigits.join(''));
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const newDigits = Array(length).fill('');
    pasted.split('').forEach((ch, i) => { newDigits[i] = ch; });
    setDigits(newDigits);
    const nextEmpty = newDigits.findIndex(d => d === '');
    refs.current[nextEmpty === -1 ? length - 1 : nextEmpty]?.focus();
    if (pasted.length === length) onComplete?.(pasted);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        {digits.map((d, i) => {
          const isFocused = focused === i;
          const hasValue = d !== '';

          return (
            <input
              key={i}
              ref={el => refs.current[i] = el}
              type={visible ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={d}
              disabled={disabled}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={() => setFocused(i)}
              onBlur={() => setFocused(null)}
              className={[
                'w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-200',
                'focus:outline-none',
                'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
                // Error state
                error
                  ? 'border-red-500 dark:border-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.25)] animate-shake'
                  // Focused state — purple glow
                  : isFocused
                  ? 'border-primary-500 dark:border-primary-400 shadow-[0_0_0_3px_rgba(147,51,234,0.25)] dark:shadow-[0_0_0_3px_rgba(192,132,252,0.2)]'
                  // Has value — solid primary border
                  : hasValue
                  ? 'border-primary-400 dark:border-primary-500'
                  // Default — hover glow on hover via group
                  : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500 hover:shadow-[0_0_0_2px_rgba(147,51,234,0.15)]',
                disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text',
              ].join(' ')}
            />
          );
        })}
      </div>

      {/* Show/hide PIN toggle — icon only */}
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        disabled={disabled}
        className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={visible ? 'Hide PIN' : 'Show PIN'}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};

export default PinInput;
