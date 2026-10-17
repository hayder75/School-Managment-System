// Standardized list search: OR-ilike across text columns, with phone matching
// that ignores country code / leading zero (e.g. "932123090" matches both
// "0932123090" and "251932123090").

function phoneDigits(term) {
  let d = String(term || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('251')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d.length >= 7 ? d : null;
}

// query: knex query builder. textCols/phoneCols: SQL column names.
function applySearch(query, term, textCols = [], phoneCols = []) {
  const t = String(term || '').trim();
  if (!t) return query;
  const like = `%${t}%`;
  const digits = phoneDigits(t);
  const searchDigits = digits || (/^\d+$/.test(t) ? t : null);
  return query.where(function () {
    for (const c of textCols) this.orWhere(c, 'ilike', like);
    if (searchDigits) {
      for (const c of phoneCols) {
        this.orWhereRaw(`regexp_replace(coalesce(${c}, ''), '\\D', '', 'g') LIKE ?`, [`%${searchDigits}%`]);
      }
    }
  });
}

module.exports = { applySearch, phoneDigits };
