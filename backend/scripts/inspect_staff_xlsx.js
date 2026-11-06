const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'plans', 'alllistsstaff.xlsx');
const workbook = xlsx.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

const reportingManagers = new Set();
data.forEach(d => {
    if (d['Reporting Manager Email (Optional)']) {
        reportingManagers.add(d['Reporting Manager Email (Optional)'].trim().toLowerCase());
    }
});
console.log('Reporting Managers:', Array.from(reportingManagers));
