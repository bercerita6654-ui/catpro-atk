/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ShoppingBag, Trash2, Plus, Minus, User, Phone, MapPin, FileText, Download, Send, CheckCircle2, History, RotateCcw, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { CartItem, OrderDetails, Product } from '../types';
import { generateOrderExcel, generateWhatsAppMessage, getQuotationFile } from '../utils/excelGenerator';

function CartQtySelector({
  item,
  onAddToCart,
  onRemoveFromCart,
  onSetCartItemQuantity,
}: {
  item: CartItem;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (product: Product) => void;
  onSetCartItemQuantity?: (product: Product, quantity: number) => void;
}) {
  const [val, setVal] = useState<string>(item.quantity.toString());

  useEffect(() => {
    setVal(item.quantity.toString());
  }, [item.quantity]);

  return (
    <div className="flex items-center bg-slate-50 border border-slate-200 rounded overflow-hidden">
      <button
        onClick={() => onRemoveFromCart(item.product)}
        className="p-1 text-slate-500 hover:bg-slate-100 rounded-l cursor-pointer"
        aria-label="Kurangi jumlah"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        min="1"
        max={item.product.qty}
        value={val}
        onChange={(e) => {
          const v = e.target.value;
          setVal(v);
          const parsed = parseInt(v, 10);
          if (!isNaN(parsed) && parsed > 0) {
            onSetCartItemQuantity?.(item.product, parsed);
          }
        }}
        onBlur={() => {
          if (val === '' || isNaN(parseInt(val, 10))) {
            setVal(item.quantity.toString());
          } else {
            const parsed = parseInt(val, 10);
            if (parsed <= 0) {
              onSetCartItemQuantity?.(item.product, 0);
            } else if (parsed > item.product.qty) {
              onSetCartItemQuantity?.(item.product, item.product.qty);
              setVal(item.product.qty.toString());
            }
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className="w-12 text-center bg-white border-x border-slate-200 text-slate-800 text-xs font-bold py-0.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
        aria-label="Input jumlah item"
      />
      <button
        onClick={() => onAddToCart(item.product)}
        className="p-1 text-slate-500 hover:bg-slate-100 rounded-r cursor-pointer"
        aria-label="Tambah jumlah"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface CartProps {
  cartItems: CartItem[];
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (product: Product) => void;
  onSetCartItemQuantity?: (product: Product, quantity: number) => void;
  onClearCartItem: (product: Product) => void;
  onClearAll: () => void;
  onUpdateCartItemNote: (product: Product, note: string) => void;
  onLoadPreviousOrder: (items: CartItem[]) => void;
}

export function Cart({
  cartItems,
  onAddToCart,
  onRemoveFromCart,
  onSetCartItemQuantity,
  onClearCartItem,
  onClearAll,
  onUpdateCartItemNote,
  onLoadPreviousOrder,
}: CartProps) {
  const [savedDetails, setSavedDetails] = useState<OrderDetails | null>(() => {
    try {
      const saved = localStorage.getItem('balistationery_saved_customer') || localStorage.getItem('stockflow_saved_customer');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [orderHistory, setOrderHistory] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('balistationery_order_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);
  const [loadSuccessMessage, setLoadSuccessMessage] = useState<string | null>(null);

  const [saveInfo, setSaveInfo] = useState<boolean>(true);

  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    customerName: '',
    whatsappNumber: '',
    shippingAddress: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Partial<Record<keyof OrderDetails, string>>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<OrderDetails | null>(null);

  const totalAmount = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setOrderDetails(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error
    if (formErrors[name as keyof OrderDetails]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof OrderDetails, string>> = {};
    if (!orderDetails.customerName.trim()) {
      errors.customerName = 'Nama penerima wajib diisi';
    }
    
    const waNum = orderDetails.whatsappNumber.trim();
    if (!waNum) {
      errors.whatsappNumber = 'Nomor WhatsApp wajib diisi';
    } else {
      // Basic check for phone number length
      const cleanPhone = waNum.replace(/[^\d+]/g, '');
      if (cleanPhone.length < 9) {
        errors.whatsappNumber = 'Nomor WhatsApp tidak valid (minimal 9 digit)';
      }
    }

    if (!orderDetails.shippingAddress.trim()) {
      errors.shippingAddress = 'Alamat lengkap wajib diisi';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProcessOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Save receiver details to localStorage if checkbox is checked
    if (saveInfo) {
      try {
        localStorage.setItem('balistationery_saved_customer', JSON.stringify(orderDetails));
        setSavedDetails(orderDetails);
      } catch (err) {
        console.error('Failed to save customer details to localStorage:', err);
      }
    }

    // Generate and download the Excel file
    generateOrderExcel(cartItems, orderDetails);

    // Save order to history
    try {
      const historyJson = localStorage.getItem('balistationery_order_history');
      const currentHistory = historyJson ? JSON.parse(historyJson) : [];
      
      const newHistoryItem = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        customerName: orderDetails.customerName,
        whatsappNumber: orderDetails.whatsappNumber,
        shippingAddress: orderDetails.shippingAddress,
        notes: orderDetails.notes,
        items: cartItems.map(item => ({
          product: { ...item.product },
          quantity: item.quantity,
          note: item.note || ''
        })),
        totalAmount: totalAmount
      };
      
      const updatedHistory = [newHistoryItem, ...currentHistory].slice(0, 15);
      localStorage.setItem('balistationery_order_history', JSON.stringify(updatedHistory));
      setOrderHistory(updatedHistory);
    } catch (e) {
      console.error('Failed to save order to history:', e);
    }

    // Save for success dialog
    setLastOrderDetails({ ...orderDetails });
    setIsSuccess(true);
  };

  const handleShareExcel = (items: CartItem[], details: OrderDetails) => {
    const { file, filename } = getQuotationFile(items, details);

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({
        files: [file],
        title: filename,
        text: `Berikut adalah file excel quotation untuk pelanggan ${details.customerName}.`,
      }).catch((err) => {
        console.error('Error sharing file:', err);
      });
    } else {
      generateOrderExcel(items, details);
      alert(`Fitur share file langsung tidak didukung browser ini.\n\nFile Excel "${filename}" telah diunduh secara otomatis. Silakan kirimkan file tersebut secara manual ke WhatsApp.`);
    }
  };

  const handleWhatsAppShare = () => {
    if (!lastOrderDetails) return;
    const waMsg = generateWhatsAppMessage(cartItems, lastOrderDetails);
    
    // Normalize WhatsApp number to standard wa.me format (e.g. replacing leading 0 with 62)
    let phoneNum = lastOrderDetails.whatsappNumber.replace(/[^\d]/g, '');
    if (phoneNum.startsWith('0')) {
      phoneNum = '62' + phoneNum.slice(1);
    }
    
    // Open WhatsApp link in new tab
    const whatsappUrl = `https://api.whatsapp.com/send?text=${waMsg}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleResetOrder = () => {
    setIsSuccess(false);
    onClearAll();
    setOrderDetails({
      customerName: '',
      whatsappNumber: '',
      shippingAddress: '',
      notes: '',
    });
  };

  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = orderHistory.filter(item => item.id !== id);
      localStorage.setItem('balistationery_order_history', JSON.stringify(updated));
      setOrderHistory(updated);
    } catch (err) {
      console.error('Failed to delete history item:', err);
    }
  };

  const handleLoadHistory = (historyItem: any) => {
    onLoadPreviousOrder(historyItem.items);
    setOrderDetails({
      customerName: historyItem.customerName,
      whatsappNumber: historyItem.whatsappNumber,
      shippingAddress: historyItem.shippingAddress,
      notes: historyItem.notes || '',
    });
    setLoadSuccessMessage(`Pesanan atas nama "${historyItem.customerName}" berhasil dimuat kembali ke keranjang!`);
    setTimeout(() => {
      setLoadSuccessMessage(null);
    }, 4000);
  };

  const renderHistorySection = (forceOpen: boolean = false) => {
    if (orderHistory.length === 0) return null;
    const isExpanded = forceOpen || isHistoryExpanded;

    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {/* Header Toggle */}
        <button
          type="button"
          onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
          className="w-full p-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-100/50 transition-colors border-b border-slate-200 cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-sans font-bold text-slate-800 text-xs sm:text-sm">Riwayat Pembuatan Quotation Excel ({orderHistory.length})</span>
          </div>
          {!forceOpen && (
            isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
          )}
        </button>

        {isExpanded && (
          <div className="p-3 sm:p-4 space-y-3 max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {orderHistory.map((hist) => (
              <div key={hist.id} className="pt-3 first:pt-0 flex flex-col gap-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-800 block text-[11px] sm:text-xs">
                      {hist.customerName}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-slate-300 shrink-0" />
                      {hist.date} &middot; {hist.items.reduce((acc: number, item: any) => acc + item.quantity, 0)} item
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <button
                      type="button"
                      onClick={() => handleLoadHistory(hist)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 font-bold rounded text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-3xs border border-blue-100"
                      title="Muat Ulang Pesanan ke Keranjang"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Muat
                    </button>
                    <button
                      type="button"
                      onClick={() => generateOrderExcel(hist.items, hist)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 font-bold rounded text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-3xs border border-emerald-100"
                      title="Unduh File Excel"
                    >
                      <Download className="w-2.5 h-2.5" />
                      Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareExcel(hist.items, hist)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-800 font-bold rounded text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-3xs border border-teal-100"
                      title="Kirim / Share File Excel"
                    >
                      <Send className="w-2.5 h-2.5" />
                      Share
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteHistory(hist.id, e)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors rounded hover:bg-slate-50"
                      title="Hapus Riwayat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Items List snippet */}
                <div className="bg-slate-50/70 border border-slate-100 rounded-xs p-2 text-[10px] space-y-1 text-slate-600">
                  <div className="font-semibold text-slate-500 border-b border-slate-200/50 pb-1 mb-1">
                    <span>Daftar Barang</span>
                  </div>
                  <div className="space-y-1 max-h-[80px] overflow-y-auto font-sans font-medium font-semibold text-slate-700">
                    {hist.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between gap-2">
                        <span className="truncate max-w-[180px] sm:max-w-xs">{item.product.name}</span>
                        <span className="text-slate-600 shrink-0">x{item.quantity} {item.product.unit || 'pcs'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isSuccess && lastOrderDetails) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle2 className="w-16 h-16 text-blue-600 animate-bounce" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Quotation Berhasil Dibuat!</h3>
        <p className="text-xs text-slate-600 mb-6 leading-relaxed">
          File <strong>Excel Quotation</strong> Anda telah berhasil dibuat dan diunduh secara otomatis.
          Silakan kirimkan file Excel tersebut ke WhatsApp kami untuk pemrosesan/penawaran lebih lanjut.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => handleShareExcel(cartItems, lastOrderDetails)}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md uppercase tracking-wider"
          >
            <Send className="w-4 h-4" />
            Kirim / Share File Excel (.xlsx)
          </button>
          
          <button
            onClick={() => generateOrderExcel(cartItems, lastOrderDetails)}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded text-xs transition-colors flex items-center justify-center gap-2 animate-pulse"
          >
            <Download className="w-3.5 h-3.5" />
            Download Ulang Excel Quotation
          </button>

          <button
            onClick={handleResetOrder}
            className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded transition-colors"
          >
            Buat Quotation Baru
          </button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="space-y-6">
        {loadSuccessMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold animate-pulse">
            {loadSuccessMessage}
          </div>
        )}

        {renderHistorySection(true)}

        <div className="bg-white rounded-lg border border-slate-200 p-8 shadow-xs text-center flex flex-col items-center justify-center min-h-[220px]">
          <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center mb-3">
            <ShoppingBag className="w-6 h-6 text-slate-400" />
          </div>
          <h3 className="font-sans font-bold text-slate-800 text-sm mb-1">Daftar Quotation Kosong</h3>
          <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
            Jelajahi produk di katalog digital kami dan tambahkan item untuk mulai menyusun quotation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="shopping-cart-container" className="space-y-6">
      {loadSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold animate-pulse">
          {loadSuccessMessage}
        </div>
      )}

      {renderHistorySection(false)}

      {/* Items Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4.5 h-4.5 text-blue-600" />
            <h3 className="font-sans font-bold text-slate-800 text-sm">Daftar Item Quotation</h3>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
            {totalItems} Item
          </span>
        </div>

        <div className="divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
          {cartItems.map((item) => (
            <div key={item.product.sku} className="p-4 flex flex-col hover:bg-slate-50/50 transition-colors">
              <div className="flex gap-3">
                {/* Info */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-xs text-slate-800 whitespace-normal text-wrap" title={item.product.name}>
                      {item.product.name}
                    </h4>
                    <button
                      onClick={() => onClearCartItem(item.product)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Hapus dari keranjang"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 items-center">
                    <span>SKU: {item.product.sku}</span>
                    <span className="text-slate-200">|</span>
                    <span>Brand: {item.product.brand}</span>
                    <span className="text-slate-200">|</span>
                    <span className="font-semibold text-slate-500 bg-slate-100 px-1 py-0.2 rounded text-[9px]">Satuan: {item.product.unit || 'pcs'}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center gap-2">
                      <CartQtySelector
                        item={item}
                        onAddToCart={onAddToCart}
                        onRemoveFromCart={onRemoveFromCart}
                        onSetCartItemQuantity={onSetCartItemQuantity}
                      />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded">
                        {item.product.unit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Note input per item */}
              <div className="mt-2.5 pt-2 border-t border-slate-100/60 flex items-center gap-2">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Catatan:</span>
                <input
                  type="text"
                  placeholder="Tambahkan catatan khusus..."
                  value={item.note || ''}
                  onChange={(e) => onUpdateCartItemNote(item.product, e.target.value)}
                  className="text-[10px] text-slate-700 bg-slate-50/70 border border-slate-200 rounded px-2 py-1 flex-grow focus:outline-hidden focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Total Panel */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Total Jumlah Item</span>
            <span className="bg-slate-200 text-slate-800 px-2.5 py-1 rounded-full text-xs font-bold">{totalItems} {itemUnitString(totalItems)}</span>
          </div>
        </div>
      </div>

      {/* Checkout Form */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
        <h3 className="font-sans font-bold text-slate-800 text-xs mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Formulir Quotation Pelanggan
        </h3>

        <form onSubmit={handleProcessOrder} className="space-y-4">
          {/* Saved details option */}
          {savedDetails && (
            <div className="bg-blue-50/70 border border-blue-200/60 rounded-md p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">💾 INFO PENERIMA TERSEDIA</span>
                <span className="text-slate-600 block font-semibold">{savedDetails.customerName} &middot; {savedDetails.whatsappNumber}</span>
                <span className="text-slate-500 block text-[10px] truncate max-w-xs">{savedDetails.shippingAddress}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOrderDetails({
                    customerName: savedDetails.customerName,
                    whatsappNumber: savedDetails.whatsappNumber,
                    shippingAddress: savedDetails.shippingAddress,
                    notes: orderDetails.notes,
                  });
                  // Clear form errors
                  setFormErrors({});
                }}
                className="self-start sm:self-center px-2.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded text-[10px] uppercase tracking-wider cursor-pointer shadow-xs transition-colors"
              >
                Gunakan Data
              </button>
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Nama Penerima <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="customerName"
              value={orderDetails.customerName}
              onChange={handleInputChange}
              placeholder="Contoh: Budi Santoso"
              className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-md focus:outline-hidden focus:ring-2 transition-all ${
                formErrors.customerName
                  ? 'border-rose-300 focus:ring-rose-100 focus:border-rose-400'
                  : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500'
              }`}
            />
            {formErrors.customerName && (
              <p className="text-[10px] text-rose-500 mt-1 font-medium">{formErrors.customerName}</p>
            )}
          </div>

          {/* WhatsApp Number */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              No. WhatsApp / HP <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              name="whatsappNumber"
              value={orderDetails.whatsappNumber}
              onChange={handleInputChange}
              placeholder="Contoh: 08123456789"
              className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-md focus:outline-hidden focus:ring-2 transition-all ${
                formErrors.whatsappNumber
                  ? 'border-rose-300 focus:ring-rose-100 focus:border-rose-400'
                  : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500'
              }`}
            />
            {formErrors.whatsappNumber && (
              <p className="text-[10px] text-rose-500 mt-1 font-medium">{formErrors.whatsappNumber}</p>
            )}
          </div>

          {/* Shipping Address */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Alamat Lengkap <span className="text-rose-500">*</span>
            </label>
            <textarea
              name="shippingAddress"
              rows={3}
              value={orderDetails.shippingAddress}
              onChange={handleInputChange}
              placeholder="Alamat lengkap tujuan penawaran/pengiriman..."
              className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-md focus:outline-hidden focus:ring-2 transition-all ${
                formErrors.shippingAddress
                  ? 'border-rose-300 focus:ring-rose-100 focus:border-rose-400'
                  : 'border-slate-200 focus:ring-blue-500/10 focus:border-blue-500'
              }`}
            />
            {formErrors.shippingAddress && (
              <p className="text-[10px] text-rose-500 mt-1 font-medium">{formErrors.shippingAddress}</p>
            )}
          </div>

          {/* Extra Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              name="notes"
              rows={2}
              value={orderDetails.notes}
              onChange={handleInputChange}
              placeholder="Catatan tambahan (misal: spesifikasi khusus, jangka waktu penawaran...)"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Save Info Checkbox */}
          <div className="flex items-start gap-2 pt-1 pb-1">
            <input
              type="checkbox"
              id="saveInfo"
              checked={saveInfo}
              onChange={e => setSaveInfo(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer mt-0.5"
            />
            <label htmlFor="saveInfo" className="text-[11px] text-slate-500 font-semibold leading-tight cursor-pointer select-none">
              Simpan nama penerima, no. telp, dan alamat agar otomatis terisi berikutnya
            </label>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 bg-[#107c41] hover:bg-[#0f703b] text-white font-bold rounded shadow-lg shadow-emerald-100/70 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer border border-[#0d6434]"
          >
            <Download className="w-4 h-4" />
            BUAT & UNDUH QUOTATION (.EXCEL)
          </button>
        </form>
      </div>
    </div>
  );
}

function itemUnitString(count: number) {
  return count > 1 ? 'items' : 'item';
}
