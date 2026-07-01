/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { CartItem, OrderDetails } from '../types';

export function generateOrderExcel(cartItems: CartItem[], orderDetails: OrderDetails): void {
  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Create order summary data
  const dateStr = new Date().toLocaleString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Build rows for Excel with exact requested columns: SKU, Nama Barang, Qty, Unit, Catatan
  const rows: any[] = [
    ['DOKUMEN PENAWARAN HARGA / QUOTATION'],
    ['Tanggal Quotation', dateStr],
    [],
    ['INFORMASI PELANGGAN'],
    ['Nama Pelanggan', orderDetails.customerName],
    ['No. WhatsApp / HP', orderDetails.whatsappNumber],
    ['Alamat Pengiriman', orderDetails.shippingAddress || '-'],
    ['Catatan Tambahan', orderDetails.notes || '-'],
    [],
    ['DAFTAR BARANG PENAWARAN'],
    ['SKU', 'Nama Barang', 'Qty', 'Unit', 'Catatan']
  ];

  // Append items
  cartItems.forEach((item) => {
    rows.push([
      item.product.sku,
      item.product.name,
      item.quantity,
      item.product.unit,
      item.note || '-'
    ]);
  });

  // Append totals
  rows.push([]);
  rows.push([
    'TOTAL',
    '',
    totalItems,
    '',
    ''
  ]);

  // Convert to worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Add column widths for better legibility
  ws['!cols'] = [
    { wch: 15 },  // SKU
    { wch: 45 },  // Nama Barang
    { wch: 10 },  // Qty
    { wch: 10 },  // Unit
    { wch: 25 }   // Catatan
  ];

  // Protect the worksheet to prevent casual tampering with items
  ws['!protect'] = {
    password: '0000',
    selectLockedCells: false,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: false,
    pivotTables: false,
    objects: false,
    scenarios: false
  };

  // Append worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Quotation Detail');

  // Generate safe filename
  const cleanName = orderDetails.customerName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Quotation_${cleanName}_${new Date().toISOString().slice(0,10)}.xlsx`;

  // Write and download
  XLSX.writeFile(wb, filename);
}

export function generateWhatsAppMessage(cartItems: CartItem[], orderDetails: OrderDetails): string {
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  let msg = `*PENAWARAN HARGA / QUOTATION BARU*\n\n`;
  msg += `*Detail Pelanggan:*\n`;
  msg += `👤 Nama: ${orderDetails.customerName}\n`;
  msg += `📱 WhatsApp: ${orderDetails.whatsappNumber}\n`;
  if (orderDetails.shippingAddress) {
    msg += `📍 Alamat: ${orderDetails.shippingAddress}\n`;
  }
  if (orderDetails.notes) {
    msg += `📝 Catatan: ${orderDetails.notes}\n`;
  }
  msg += `\n*Daftar Barang:*\n`;

  cartItems.forEach((item, index) => {
    const itemNote = item.note ? ` (Catatan: ${item.note})` : '';
    msg += `${index + 1}. [${item.product.sku}] ${item.product.name}${itemNote} (${item.quantity} ${item.product.unit})\n`;
  });

  msg += `\n*Total Item:* ${totalItems} unit`;

  return encodeURIComponent(msg);
}
