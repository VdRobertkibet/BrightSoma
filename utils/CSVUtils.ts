/**
 * Utility to parse CSV strings into objects
 */
export const parseCSV = (csvText: string): Record<string, string>[] => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Simple CSV parser that handles commas inside quotes
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''));

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    results.push(row);
  }

  return results;
};

/**
 * Validates required fields in a parsed CSV row
 */
export const validateCSVRow = (row: Record<string, string>, requiredFields: string[]): string[] => {
  return requiredFields.filter(field => !row[field] || row[field].trim() === '');
};
