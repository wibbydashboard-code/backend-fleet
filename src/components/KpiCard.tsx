
import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'amber' | 'red';
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  amber: 'bg-amber-100 text-amber-600',
  red: 'bg-red-100 text-red-600',
};

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon, color }) => {
  return (
    <div className="kpi-card bg-white p-5 rounded-lg shadow flex items-center transition duration-200 ease-in-out hover:transform hover:-translate-y-1 hover:shadow-lg">
      <div className={`p-3 rounded-full ${colorClasses[color]}`}>
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
};
