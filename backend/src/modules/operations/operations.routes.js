const { Router } = require('express');
const ctrl = require('./operations.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { bookSchema, borrowSchema, routeSchema, transportAllocSchema, roomSchema, hostelAllocSchema } = require('./operations.validation');

const router = Router();
router.use(auth);
router.use(tenant);

router.get('/books', requireAccess(['admin', 'owner', 'teacher', 'student'], ['operations.manage']), ctrl.listBooks);
router.post('/books', requireAccess(['admin', 'owner'], ['operations.manage']), validate(bookSchema), ctrl.createBook);
router.post('/books/borrow', requireAccess(['admin', 'owner', 'teacher'], ['operations.manage']), validate(borrowSchema), ctrl.borrowBook);
router.patch('/books/return/:id', requireAccess(['admin', 'owner', 'teacher'], ['operations.manage']), ctrl.returnBook);
router.get('/books/borrowings', requireAccess(['admin', 'owner', 'teacher'], ['operations.manage']), ctrl.listBorrowings);

router.get('/routes', requireAccess(['admin', 'owner', 'teacher'], ['operations.manage']), ctrl.listRoutes);
router.post('/routes', requireAccess(['admin', 'owner'], ['operations.manage']), validate(routeSchema), ctrl.createRoute);
router.post('/routes/allocate', requireAccess(['admin', 'owner'], ['operations.manage']), validate(transportAllocSchema), ctrl.allocateRoute);
router.get('/routes/allocations', requireAccess(['admin', 'owner', 'teacher'], ['operations.manage']), ctrl.listTransportAllocations);

router.get('/rooms', requireAccess(['admin', 'owner', 'teacher'], ['operations.manage']), ctrl.listRooms);
router.post('/rooms', requireAccess(['admin', 'owner'], ['operations.manage']), validate(roomSchema), ctrl.createRoom);
router.post('/rooms/allocate', requireAccess(['admin', 'owner'], ['operations.manage']), validate(hostelAllocSchema), ctrl.allocateRoom);
router.get('/rooms/allocations', requireAccess(['admin', 'owner', 'teacher'], ['operations.manage']), ctrl.listHostelAllocations);

router.get('/backup', requireAccess(['admin', 'owner'], ['backup.manage']), ctrl.backup);
router.post('/restore', requireAccess(['admin', 'owner'], ['backup.manage']), ctrl.restore);
router.post('/timetable/generate', requireAccess(['admin', 'owner'], ['timetable.manage']), ctrl.autoGenerateTimetable);

module.exports = router;
