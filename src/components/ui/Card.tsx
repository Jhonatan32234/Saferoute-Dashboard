import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({ 
  title, 
  subtitle,
  children, 
  className = '', 
  headerRight,
  hover = false,
  padding = 'md'
}: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5 lg:p-6',
    lg: 'p-6 lg:p-8',
  };

  return (
    <div className={`
      bg-[#0d1b33] border border-[#2a4070]/50 rounded-xl shadow-lg
      ${hover ? 'hover:border-[#0ea5e9]/30 hover:shadow-glow transition-all duration-200' : ''}
      ${className}
    `}>
      {(title || subtitle || headerRight) && (
        <div className="flex items-center justify-between px-5 lg:px-6 py-4 border-b border-[#2a4070]/30">
          <div>
            {title && <h3 className="text-lg font-bold text-[#e8eef5]">{title}</h3>}
            {subtitle && <p className="text-xs text-[#627d98] mt-1">{subtitle}</p>}
          </div>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div className={paddings[padding]}>
        {children}
      </div>
    </div>
  );
}