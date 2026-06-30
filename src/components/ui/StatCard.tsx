import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function StatCard({ 
  label, 
  value, 
  color = '#0ea5e9',
  icon,
  trend 
}: StatCardProps) {
  return (
    <div className="bg-[#0f1f3a] border border-[#2a4070]/50 rounded-xl p-4 lg:p-5 hover:border-[#0ea5e9]/20 hover:shadow-glow-sm transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[#627d98] uppercase tracking-wider">
          {label}
        </p>
        {icon && (
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
            style={{ backgroundColor: `${color}15` }}
          >
            {icon}
          </div>
        )}
      </div>
      
      <p 
        className="text-2xl lg:text-3xl font-bold mb-1"
        style={{ color }}
      >
        {value}
      </p>
      
      {trend && (
        <div className="flex items-center gap-1">
          <svg 
            className={`w-3 h-3 ${trend.isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'}`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            {trend.isPositive ? (
              <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            ) : (
              <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
            )}
          </svg>
          <span className={`text-xs font-medium ${trend.isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {trend.value}%
          </span>
        </div>
      )}
    </div>
  );
}