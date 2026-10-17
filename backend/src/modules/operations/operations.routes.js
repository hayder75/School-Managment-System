const { Router } = require('express');
const ctrl = require('./operations.controller');
const auth = require('../../middleware/auth');
const tenant = require('../../middleware/tenant');
const requireAccess = require('../../middleware/access');
const validate = require('../../middleware/validate');
const { bookSchema, updateBookSchema, borrowSchema, librarySettingsSchema, assessmentSchema, routeSchema, transportAllocSchema, roomSchema, hostelAllocSchema } = require('./operations.validation');

const router = Router();
router.use(auth);
router.use(tenant);

const LIB = ['admin', 'owner', 'librarian'];
const LIB_VIEW = ['admin', 'owner', 'librarian', 'general_services'];

// Library — catalog & self-service
router.get('/library/catalog', requireAccess([...LIB_VIEW, 'teacher', 'student', 'parent', 'principal', 'vice_principal', 'quality_director', 'general_manager'], ['operations.manage', 'students.view']), ctrl.catalog);
router.get('/library/stats', requireAccess([...LIB_VIEW, 'principal', 'vice_principal', 'general_manager'], ['operations.manage', 'reports.view']), ctrl.libraryStats);
router.get('/library/my-borrowings', requireAccess(['student', 'parent', 'teacher', 'admin', 'owner', 'librarian'], []), ctrl.myBorrowings);
router.get('/library/settings', requireAccess(LIB_VIEW, []), ctrl.getLibrarySettings);
router.put('/library/settings', requireAccess(LIB, []), validate(librarySettingsSchema), ctrl.updateLibrarySettings);
router.get('/library/categories', requireAccess(LIB_VIEW, []), ctrl.listCategories);
router.get('/library/inventory', requireAccess(LIB_VIEW, ['operations.manage', 'reports.view']), ctrl.libraryInventory);
router.get('/library/assessments', requireAccess(LIB_VIEW, ['operations.manage', 'reports.view']), ctrl.listAssessments);
router.post('/library/assessments', requireAccess(LIB, ['operations.manage']), validate(assessmentSchema), ctrl.createAssessment);

// Library — librarian management
router.get('/books', requireAccess(LIB_VIEW, ['operations.manage']), ctrl.listBooks);
router.post('/books', requireAccess(LIB, ['operations.manage']), validate(bookSchema), ctrl.createBook);
router.put('/books/:id', requireAccess(LIB, ['operations.manage']), validate(updateBookSchema), ctrl.updateBook);
router.delete('/books/:id', requireAccess(LIB, ['operations.manage']), ctrl.deleteBook);
router.post('/books/borrow', requireAccess(LIB, ['operations.manage']), validate(borrowSchema), ctrl.borrowBook);
router.patch('/books/return/:id', requireAccess(LIB, ['operations.manage']), ctrl.returnBook);
router.get('/books/borrowings', requireAccess(LIB_VIEW, ['operations.manage']), ctrl.listBorrowings);

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
router.post('/timetable/generate', requireAccess(['admin', 'owner', 'hr', 'quality_director'], ['timetable.manage']), ctrl.autoGenerateTimetable);

module.exports = router;
