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
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-numeric chars except
    const rawValue = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    const numValue = rawValue === '' ? 0 : parseInt(rawValue, 10);
    onChange(numValue);
  };

  return (
    <input
      type="text"
      className={className}
      value={value === 0 ? '' : formatNumber(value)}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
};

export default CurrencyInput;