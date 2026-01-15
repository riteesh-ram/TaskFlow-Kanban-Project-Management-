import React from 'react';
import { Button } from '@/components/ui/button';

interface FilterChipsProps {
  options: string[];
  active: string[];
  onToggle: (value: string) => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ options, active, onToggle }) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map((option) => (
        <Button
          key={option}
          variant={active.includes(option) ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToggle(option)}
          className="capitalize"
        >
          {option}
        </Button>
      ))}
    </div>
  );
};
