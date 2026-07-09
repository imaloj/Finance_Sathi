/**
 * Displays user avatar — image if set, initials fallback.
 * Props:
 *   user    — user object with .avatar and .name
 *   size    — 'sm' | 'md' | 'lg' (default 'md')
 *   className — extra classes
 */
const sizeMap = {
  xs:  { outer: 'w-7 h-7',   text: 'text-xs' },
  sm:  { outer: 'w-9 h-9',   text: 'text-sm' },
  md:  { outer: 'w-12 h-12', text: 'text-base' },
  lg:  { outer: 'w-16 h-16', text: 'text-xl' },
  xl:  { outer: 'w-20 h-20', text: 'text-2xl' },
};

const Avatar = ({ user, size = 'md', className = '' }) => {
  const s = sizeMap[size] || sizeMap.md;
  const initial = (user?.name?.[0] || '?').toUpperCase();

  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name || 'Avatar'}
        className={`${s.outer} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`
      ${s.outer} rounded-full
      bg-primary-100 dark:bg-primary-900/40
      flex items-center justify-center shrink-0
      text-primary-600 dark:text-primary-400 font-bold
      ${s.text} ${className}
    `}>
      {initial}
    </div>
  );
};

export default Avatar;
