import { useRef, useState } from 'react';

/**
 * OTP-style 6-digit PIN input.
 * Props:
 *   length    — number of digits (default 6)
 *   onComplete — called with the full PIN string when all digits entered
 *   error     — show red state
 *   disabled  — disable all inputs
 */
const PinInput = ({ length = 6, onComplete, error = false, disabled = false }) => {
  const [digits, setDigits] = useState(Array(length).fill(''));
  const refs = useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // digits only
    const val = value.slice(-1); // take last char if paste
    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);

    if (val && index < length - 1) {
      refs.current[index + 1]?.focus();
    }

    if (newDigits.every(d => d !== '')) {
      onComplete?.(newDigits.join(''));
    }
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

  const reset = () => {
    setDigits(Array(length).fill(''));
    refs.current[0]?.focus();
  };

  // Expose reset via ref if needed
  PinInput.reset = reset;

  return (
    <div className="flex items-center gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={[
            'w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all',
            'focus:outline-none',
            'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
            error
              ? 'border-red-500 dark:border-red-500 focus:ring-2 focus:ring-red-400 animate-shake'
              : d
              ? 'border-primary-500 dark:border-primary-400 focus:ring-2 focus:ring-primary-400'
              : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-400',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
        />
      ))}
    </div>
  );
};

export default PinInput;
