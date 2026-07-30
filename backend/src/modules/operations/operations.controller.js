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
  async borrowBook(req, res) {
    try {
      const result = await operations.borrowBook(req.tenant.id, req.validated.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      if (err.message === 'NO_COPIES_AVAILABLE') return res.status(400).json({ success: false, error: { code: 'NO_COPIES', message: 'No copies available' } });
      throw err;
    }
  },
  async returnBook(req, res) {
    const result = await operations.returnBook(req.tenant.id, req.params.id);
    res.json({ success: true, data: result });
  },
  async listBorrowings(req, res) {
    const data = await operations.listBorrowings(req.tenant.id);
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
