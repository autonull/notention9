import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
}

export function StatCard({ label, value, icon, trend, trendValue, className = '' }: StatCardProps) {
  return (
    <div className={`bg-gray-800 p-4 rounded-xl border border-gray-700/50 shadow-sm ${className}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-gray-400 text-xs uppercase font-semibold tracking-wider">{label}</span>
        {icon && <div className="text-gray-500 opacity-80">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && (
          <span className={`text-xs ${
            trend === 'up' ? 'text-green-400' :
            trend === 'down' ? 'text-red-400' : 'text-gray-400'
          }`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'} {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}
