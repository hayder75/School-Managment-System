const operations = require('./operations.service');

module.exports = {
  // Books
  async listBooks(req, res) {
    const { search, category } = req.query;
    const books = await operations.listBooks(req.tenant.id, { search, category });
    res.json({ success: true, data: books });
  },
  async createBook(req, res) {
    const book = await operations.createBook(req.tenant.id, req.validated.body);
    res.status(201).json({ success: true, data: book });
  },
  async updateBook(req, res) {
    const book = await operations.updateBook(req.tenant.id, req.params.id, req.validated.body);
    if (!book) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Book not found' } });
    res.json({ success: true, data: book });
  },
  async deleteBook(req, res) {
    try {
      await operations.deleteBook(req.tenant.id, req.params.id);
      res.json({ success: true, data: null });
    } catch (err) {
      if (err.code === 'HAS_BORROWINGS') return res.status(400).json({ success: false, error: { code: 'HAS_BORROWINGS', message: 'This book has active borrowings' } });
      throw err;
    }
  },
  async listCategories(req, res) {
    res.json({ success: true, data: await operations.listCategories(req.tenant.id) });
  },
  async catalog(req, res) {
    const { search, category } = req.query;
    res.json({ success: true, data: await operations.catalog(req.tenant.id, { search, category }) });
  },
  async myBorrowings(req, res) {
    res.json({ success: true, data: await operations.myBorrowings(req.tenant.id, req.user.userId) });
  },
  async libraryStats(req, res) {
    res.json({ success: true, data: await operations.libraryStats(req.tenant.id) });
  },
  async libraryInventory(req, res) {
    res.json({ success: true, data: await operations.libraryInventory(req.tenant.id) });
  },
  async listAssessments(req, res) {
    const { book_id, limit } = req.query;
    res.json({ success: true, data: await operations.listAssessments(req.tenant.id, { book_id, limit }) });
  },
  async createAssessment(req, res) {
    try {
      const data = await operations.createAssessment(req.tenant.id, req.user.userId, req.validated.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      const map = { BAD_CONDITION: [400, 'BAD_CONDITION', 'Unknown condition'], NOT_FOUND: [404, 'NOT_FOUND', 'Book not found'] };
      if (map[err.message]) return res.status(map[err.message][0]).json({ success: false, error: { code: map[err.message][1], message: map[err.message][2] } });
      throw err;
    }
  },
  async getLibrarySettings(req, res) {
    res.json({ success: true, data: await operations.getLibrarySettings(req.tenant.id) });
  },
  async updateLibrarySettings(req, res) {
    res.json({ success: true, data: await operations.updateLibrarySettings(req.tenant.id, req.validated.body) });
  },
  async borrowBook(req, res) {
    try {
      const result = await operations.borrowBook(req.tenant.id, req.user.userId, req.validated.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      const map = {
        NO_COPIES_AVAILABLE: [400, 'NO_COPIES', 'No copies available'],
        BORROW_LIMIT: [400, 'BORROW_LIMIT', 'This student has reached the borrow limit'],
        ALREADY_BORROWED: [400, 'ALREADY_BORROWED', 'This student already has a copy of this book'],
      };
      if (map[err.message]) return res.status(map[err.message][0]).json({ success: false, error: { code: map[err.message][1], message: map[err.message][2] } });
      throw err;
    }
  },
  async returnBook(req, res) {
    const result = await operations.returnBook(req.tenant.id, req.params.id, req.body || {});
    res.json({ success: true, data: result });
  },
  async listBorrowings(req, res) {
    const { status, search, from, to } = req.query;
    const data = await operations.listBorrowings(req.tenant.id, { status, search, from, to });
    res.json({ success: true, data });
  },

  // Transport
  async listRoutes(req, res) {
    const data = await operations.listRoutes(req.tenant.id);
    res.json({ success: true, data });
  },
  async createRoute(req, res) {
    const route = await operations.createRoute(req.tenant.id, req.validated.body);
    res.status(201).json({ success: true, data: route });
  },
  async allocateRoute(req, res) {
    try {
      const result = await operations.allocateRoute(req.tenant.id, req.validated.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      if (err.message === 'ROUTE_FULL') return res.status(400).json({ success: false, error: { code: 'ROUTE_FULL', message: 'Route is at full capacity' } });
      throw err;
    }
  },
  async listTransportAllocations(req, res) {
    const data = await operations.listAllocations(req.tenant.id);
    res.json({ success: true, data });
  },

  // Hostel
  async listRooms(req, res) {
    const data = await operations.listRooms(req.tenant.id);
    res.json({ success: true, data });
  },
  async createRoom(req, res) {
    const room = await operations.createRoom(req.tenant.id, req.validated.body);
    res.status(201).json({ success: true, data: room });
  },
  async allocateRoom(req, res) {
    try {
      const result = await operations.allocateRoom(req.tenant.id, req.validated.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      if (err.message === 'ROOM_FULL') return res.status(400).json({ success: false, error: { code: 'ROOM_FULL', message: 'Room is at full capacity' } });
      throw err;
    }
  },
  async listHostelAllocations(req, res) {
    const data = await operations.listAllocationsHostel(req.tenant.id);
    res.json({ success: true, data });
  },

  // Backup & Timetable
  async backup(req, res) {
    const data = await operations.backup(req.tenant.id);
    res.json({ success: true, data });
  },
  async autoGenerateTimetable(req, res) {
    const result = await operations.autoGenerateTimetable(req.tenant.id);
    res.json({ success: true, data: result });
  },
  async restore(req, res) {
    const result = await operations.restore(req.tenant.id, req.body);
    res.json({ success: true, data: result });
  },
};
