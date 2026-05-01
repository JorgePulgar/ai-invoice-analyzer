// Returns the date string if valid YYYY-MM-DD, false if present but invalid, null if absent.
function parseDateParam(value) {
  if (value === undefined || value === null) return null;
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(value))) return false;
  return String(value);
}

module.exports = { parseDateParam };
