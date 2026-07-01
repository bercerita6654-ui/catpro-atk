/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Papa from 'papaparse';
import { Product } from '../types';

export function parseHarga(raw: string): number {
  if (!raw) return 0;
  // Remove "Rp", dots (thousand separators), spaces, and handle decimal commas
  let clean = raw.replace(/Rp/gi, '').replace(/\s/g, '');
  
  // Indonesian style: 150.000,00 or 150.000
  // English style: 150,000.00 or 150000
  if (clean.includes(',') && !clean.includes('.')) {
    // Could be 150000,00 (comma is decimal) or 150,000 (comma is thousand)
    // If it ends with ,00 or is short, we treat it as decimal
    if (clean.endsWith(',00') || clean.split(',')[1]?.length === 2) {
      clean = clean.replace(/,/g, '.');
    } else {
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes('.') && clean.includes(',')) {
    // Both separators present
    if (clean.indexOf('.') < clean.indexOf(',')) {
      // 150.000,00 -> dot is thousands, comma is decimal
      clean = clean.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // 150,000.00 -> comma is thousands, dot is decimal
      clean = clean.replace(/,/g, '');
    }
  } else {
    // Only dot present (e.g., 150.000)
    // In ID context, 150.000 usually means 150000. Let's check if it's thousands or decimal
    const parts = clean.split('.');
    if (parts.length === 2 && parts[1].length === 3) {
      // e.g. 150.000 -> thousand separator
      clean = clean.replace(/\./g, '');
    } else if (parts.length > 2) {
      // e.g. 1.500.000
      clean = clean.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

export function parseQty(raw: string): number {
  if (!raw) return 0;
  // Extract numbers from strings like "10 Pcs", "50", etc.
  const clean = raw.replace(/\s/g, '').replace(/[^\d.-]/g, '');
  const parsed = parseInt(clean, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function getGoogleDriveImageUrl(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  // If it's already a simple direct image URL (not Google Drive), like ending with .png/.jpg or from imgur/unsplash, keep it:
  if (
    trimmed.startsWith('http') && 
    !trimmed.includes('drive.google.com') && 
    !trimmed.includes('docs.google.com')
  ) {
    return trimmed;
  }

  // Try to extract Google Drive file ID from URL or use as raw ID if it's alphanumeric/symbols
  let fileId = '';

  // Check /file/d/{ID}/view
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/);
  if (fileDMatch && fileDMatch[1]) {
    fileId = fileDMatch[1];
  } else {
    // Check ?id={ID} or &id={ID}
    const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
    if (idMatch && idMatch[1]) {
      fileId = idMatch[1];
    } else if (trimmed.length >= 25 && /^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      // It looks like a raw Google Drive file ID
      fileId = trimmed;
    }
  }

  if (fileId) {
    // Use lh3.googleusercontent.com/d/{ID} which is fast, reliable, and avoids standard auth blocks
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }

  return trimmed;
}

export const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTCxz1GPm7QU9IS1yBiSjvIdNTLUsvvplOCyT_R3XH4O-LuVbHoY_bXn1LTH5lpnlolJ29BhUgEdnFm/pub?gid=1564332470&single=true&output=csv';

export async function fetchProducts(): Promise<Product[]> {
  try {
    const response = await fetch(GOOGLE_SHEET_CSV_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    const csvText = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse<string[]>(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data;
          if (rows.length === 0) {
            resolve([]);
            return;
          }

          const products: Product[] = [];
          
          // Row 0 is typically header, but let's check or support robust parsing
          // Column index mapping (0-based):
          // SKU: Col 1 -> index 0
          // Nama Produk: Col 3 -> index 2
          // Unit: Col 4 -> index 3
          // Kategori: Col 5 -> index 4
          // Merk: Col 7 -> index 6
          // Harga: Col 11 -> index 10
          // Qty: Col 13 -> index 12
          // Foto Produk: Col 22 -> index 21

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            // Skip header if it is header row (checks if it has SKU/Nama headers)
            const isHeader = 
              row[0]?.toLowerCase().includes('sku') || 
              row[2]?.toLowerCase().includes('nama') || 
              row[2]?.toLowerCase().includes('product');
              
            if (isHeader && i === 0) {
              continue; 
            }

            const sku = row[0]?.trim() || '';
            const name = row[2]?.trim() || '';
            
            // Skip rows that don't have valid SKU and Name
            if (!sku || !name || sku === '-' || name === '-') {
              continue;
            }

            const unit = row[3]?.trim() || 'Pcs';
            const category = row[4]?.trim() || 'Lainnya';
            const brand = row[6]?.trim() || 'Tanpa Merk';
            const rawPrice = row[10]?.trim() || '0';
            const rawQty = row[12]?.trim() || '0';
            const imageUrl = getGoogleDriveImageUrl(row[21]?.trim() || '');

            products.push({
              sku,
              name,
              unit,
              category,
              brand,
              price: parseHarga(rawPrice),
              rawPrice,
              qty: parseQty(rawQty),
              rawQty,
              imageUrl,
            });
          }

          resolve(products);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error fetching/parsing products CSV:', error);
    throw error;
  }
}
