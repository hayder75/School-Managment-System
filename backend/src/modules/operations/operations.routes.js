const { Router } = require('express');
const ctrl = require('./operations.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const rbac = require('../../middleware/rbac');
const validate = require('../../middleware/validate');
const { bookSchema, borrowSchema, routeSchema, transportAllocSchema, roomSchema, hostelAllocSchema } = require('./operations.validation');

const router = Router();
router.use(auth);
router.use(tenant);

router.get('/books', rbac('admin', 'owner', 'teacher', 'student'), ctrl.listBooks);
router.post('/books', rbac('admin', 'owner'), validate(bookSchema), ctrl.createBook);
router.post('/books/borrow', rbac('admin', 'owner', 'teacher'), validate(borrowSchema), ctrl.borrowBook);
router.patch('/books/return/:id', rbac('admin', 'owner', 'teacher'), ctrl.returnBook);
router.get('/books/borrowings', rbac('admin', 'owner', 'teacher'), ctrl.listBorrowings);

router.get('/routes', rbac('admin', 'owner', 'teacher'), ctrl.listRoutes);
router.post('/routes', rbac('admin', 'owner'), validate(routeSchema), ctrl.createRoute);
router.post('/routes/allocate', rbac('admin', 'owner'), validate(transportAllocSchema), ctrl.allocateRoute);
router.get('/routes/allocations', rbac('admin', 'owner', 'teacher'), ctrl.listTransportAllocations);

router.get('/rooms', rbac('admin', 'owner', 'teacher'), ctrl.listRooms);
router.post('/rooms', rbac('admin', 'owner'), validate(roomSchema), ctrl.createRoom);
router.post('/rooms/allocate', rbac('admin', 'owner'), validate(hostelAllocSchema), ctrl.allocateRoom);
router.get('/rooms/allocations', rbac('admin', 'owner', 'teacher'), ctrl.listHostelAllocations);

router.get('/backup', rbac('admin', 'owner'), ctrl.backup);
router.post('/restore', rbac('admin', 'owner'), ctrl.restore);
router.post('/timetable/generate', rbac('admin', 'owner'), ctrl.autoGenerateTimetable);

module.exports = router;
