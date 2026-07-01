/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  RefreshCw,
  ShoppingBag,
  ListFilter,
  CheckCircle,
  Database,
  ArrowUpDown,
  AlertTriangle,
  X,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  History,
  Tag,
  Barcode,
  Package,
} from 'lucide-react';
import { fetchProducts } from './utils/csvParser';
import { Product, CartItem } from './types';
import { ProductCard } from './components/ProductCard';
import { Cart } from './components/Cart';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedBrand, setSelectedBrand] = useState<string>('Semua');
  const [showOnlyInStock, setShowOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('name-asc');

  // Suggestion list state and ref
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute dynamic autocomplete suggestions based on products (sku, brand, name)
  const suggestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    const list: {
      type: 'brand' | 'sku' | 'product';
      value: string;
      label: string;
      sublabel?: string;
    }[] = [];

    // 1. Brand matches
    const uniqueBrands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))) as string[];
    const matchingBrands = uniqueBrands
      .filter(brand => brand.toLowerCase().includes(q))
      .slice(0, 3)
      .map(brand => ({
        type: 'brand' as const,
        value: brand,
        label: brand,
        sublabel: 'Merk / Brand'
      }));
    list.push(...matchingBrands);

    // 2. SKU matches
    const matchingSKUs = products
      .filter(p => p.sku && p.sku.toLowerCase().includes(q))
      .slice(0, 3)
      .map(p => ({
        type: 'sku' as const,
        value: p.sku,
        label: p.sku,
        sublabel: p.name
      }));
    list.push(...matchingSKUs);

    // 3. Product name matches
    const matchingProducts = products
      .filter(p => p.name && p.name.toLowerCase().includes(q))
      .filter(p => !matchingSKUs.some(s => s.value === p.sku))
      .slice(0, 7)
      .map(p => ({
        type: 'product' as const,
        value: p.name,
        label: p.name,
        sublabel: `SKU: ${p.sku} | ${p.brand || 'No Brand'}`
      }));
    list.push(...matchingProducts);

    return list.slice(0, 10);
  }, [searchQuery, products]);

  // Shopping cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('balistationery_cart') || localStorage.getItem('stockflow_cart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (e) {
      console.error('Failed to load cart from localStorage:', e);
      return [];
    }
  });

  // Save cart to localStorage on changes
  useEffect(() => {
    localStorage.setItem('balistationery_cart', JSON.stringify(cart));
  }, [cart]);

  // State to hold the stock alert notification details
  const [stockAlert, setStockAlert] = useState<{ message: string; productName: string } | null>(null);

  // Recent searches state
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('balistationery_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Save unique search query
  const saveRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return;

    setRecentSearches(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 8);
      try {
        localStorage.setItem('balistationery_recent_searches', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recent searches:', e);
      }
      return updated;
    });
  };

  // Debounced save search query on typing
  useEffect(() => {
    if (!searchQuery) return;
    const timer = setTimeout(() => {
      saveRecentSearch(searchQuery);
    }, 1500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle removing a single recent search term
  const handleRemoveRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(q => q.toLowerCase() !== term.toLowerCase());
      try {
        localStorage.setItem('balistationery_recent_searches', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recent searches:', e);
      }
      return updated;
    });
  };

  // Handle clearing all recent searches
  const handleClearAllRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('balistationery_recent_searches');
    } catch (e) {
      console.error('Failed to clear recent searches:', e);
    }
  };

  // Auto clear stock alert after 4 seconds
  useEffect(() => {
    if (stockAlert) {
      const timer = setTimeout(() => {
        setStockAlert(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [stockAlert]);

  // Mobile navigation tab ('catalog' | 'cart')
  const [activeTab, setActiveTab] = useState<'catalog' | 'cart'>('catalog');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 100;

  // Reset page when filters or searches change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedBrand, showOnlyInStock, sortBy]);

  // Scroll to top of window when page changes
  useEffect(() => {
    if (!loading) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage]);

  // Fetch initial catalog
  const loadCatalog = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err: any) {
      setError(
        'Gagal memuat katalog produk. Pastikan koneksi internet aktif dan link spreadsheet valid.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Sync cart item addition
  const handleAddToCart = (product: Product) => {
    let limitReached = false;
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.sku === product.sku);
      if (existing) {
        // limit based on available stock
        if (existing.quantity >= product.qty) {
          limitReached = true;
          return prevCart;
        }
        return prevCart.map(item =>
          item.product.sku === product.sku
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      if (product.qty <= 0) {
        limitReached = true;
        return prevCart;
      }
      return [...prevCart, { product, quantity: 1 }];
    });

    if (limitReached) {
      setStockAlert({
        productName: product.name,
        message: `Stok tidak mencukupi! Batas maksimum pemesanan untuk "${product.name}" sesuai stok kami telah tercapai.`,
      });
    }
  };

  // Sync cart item decrement
  const handleRemoveFromCart = (product: Product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.sku === product.sku);
      if (!existing) return prevCart;
      if (existing.quantity === 1) {
        return prevCart.filter(item => item.product.sku !== product.sku);
      }
      return prevCart.map(item =>
        item.product.sku === product.sku
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  };

  // Set explicit quantity for a cart item
  const handleSetCartItemQuantity = (product: Product, quantity: number) => {
    let finalQty = quantity;
    let limitReached = false;

    if (finalQty <= 0) {
      setCart(prevCart => prevCart.filter(item => item.product.sku !== product.sku));
      return;
    }

    if (finalQty > product.qty) {
      finalQty = product.qty;
      limitReached = true;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.sku === product.sku);
      if (existing) {
        return prevCart.map(item =>
          item.product.sku === product.sku
            ? { ...item, quantity: finalQty }
            : item
        );
      }
      return [...prevCart, { product, quantity: finalQty }];
    });

    if (limitReached) {
      setStockAlert({
        productName: product.name,
        message: `Stok tidak mencukupi! Batas maksimum pemesanan untuk "${product.name}" sesuai stok kami telah tercapai (${product.qty} ${product.unit}).`,
      });
    }
  };

  // Clear single item completely
  const handleClearCartItem = (product: Product) => {
    setCart(prevCart => prevCart.filter(item => item.product.sku !== product.sku));
  };

  // Clear entire cart
  const handleClearAllCart = () => {
    setCart([]);
  };

  // Update item note in cart
  const handleUpdateCartItemNote = (product: Product, note: string) => {
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.sku === product.sku
          ? { ...item, note }
          : item
      )
    );
  };

  // Helper to extract unique categories
  const categories = useMemo(() => {
    const list = new Set(products.map(p => p.category).filter(Boolean));
    return ['Semua', ...Array.from(list)];
  }, [products]);

  // Helper to extract unique brands
  const brands = useMemo(() => {
    const list = new Set(products.map(p => p.brand).filter(Boolean));
    return ['Semua', ...Array.from(list)];
  }, [products]);

  // Combined product filter and sort pipeline
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory !== 'Semua') {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Brand filter
    if (selectedBrand !== 'Semua') {
      result = result.filter(p => p.brand === selectedBrand);
    }

    // Stock availability filter
    if (showOnlyInStock) {
      result = result.filter(p => p.qty > 0);
    }

    // Sort order mapping
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'name-asc':
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [products, searchQuery, selectedCategory, selectedBrand, showOnlyInStock, sortBy]);

  // Pagination totals and slice
  const totalPages = useMemo(() => {
    return Math.ceil(filteredProducts.length / itemsPerPage);
  }, [filteredProducts.length, itemsPerPage]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Map products to their cart quantities for easy lookups
  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    cart.forEach(item => {
      map[item.product.sku] = item.quantity;
    });
    return map;
  }, [cart]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col justify-between">
      {/* Stock warning notification toast */}
      <AnimatePresence>
        {stockAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          >
            <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-xl p-4 shadow-xl flex items-start gap-3">
              <div className="bg-amber-100 p-1.5 rounded-lg text-amber-700 shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 animate-bounce" />
              </div>
              <div className="flex-grow min-w-0">
                <h4 className="font-bold text-xs uppercase tracking-wide text-amber-800">Peringatan Stok</h4>
                <p className="text-xs font-semibold leading-relaxed mt-1 text-amber-700 text-wrap whitespace-normal">
                  {stockAlert.message}
                </p>
              </div>
              <button
                onClick={() => setStockAlert(null)}
                className="text-amber-500 hover:text-amber-800 p-1 hover:bg-amber-100/50 rounded transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        {/* Top Navigation Bar in Professional Polish Style */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
            {/* Logo and status */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-xs">
                B
              </div>
              <div>
                <h1 className="text-base font-extrabold text-slate-800 leading-none">Balistationery</h1>
                <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">
                  Digital Catalog & Quotation Builder
                </p>
              </div>
            </div>

            {/* Sync Status Button */}
            <div className="flex items-center gap-3">
              <button
                onClick={loadCatalog}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-700 bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-700' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </header>

        {/* Hero Area / Database connection header */}
        <section className="bg-slate-900 text-white py-10 px-4 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl translate-y-1/2"></div>

          <div className="max-w-3xl mx-auto relative z-10 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              Connected to STOCK LIST sheet
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Quotation Digital
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Jelajahi stok inventory terbaru kami, masukkan item ke dalam daftar penawaran, dan download file rekap <strong className="text-blue-400">Excel Quotation</strong> siap kirim via WhatsApp.
            </p>
          </div>
        </section>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          {/* Mobile View Switcher Tabs */}
          <div className="flex lg:hidden bg-white p-1 rounded-lg border border-slate-200 mb-6">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 py-2.5 px-4 rounded text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'catalog'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              Katalog Produk
            </button>
            <button
              onClick={() => setActiveTab('cart')}
              className={`flex-1 py-2.5 px-4 rounded text-xs font-bold transition-all flex items-center justify-center gap-2 relative ${
                activeTab === 'cart'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Keranjang
              {totalCartCount > 0 && (
                <span className="absolute top-1.5 right-4 bg-blue-600 text-white text-[10px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>

          {/* Double-Pane Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Catalog / Product Search and Grid */}
            <div className={`lg:col-span-8 space-y-6 ${activeTab !== 'catalog' ? 'hidden lg:block' : ''}`}>
              
              {/* Search, Filter & Sort Bar */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                {/* Full-width Search Bar with wide Search Button */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveRecentSearch(searchQuery);
                  }}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <div className="relative flex-grow" ref={searchContainerRef}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={e => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      placeholder="Cari SKU, Nama Produk, Brand..."
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setShowSuggestions(false);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-full hover:bg-slate-200 transition-colors"
                        title="Bersihkan pencarian"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Autocomplete Suggestions Panel */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {suggestions.map((item, idx) => {
                          const Icon = item.type === 'brand' ? Tag : item.type === 'sku' ? Barcode : Package;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSearchQuery(item.value);
                                saveRecentSearch(item.value);
                                setShowSuggestions(false);
                              }}
                              className="w-full flex items-start gap-2.5 px-3.5 py-2 hover:bg-slate-50 text-left transition-colors cursor-pointer group"
                            >
                              <Icon className="w-3.5 h-3.5 text-slate-400 mt-1 group-hover:text-blue-500 shrink-0" />
                              <div className="flex-grow min-w-0">
                                <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-600">
                                  {item.label}
                                </div>
                                {item.sublabel && (
                                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                    {item.sublabel}
                                  </div>
                                )}
                              </div>
                              <span className="text-[9px] bg-slate-100 group-hover:bg-blue-50 text-slate-500 group-hover:text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 select-none">
                                {item.type === 'brand' ? 'Merk' : item.type === 'sku' ? 'SKU' : 'Produk'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-36 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
                  >
                    <Search className="w-4 h-4" />
                    Cari Produk
                  </button>
                </form>

                {/* Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Category Filter */}
                  <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-slate-800 font-semibold cursor-pointer"
                    >
                      <option value="Semua">Semua Kategori</option>
                      {categories.filter(c => c !== 'Semua').map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Brand Filter */}
                  <div className="relative">
                    <select
                      value={selectedBrand}
                      onChange={e => setSelectedBrand(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-slate-800 font-semibold cursor-pointer"
                    >
                      <option value="Semua">Semua Merk</option>
                      {brands.filter(b => b !== 'Semua').map(b => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Sorting Filter */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none text-slate-800 font-semibold cursor-pointer"
                    >
                      <option value="name-asc">Nama Produk (A-Z)</option>
                      <option value="name-desc">Nama Produk (Z-A)</option>
                      <option value="price-asc">Harga Terendah</option>
                      <option value="price-desc">Harga Tertinggi</option>
                    </select>
                    <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none shrink-0">
                      <History className="w-3.5 h-3.5 text-slate-300" />
                      Pencarian Terakhir:
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {recentSearches.map((term, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSearchQuery(term)}
                          className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-200 text-[10px] text-slate-600 hover:text-blue-700 font-semibold rounded-full cursor-pointer transition-all hover:scale-[1.02] shadow-3xs"
                        >
                          <span>{term}</span>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveRecentSearch(term, e)}
                            className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 shrink-0 transition-colors cursor-pointer"
                            title="Hapus pencarian ini"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleClearAllRecentSearches}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-bold hover:underline ml-1 px-1.5 py-0.5 cursor-pointer"
                      >
                        Hapus Semua
                      </button>
                    </div>
                  </div>
                )}

                {/* Advanced Flags (Stock, Reset, etc) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-[11px]">
                  <label className="flex items-center gap-2 font-bold text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showOnlyInStock}
                      onChange={e => setShowOnlyInStock(e.target.checked)}
                      className="w-3.5 h-3.5 text-blue-600 bg-slate-50 border-slate-200 rounded focus:ring-blue-500/10"
                    />
                    Tampilkan Produk Ready Saja
                  </label>

                  {/* Reset Filter Button */}
                  {(searchQuery || selectedCategory !== 'Semua' || selectedBrand !== 'Semua' || showOnlyInStock) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('Semua');
                        setSelectedBrand('Semua');
                        setShowOnlyInStock(false);
                      }}
                      className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 transition-colors"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-5 text-rose-700 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Terjadi Kesalahan</h4>
                    <p className="text-xs mt-1 leading-relaxed">{error}</p>
                    <button
                      onClick={loadCatalog}
                      className="mt-3 text-xs bg-white text-rose-700 border border-rose-200 hover:bg-rose-100 font-semibold px-4 py-1.5 rounded transition-colors"
                    >
                      Coba Lagi
                    </button>
                  </div>
                </div>
              )}

              {/* Catalog Grid Renderer */}
              {loading ? (
                // Loading Skeleton Grid
                <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 gap-1.5 xs:gap-2 sm:gap-5">
                  {[1, 2, 3, 4, 5, 6].map(id => (
                    <div key={id} className="bg-white rounded-lg border border-slate-200 p-1.5 xs:p-2 sm:p-4 space-y-2 animate-pulse min-h-[160px] xs:min-h-[190px] sm:min-h-[300px] md:min-h-[380px] flex flex-col justify-between">
                      <div className="w-full h-20 xs:h-24 sm:h-36 md:h-48 bg-slate-100 rounded"></div>
                      <div className="h-1.5 sm:h-3 bg-slate-100 rounded w-1/3 mt-1"></div>
                      <div className="h-2.5 sm:h-4 bg-slate-100 rounded w-3/4"></div>
                      <div className="h-1.5 sm:h-3 bg-slate-100 rounded w-1/2"></div>
                      <div className="mt-auto pt-1.5 sm:pt-3 border-t border-slate-100 space-y-1.5">
                        <div className="h-4 sm:h-6 bg-slate-100 rounded w-1/2 mx-auto"></div>
                        <div className="h-6 sm:h-8 bg-slate-100 rounded w-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                // Empty search / filters result
                <div className="bg-white rounded-lg border border-slate-200 py-16 px-4 text-center">
                  <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="font-sans font-bold text-slate-800 text-base">Produk Tidak Ditemukan</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                    Tidak ada produk yang cocok dengan kriteria pencarian atau filter Anda. Silakan coba kata kunci lain.
                  </p>
                </div>
              ) : (
                // Fully Loaded Products Grid
                <div>
                  <h3 className="text-sm font-bold text-slate-800 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span>Katalog Digital</span>
                    <span className="text-xs font-normal text-slate-500">
                      Menampilkan {Math.min(filteredProducts.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(currentPage * itemsPerPage, filteredProducts.length)} dari {filteredProducts.length} items
                    </span>
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-2 md:grid-cols-3 gap-1.5 xs:gap-2 sm:gap-5">
                    {paginatedProducts.map(product => (
                      <ProductCard
                        key={product.sku}
                        product={product}
                        cartQuantity={cartQuantities[product.sku] || 0}
                        onAddToCart={handleAddToCart}
                        onRemoveFromCart={handleRemoveFromCart}
                        onSetCartItemQuantity={handleSetCartItemQuantity}
                      />
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 pb-4 border-t border-slate-200 mt-8">
                      <span className="text-xs text-slate-500 font-bold">
                        Halaman {currentPage} dari {totalPages}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {/* First Page */}
                        <button
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 hover:text-blue-700 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed"
                          title="Halaman Pertama"
                        >
                          <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>

                        {/* Previous Page */}
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 hover:text-blue-700 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed"
                          title="Halaman Sebelumnya"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        {/* Page numbers */}
                        {(() => {
                          const pageNumbers = [];
                          const maxVisiblePages = 5;
                          let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                          let endPage = startPage + maxVisiblePages - 1;

                          if (endPage > totalPages) {
                            endPage = totalPages;
                            startPage = Math.max(1, endPage - maxVisiblePages + 1);
                          }

                          for (let i = startPage; i <= endPage; i++) {
                            pageNumbers.push(
                              <button
                                key={i}
                                onClick={() => setCurrentPage(i)}
                                className={`w-8 h-8 text-xs font-bold rounded transition-colors border cursor-pointer ${
                                  currentPage === i
                                    ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-blue-700'
                                }`}
                              >
                                {i}
                              </button>
                            );
                          }
                          return pageNumbers;
                        })()}

                        {/* Next Page */}
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 hover:text-blue-700 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed"
                          title="Halaman Berikutnya"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        {/* Last Page */}
                        <button
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="p-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 hover:text-blue-700 disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-slate-600 transition-colors cursor-pointer disabled:cursor-not-allowed"
                          title="Halaman Terakhir"
                        >
                          <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Cart Panel & Checkout Details */}
            <div className={`lg:col-span-4 ${activeTab !== 'cart' ? 'hidden lg:block' : ''}`}>
              <Cart
                cartItems={cart}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onSetCartItemQuantity={handleSetCartItemQuantity}
                onClearCartItem={handleClearCartItem}
                onClearAll={handleClearAllCart}
                onUpdateCartItemNote={handleUpdateCartItemNote}
                onLoadPreviousOrder={setCart}
              />
            </div>

          </div>
        </main>

        {/* Floating Mobile Cart Bar */}
        {activeTab === 'catalog' && totalCartCount > 0 && (
          <div className="fixed bottom-4 left-4 right-4 z-50 lg:hidden">
            <button
              onClick={() => setActiveTab('cart')}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3.5 px-5 rounded-xl shadow-xl flex items-center justify-between transition-all cursor-pointer text-xs"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 animate-bounce" />
                <span>Lihat Daftar Quotation Anda</span>
              </div>
              <div className="flex items-center gap-1.5 bg-blue-600/60 px-2.5 py-1 rounded-lg text-[11px]">
                <span>{totalCartCount} Item</span>
                <span>&rarr;</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Connected Status Bar Footer */}
      <footer className="h-9 bg-slate-800 flex items-center justify-between px-6 text-[10px] text-slate-300 mt-16 shadow-inner">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            Connected to Database CSV
          </span>
          <span className="hidden sm:inline">Sheet: STOCK LIST</span>
          <span className="hidden md:inline">Status: Ready</span>
        </div>
        <div>&copy; 2026 STOCKFLOW Quotation - All rights reserved</div>
      </footer>
    </div>
  );
}
