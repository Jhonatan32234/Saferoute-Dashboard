import { SelectHTMLAttributes, forwardRef } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[#8b9db5]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`
            w-full bg-[#1a2430] border rounded-lg px-4 py-2.5
            text-[#e0e0e0] 
            focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/50 focus:border-transparent
            transition-all duration-200 appearance-none cursor-pointer
            ${error ? 'border-[#e94560]' : 'border-[#2a3a4a] hover:border-[#354555]'}
            ${className}
          `}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%235a6e85' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '1.5em 1.5em',
            paddingRight: '2.5rem',
          }}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-[#141b22] text-[#e0e0e0]">
              {option.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="text-sm text-[#e94560] mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;