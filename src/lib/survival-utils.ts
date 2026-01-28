import * as XLSX from 'xlsx';

// Roman numeral mapping for cancer stages
const ROMAN_MAP: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5
};

/**
 * Parse stage ordinal from strings like 'Stage II' or plain 'II'
 */
export function parseStageOrdinal(stageVal: any): number {
  if (stageVal === null || stageVal === undefined) return 0;
  if (typeof stageVal === 'number' && isNaN(stageVal)) return 0;
  
  const s = String(stageVal);
  const match = s.match(/Stage\s*([IVX]+)/i);
  
  if (match) {
    const roman = match[1].toUpperCase();
    return ROMAN_MAP[roman] || 0;
  }
  
  // Try plain roman numeral or digit
  const plain = s.trim().toUpperCase();
  if (plain in ROMAN_MAP) {
    return ROMAN_MAP[plain];
  }
  
  const num = parseFloat(plain);
  return isNaN(num) ? 0 : num;
}

/**
 * Read uploaded file (CSV or Excel) and return parsed data
 */
export async function readUploadedFile(file: File): Promise<Record<string, any>[]> {
  const name = file.name.toLowerCase();
  
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return parseCSV(text);
  }
  
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet);
  }
  
  throw new Error('Unsupported file type. Please upload .csv or .xlsx');
}

/**
 * Parse CSV string to array of objects
 */
function parseCSV(text: string): Record<string, any>[] {
  const lines = text.trim().split('\n');
  if (lines.length === 0) return [];
  
  const headers = parseCSVLine(lines[0]);
  const data: Record<string, any>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, any> = {};
    
    headers.forEach((header, idx) => {
      const value = values[idx]?.trim();
      
      if (value === '' || value === 'NA' || value === 'NaN' || value === undefined) {
        row[header] = null;
      } else if (!isNaN(Number(value))) {
        row[header] = Number(value);
      } else {
        row[header] = value;
      }
    });
    
    data.push(row);
  }
  
  return data;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Classify risk based on score and reference quantiles
 */
export function classifyRisk(
  score: number,
  riskRef: { q33?: number; q66?: number } | null
): { group: 'Low' | 'Intermediate' | 'High' | null; threshold: number | null } {
  if (!riskRef || riskRef.q33 === undefined || riskRef.q66 === undefined) {
    return { group: null, threshold: null };
  }
  
  if (score <= riskRef.q33) {
    return { group: 'Low', threshold: riskRef.q33 };
  }
  if (score <= riskRef.q66) {
    return { group: 'Intermediate', threshold: riskRef.q66 };
  }
  return { group: 'High', threshold: riskRef.q66 };
}

/**
 * Detect patient ID column from data
 */
export function detectIdColumn(columns: string[]): string | null {
  const candidates = ['Sample', 'Patient_ID', 'patient_id', 'PatientID', 'id', 'ID'];
  for (const candidate of candidates) {
    if (columns.includes(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * Generate mock survival data for demonstration
 * In production, this would be replaced with actual model predictions
 */
export function generateMockSurvivalData(
  patientId: string,
  riskScore: number,
  maxDays: number = 3650
): { time: number; probability: number }[] {
  const data: { time: number; probability: number }[] = [];
  const lambda = 0.0001 + riskScore * 0.0002; // Higher risk = faster decay
  
  for (let t = 0; t <= maxDays; t += 30) {
    const probability = Math.exp(-lambda * t);
    data.push({ time: t, probability: Math.max(0, probability) });
  }
  
  return data;
}

/**
 * Calculate survival probability at specific timepoint
 */
export function getSurvivalAtTime(
  survivalData: { time: number; probability: number }[],
  targetTime: number
): number {
  if (survivalData.length === 0) return 1;
  
  // Find the closest time point
  for (let i = survivalData.length - 1; i >= 0; i--) {
    if (survivalData[i].time <= targetTime) {
      return survivalData[i].probability;
    }
  }
  
  return survivalData[0].probability;
}

/**
 * Format number for display
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Export data as CSV
 */
export function exportToCSV(data: Record<string, any>[], filename: string): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return String(value);
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
