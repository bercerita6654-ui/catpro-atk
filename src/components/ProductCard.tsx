/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Minus, Tag } from 'lucide-react';
import { Product } from '../types';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  key?: string;
  product: Product;
  cartQuantity: number;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (product: Product) => void;
}

export function ProductCard({
  product,
  cartQuantity,
  onAddToCart,
  onRemoveFromCart,
}: ProductCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '250px', // Load product cards 250px before they enter viewport
        threshold: 0.01,
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const isOutOfStock = product.qty <= 0;
  
  // Format currency
  const formattedPrice = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(product.price);

  // Stock status text and color
  let stockBadgeColor = 'bg-green-50 text-green-700 border-green-100';
  let stockText = 'Stok Tersedia';

  if (product.qty === 0) {
    stockBadgeColor = 'bg-rose-50 text-rose-700 border-rose-100';
    stockText = 'Stok Habis';
  } else if (product.qty < 5) {
    stockBadgeColor = 'bg-amber-50 text-amber-700 border-amber-100';
    stockText = 'Stok Terbatas';
  }

  if (!isVisible) {
    return (
      <div
        ref={cardRef}
        id={`product-card-${product.sku}-placeholder`}
        className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between p-1.5 xs:p-2 sm:p-4 min-h-[160px] xs:min-h-[190px] sm:min-h-[300px] md:min-h-[380px] h-full animate-pulse"
      >
        <div className="w-full h-20 xs:h-24 sm:h-36 md:h-48 bg-slate-100 rounded-t-xl mb-1 sm:mb-3"></div>
        <div className="space-y-1 sm:space-y-2 flex-grow">
          <div className="h-1.5 sm:h-3 bg-slate-100 rounded w-1/3"></div>
          <div className="h-2.5 sm:h-4 bg-slate-100 rounded w-3/4"></div>
          <div className="h-1.5 sm:h-3 bg-slate-100 rounded w-1/2"></div>
        </div>
        <div className="mt-auto space-y-1.5 sm:space-y-2 pt-1.5 sm:pt-3 border-t border-slate-100">
          <div className="h-4 sm:h-6 bg-slate-100 rounded w-1/2 mx-auto"></div>
          <div className="h-6 sm:h-8 bg-slate-100 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      id={`product-card-${product.sku}`}
      className="bg-white rounded-lg border border-slate-200 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col h-full group overflow-hidden"
    >
      {/* Product Image */}
      <ProductImage src={product.imageUrl} name={product.name} category={product.category} />

      {/* Content */}
      <div className="p-1.5 xs:p-2 sm:p-4 flex flex-col flex-grow">
        {/* Brand and SKU */}
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 mb-1 sm:mb-1.5 text-[8px] xs:text-[9px] sm:text-xs">
          <span className="flex items-center gap-0.5 sm:gap-1 font-semibold text-blue-600 bg-blue-50/50 px-1 py-0.5 sm:px-2 rounded-xs uppercase tracking-wide truncate max-w-[55px] xs:max-w-none">
            <Tag className="w-2 h-2 sm:w-3 sm:h-3 shrink-0" />
            {product.brand}
          </span>
          <span className="font-mono text-slate-400 bg-slate-50 px-1 py-0.5 sm:px-2 rounded-xs text-[7px] xs:text-[8px] sm:text-[10px] truncate max-w-[55px] xs:max-w-none">
            SKU: {product.sku}
          </span>
        </div>

        {/* Product Name */}
        <h3 className="font-sans font-medium text-slate-800 leading-snug mb-1 sm:mb-2 flex-grow hover:text-blue-700 transition-colors whitespace-normal text-wrap text-[9px] xs:text-[10px] sm:text-xs md:text-sm" title={product.name}>
          {product.name}
        </h3>

        {/* Stock Status only (Price hidden in Catalog as requested) */}
        <div className="space-y-1.5 sm:space-y-2 mt-auto pt-1.5 sm:pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            <span className={`text-[8px] xs:text-[9px] sm:text-[11px] font-semibold px-1 py-0.5 sm:px-2.5 sm:py-1.5 rounded-md border ${stockBadgeColor} w-full text-center shadow-2xs truncate`}>
              {stockText}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-0.5 sm:pt-1">
            {isOutOfStock ? (
              <button
                disabled
                className="w-full py-1 sm:py-2 px-1 sm:px-4 bg-slate-100 text-slate-400 text-[8px] xs:text-[9px] sm:text-xs font-semibold rounded flex items-center justify-center gap-1 sm:gap-2 cursor-not-allowed"
              >
                Habis
              </button>
            ) : cartQuantity > 0 ? (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded p-0.5">
                <button
                  onClick={() => onRemoveFromCart(product)}
                  className="p-1 sm:p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors"
                  aria-label="Kurangi jumlah"
                >
                  <Minus className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                </button>
                <span className="font-bold text-blue-800 text-[9px] xs:text-[10px] sm:text-xs font-sans px-1">
                  {cartQuantity} {product.unit}
                </span>
                <button
                  onClick={() => onAddToCart(product)}
                  className="p-1 sm:p-1.5 text-blue-700 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                  aria-label="Tambah jumlah"
                >
                  <Plus className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onAddToCart(product)}
                className="w-full py-1 sm:py-2 px-1 sm:px-4 bg-slate-800 hover:bg-slate-900 text-white text-[8px] xs:text-[9px] sm:text-xs font-semibold rounded transition-all shadow-xs flex items-center justify-center gap-1 sm:gap-2 group-hover:shadow-sm cursor-pointer"
              >
                <ShoppingCart className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                <span className="inline sm:hidden">+ Krj</span>
                <span className="hidden sm:inline">+ Keranjang</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
