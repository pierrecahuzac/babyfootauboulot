const Spinner = ({ size = 20, className = '', label = 'Chargement…' }) => (
  <div className={`inline-flex items-center justify-center ${className}`} role="status" aria-label={label}>
    <span
      className="animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-violet-600 dark:border-t-violet-400"
      style={{ width: size, height: size }}
    />
    <span className="sr-only">{label}</span>
  </div>
);

export const PageSpinner = ({ label = 'Chargement…' }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-3">
    <Spinner size={28} />
    <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
  </div>
);

export const ButtonSpinner = ({ size = 16 }) => (
  <span className="animate-spin rounded-full border-2 border-white/30 border-t-white inline-block" style={{ width: size, height: size }} />
);

export default Spinner;
