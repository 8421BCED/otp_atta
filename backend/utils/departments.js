// Some departments share a HOD (for example AI-DS and AI-ML). Everything that checks
// "is this student in my department" goes through here so the rule lives in one place.
const { departmentGroups } = require('../config');

const norm = (d) => String(d || '').trim().toUpperCase();

// All department names that belong together with `dept` (including itself).
const groupOf = (dept) => {
    const n = norm(dept);
    for (const g of departmentGroups) {
        if (g.map(norm).includes(n)) return g;
    }
    return dept ? [dept] : [];
};

// Does a person in `userDept` look after students of `studentDept`?
const sameGroup = (userDept, studentDept) => {
    if (!userDept || !studentDept) return false;
    return groupOf(userDept).map(norm).includes(norm(studentDept));
};

module.exports = { groupOf, sameGroup };
