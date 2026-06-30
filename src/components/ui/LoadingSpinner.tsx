interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ message = 'Cargando...', size = 'md' }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-8 h-8 border-3',
    md: 'w-12 h-12 border-4',
    lg: 'w-16 h-16 border-4',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
      <div className="relative">
        <div className={`${sizes[size]} rounded-full border-[#2a3a4a]`}></div>
        <div className={`${sizes[size]} rounded-full border-[#ff6b35] border-t-transparent animate-spin absolute top-0 left-0`}></div>
      </div>
      {message && (
        <p className="mt-4 text-[#8b9db5] text-sm animate-pulse">{message}</p>
      )}
    </div>
  );
}