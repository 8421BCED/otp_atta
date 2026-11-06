const fs = require('fs');

const content = fs.readFileSync('./plans/staffProf.csv', 'utf8');
const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
console.log('Total lines in staffProf.csv:', lines.length);

const header = lines[0].split(';').map(h => h.replace(/^"|"$/g, '').trim());
console.log('Columns count:', header.length);
console.log('Columns:', header);

const rows = [];
const colMismatch = [];

for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(';').map(p => p.replace(/^"|"$/g, '').trim());
  if (parts.length !== header.length) {
    colMismatch.push({ line: i + 1, partsLen: parts.length });
  } else {
    rows.push(parts);
  }
}

console.log('Valid data rows:', rows.length);
if (colMismatch.length > 0) {
  console.log('Column mismatches:', colMismatch);
}

// Map column name to index
const colIdx = {};
header.forEach((h, i) => { colIdx[h] = i; });

const staffCodes = new Map();
const emails = new Map();
const names = new Map();
const depts = new Set();
const desigs = new Set();
const activeStatus = new Map();

rows.forEach((r, idx) => {
  const code = r[colIdx['Staff_Code']];
  const name = r[colIdx['Staff_Prof_Name']];
  const dept = r[colIdx['Staff_Prof_Dept']];
  const desig = r[colIdx['Staff_Prof_Desig']];
  const email = r[colIdx['Staff_Official_Mail']] || r[colIdx['Staff_Prof_MailID']];
  const active = r[colIdx['Is_Active']];

  depts.add(dept);
  desigs.add(desig);

  if (!staffCodes.has(code)) staffCodes.set(code, []);
  staffCodes.get(code).push({ line: idx + 2, name, email, dept, desig, active });

  if (email) {
    const normEmail = email.toLowerCase().trim();
    if (!emails.has(normEmail)) emails.set(normEmail, []);
    emails.get(normEmail).push({ line: idx + 2, code, name });
  }

  activeStatus.set(active, (activeStatus.get(active) || 0) + 1);
});

console.log('\n--- SUMMARY ---');
console.log('Total records:', rows.length);
console.log('Unique Staff Codes:', staffCodes.size);
console.log('Unique Emails:', emails.size);
console.log('Active status distribution:', Object.fromEntries(activeStatus));
console.log('Departments present in CSV:', Array.from(depts));
console.log('Designations present in CSV:', Array.from(desigs));

const dupCodes = [...staffCodes.entries()].filter(([k, v]) => v.length > 1);
const dupEmails = [...emails.entries()].filter(([k, v]) => v.length > 1);

console.log('\nDuplicate Staff Codes count:', dupCodes.length);
if (dupCodes.length > 0) {
  console.log('Sample Duplicate Codes:', dupCodes.slice(0, 5));
}

console.log('\nDuplicate Emails count:', dupEmails.length);
if (dupEmails.length > 0) {
  console.log('Sample Duplicate Emails:', dupEmails.slice(0, 5));
}

// Sample first 3 records
console.log('\n--- SAMPLE RECORD 1 ---');
header.forEach(h => {
  console.log(`${h}: ${rows[0][colIdx[h]]}`);
});
