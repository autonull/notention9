import React from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  src?: string;
  pubkey?: string;
  alt?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'h-6 w-6',
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-16 w-16',
  '2xl': 'h-24 w-24',
};

export function Avatar({
  src,
  pubkey,
  alt = 'Avatar',
  size = 'md',
  className = '',
}: AvatarProps) {
  const finalSrc =
    src ||
    (pubkey
      ? `https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${pubkey}`
      : undefined);

  if (!finalSrc) {
    return (
      <div
        className={`bg-gray-700 rounded-full flex items-center justify-center border border-gray-600 ${sizeClasses[size]} ${className}`}
      >
        <span className="text-gray-400 text-xs">?</span>
      </div>
    );
  }

  return (
    <img
      src={finalSrc}
      alt={alt}
      className={`rounded-full bg-gray-700 object-cover border border-gray-600 ${sizeClasses[size]} ${className}`}
    />
  );
};
