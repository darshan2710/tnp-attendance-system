const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };

/**
 * Parses date strings in various formats (DD-MM-YYYY, DD-MMM-YYYY, YYYY-MM-DD, DD/MM/YYYY, etc.)
 * into valid JavaScript Date objects for accurate chronological comparison.
 */
export const parseDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return new Date(0);
  const cleanStr = dateStr.trim();
  if (!cleanStr) return new Date(0);

  const parts = cleanStr.split(/[-/.]/);
  if (parts.length === 3) {
    const p0 = parts[0].trim();
    const p1 = parts[1].trim();
    const p2 = parts[2].trim();

    // Format: YYYY-MM-DD or YYYY-MMM-DD (where p0 is 4-digit year)
    if (p0.length === 4 && !isNaN(parseInt(p0, 10))) {
      const year = parseInt(p0, 10);
      let month = parseInt(p1, 10) - 1;
      if (isNaN(month)) {
        month = MONTHS[p1.toLowerCase().slice(0, 3)];
      }
      const day = parseInt(p2, 10);
      if (!isNaN(year) && month !== undefined && !isNaN(month) && month >= 0 && month <= 11 && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }

    // Format: DD-MM-YYYY or DD-MMM-YYYY or DD-MM-YY (where p2 is year, p0 is day)
    const day = parseInt(p0, 10);
    let month;
    const p1Num = parseInt(p1, 10);
    if (!isNaN(p1Num)) {
      month = p1Num - 1;
    } else {
      month = MONTHS[p1.toLowerCase().slice(0, 3)];
    }

    let year = parseInt(p2, 10);
    if (!isNaN(year) && year < 100) year += 2000;

    if (!isNaN(day) && month !== undefined && !isNaN(month) && month >= 0 && month <= 11 && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  const parsed = new Date(cleanStr);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
};
