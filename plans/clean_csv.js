const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'staffProf.csv');
const outputPath = path.join(__dirname, 'staffProf_cleaned.csv');
const backupPath = path.join(__dirname, 'staffProf_raw_backup.csv');

// 1. Read raw CSV
const rawContent = fs.readFileSync(inputPath, 'utf8');

// Also make a safe backup of the original
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, rawContent, 'utf8');
  console.log(`Saved backup copy to ${backupPath}`);
}

// 2. Parse CSV taking quotes and multiline fields into account
function parseSemicolonCSV(text) {
  const records = [];
  let currentRecord = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      currentRecord.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRecord.push(currentField);
      currentField = '';
      if (currentRecord.length > 1 || currentRecord[0].trim() !== '') {
        records.push(currentRecord);
      }
      currentRecord = [];
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(currentField);
    records.push(currentRecord);
  }

  return records;
}

const records = parseSemicolonCSV(rawContent);
console.log(`Total parsed records (including header): ${records.length}`);

const header = records[0].map(h => h.trim().replace(/^"|"$/g, ''));
console.log(`Header columns count: ${header.length}`);

// Clean each data row
const cleanedRecords = [header];

for (let r = 1; r < records.length; r++) {
  const row = records[r];
  if (row.length === 1 && row[0].trim() === '') continue;

  const cleanedRow = row.map(val => {
    // 1. Remove wrapping quotes if any
    let v = val.trim();
    if (v.startsWith('"') && v.endsWith('"')) {
      v = v.slice(1, -1);
    }
    // 2. Replace any internal newlines/carriage returns with a space or slash
    v = v.replace(/[\r\n]+/g, ' / ').trim();
    // 3. Normalize multiple spaces
    v = v.replace(/\s+/g, ' ');
    return v;
  });

  if (cleanedRow.length !== header.length) {
    console.warn(`Row ${r} length mismatch: got ${cleanedRow.length}, expected ${header.length}`);
  }

  cleanedRecords.push(cleanedRow);
}

console.log(`Cleaned data rows count (excluding header): ${cleanedRecords.length - 1}`);

// 3. Format back to standard clean CSV (standard comma or semicolon - let's make a standard semicolon and standard comma)
function toCSV(data, delimiter = ';') {
  return data.map(row => {
    return row.map(field => {
      // Escape if contains delimiter, double quotes, or spaces
      const str = String(field ?? '');
      if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes(',')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(delimiter);
  }).join('\r\n');
}

// Write the cleaned semicolon version
const cleanedSemicolonContent = toCSV(cleanedRecords, ';');
fs.writeFileSync(outputPath, cleanedSemicolonContent, 'utf8');
console.log(`Successfully written cleaned CSV to: ${outputPath}`);

// Also write a standard comma-separated version for convenience if opening in standard Excel / Pandas
const commaOutputPath = path.join(__dirname, 'staffProf_cleaned_comma.csv');
const cleanedCommaContent = toCSV(cleanedRecords, ',');
fs.writeFileSync(commaOutputPath, cleanedCommaContent, 'utf8');
console.log(`Successfully written standard comma-separated CSV to: ${commaOutputPath}`);

// Overwrite the original staffProf.csv with the clean version so subsequent steps just work smoothly
fs.writeFileSync(inputPath, cleanedSemicolonContent, 'utf8');
console.log(`Updated original ${inputPath} with the clean aligned data.`);
