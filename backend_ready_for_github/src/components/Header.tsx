
import React from 'react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="h-16 bg-white shadow-sm flex items-center px-6 flex-shrink-0">
      <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
    </header>
  );
};
