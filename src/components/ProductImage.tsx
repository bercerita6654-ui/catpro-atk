/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ProductImageProps {
  src: string;
  name: string;
  category: string;
}

export function ProductImage({ src, name, category }: ProductImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Generate a consistent gradient background based on the product name
  const getGradientClass = (str: string) => {
    const code = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradients = [
      'from-slate-100 to-slate-200 text-slate-600',
      'from-emerald-50 to-emerald-100 text-emerald-700',
      'from-blue-50 to-blue-100 text-blue-700',
      'from-indigo-50 to-indigo-100 text-indigo-700',
      'from-purple-50 to-purple-100 text-purple-700',
      'from-amber-50 to-amber-100 text-amber-700',
      'from-teal-50 to-teal-100 text-teal-700',
    ];
    return gradients[code % gradients.length];
  };

  const gradient = getGradientClass(name);
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();

  const handleImageLoaded = () => {
    setLoading(false);
  };

  const handleImageError = () => {
    setError(true);
    setLoading(false);
  };

  if (!src || error) {
    return (
      <div className={`w-full h-20 xs:h-24 sm:h-36 md:h-48 rounded-t-xl flex flex-col items-center justify-center p-2 sm:p-4 bg-gradient-to-br ${gradient} relative overflow-hidden transition-all duration-300`}>
        <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-white/60 backdrop-blur-xs text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-medium">
          {category}
        </div>
        <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-full bg-white/90 shadow-xs flex items-center justify-center mb-1 sm:mb-2">
          <ImageIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5 opacity-80 text-slate-600" />
        </div>
        <span className="font-bold text-xs sm:text-lg tracking-wider opacity-90">{initials}</span>
        <span className="text-[8px] sm:text-[10px] text-center mt-0.5 font-medium max-w-[90%] line-clamp-1 opacity-70">
          No Image
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-20 xs:h-24 sm:h-36 md:h-48 rounded-t-xl relative bg-slate-50 overflow-hidden group">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 animate-pulse">
          <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onLoad={handleImageLoaded}
        onError={handleImageError}
        className={`w-full h-20 xs:h-24 sm:h-36 md:h-48 object-cover transition-transform duration-500 group-hover:scale-105 ${
          loading ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-slate-900/80 backdrop-blur-md text-white text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-medium">
        {category}
      </div>
    </div>
  );
}
