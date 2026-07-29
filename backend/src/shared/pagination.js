function paginate(query, page = 1, limit = 20) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  return query.offset(offset).limit(limitNum);
}

async function paginatedResult(query, page = 1, limit = 20) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const countQuery = query.clone().clearSelect().clearOrder().count('* as total');
  const [{ total }] = await countQuery;

  const offset = (pageNum - 1) * limitNum;
  const rows = await query.offset(offset).limit(limitNum);

  return {
    data: rows,
    meta: {
      page: pageNum,
      limit: limitNum,
      total: parseInt(total, 10),
      totalPages: Math.ceil(parseInt(total, 10) / limitNum),
    },
  };
}

module.exports = { paginate, paginatedResult };
