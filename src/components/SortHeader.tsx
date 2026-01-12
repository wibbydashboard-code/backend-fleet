import React from 'react';

interface SortHeaderProps {
    label: string;
    sortKey: string;
    currentSort: { key: string; direction: 'asc' | 'desc' } | null;
    onSort: (key: string) => void;
    className?: string;
}

export const SortHeader: React.FC<SortHeaderProps> = ({ label, sortKey, currentSort, onSort, className = "" }) => {
    const isActive = currentSort?.key === sortKey;

    return (
        <th
            className={`px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center gap-1">
                <span>{label}</span>
                <div className="flex flex-col -space-y-1">
                    <svg
                        className={`w-2 h-2 ${isActive && currentSort?.direction === 'asc' ? 'text-blue-600 font-bold' : 'text-slate-300 group-hover:text-slate-400'}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 4l-10 10h20l-10-10z" />
                    </svg>
                    <svg
                        className={`w-2 h-2 ${isActive && currentSort?.direction === 'desc' ? 'text-blue-600 font-bold' : 'text-slate-300 group-hover:text-slate-400'}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 20l10-10H2l10 10z" />
                    </svg>
                </div>
            </div>
        </th>
    );
};
