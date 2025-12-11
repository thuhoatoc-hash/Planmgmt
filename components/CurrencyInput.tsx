
import React from 'react';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, className, placeholder, disabled }) => {
  
  const formatNumber = (num: number) => {
    // Uses dots for thousands separator by default in vi-VN
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-numeric chars except
    const rawValue = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    const numValue = rawValue === '' ? 0 : parseInt(rawValue, 10);
    onChange(numValue);
  };

  // Add text-right by default if not present, to align numbers correctly
  const finalClassName = className?.includes('text-right') ? className : `${className || ''} text-right`;

  return (
    <input
      type="text"
      className={finalClassName}
      value={value === 0 ? '' : formatNumber(value)}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
};

export default CurrencyInput;
