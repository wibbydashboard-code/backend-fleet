
import React from 'react';
import { AddIcon } from './Icons';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
      <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center transition-colors">
        <AddIcon />
        Registrar Pago
      </button>
    </header>
  );
};
