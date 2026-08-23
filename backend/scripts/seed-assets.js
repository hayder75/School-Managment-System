/* Seeds a realistic school asset inventory (Ministry of Education style). Safe to re-run. */
const knex = require('../src/config/database');
const TENANT = '00000000-0000-0000-0000-000000000001';

const ASSETS = [
  // Furniture
  ['Student Desk (two-seater)', 'Furniture', 'Classrooms Block A', 220, 850, 'Good', 'In Use', '2019-09-05'],
  ['Student Desk (two-seater)', 'Furniture', 'Classrooms Block B', 140, 850, 'Fair', 'In Use', '2020-09-01'],
  ['Student Chair', 'Furniture', 'Classrooms Block A', 450, 320, 'Good', 'In Use', '2019-09-05'],
  ['Teacher Desk & Chair set', 'Furniture', 'Staff Room', 32, 2400, 'Good', 'In Use', '2021-02-10'],
  ['Blackboard (wall-mounted)', 'Furniture', 'All Classrooms', 28, 1500, 'Good', 'In Use', '2018-07-20'],
  ['Office Filing Cabinet', 'Furniture', 'Admin Block', 9, 3100, 'Fair', 'In Use', '2017-11-12'],
  ['Shelf — Library', 'Furniture', 'Library', 18, 2800, 'Good', 'In Use', '2020-01-15'],
  // Electronics / ICT
  ['Desktop Computer (lab)', 'Electronics', 'Computer Lab A', 25, 18500, 'Good', 'In Use', '2022-06-01'],
  ['Desktop Computer (old batch)', 'Electronics', 'Computer Lab B', 10, 15000, 'Poor', 'Broken', '2015-03-14'],
  ['Laptop — Administrative', 'Electronics', 'Admin Block', 6, 42000, 'Good', 'In Use', '2023-04-18'],
  ['Projector', 'Electronics', 'Hall / Lab 1', 4, 22000, 'Good', 'In Use', '2023-01-20'],
  ['Photocopier Machine', 'Electronics', 'Records Office', 2, 65000, 'Fair', 'Maintenance', '2018-08-30'],
  ['Printer — LaserJet', 'Electronics', 'Admin Block', 5, 12500, 'Good', 'In Use', '2022-02-02'],
  ['School PA / Speaker System', 'Electronics', 'Main Hall', 1, 30000, 'Good', 'In Use', '2021-09-19'],
  // Books / Library
  ['Textbook Sets (all grades)', 'Books', 'Library Store', 350, 180, 'Good', 'In Use', '2022-09-10'],
  ['Reference & Encyclopedia Set', 'Books', 'Library', 40, 450, 'Good', 'In Use', '2019-05-05'],
  // Lab
  ['Microscope', 'Lab', 'Biology Lab', 12, 9000, 'Good', 'In Use', '2021-10-01'],
  ['Beaker & Test Tube Set', 'Lab', 'Chemistry Lab', 60, 250, 'Fair', 'In Use', '2020-08-16'],
  ['Skeleton Model (human)', 'Lab', 'Biology Lab', 2, 7500, 'Good', 'In Use', '2018-10-25'],
  // Sports
  ['Football (match ball)', 'Sports', 'Sport Store', 14, 900, 'Fair', 'In Use', '2023-09-01'],
  ['Volleyball Net Set', 'Sports', 'Sport Field', 3, 2600, 'Good', 'In Use', '2022-11-11'],
  ['Athletics Starting Blocks', 'Sports', 'Sport Field', 4, 1800, 'Good', 'Available', '2023-02-27'],
  // Vehicle
  ['School Mini-bus', 'Vehicle', 'Transport Garage', 2, 950000, 'Good', 'In Use', '2021-07-07'],
];

// A few already disposed (waste record demo)
const DISPOSED = [
  ['Overhead Projector (analogue)', 'Electronics', 'Storage Room', 3, 8000, 'Poor', 'Disposed', '2014-05-10',
    '2026-02-15', 'Obsolete technology; replaced by digital projectors.', 'Donated'],
  ['Rotovator Tiller', 'Other', 'Store', 1, 35000, 'Poor', 'Disposed', '2012-01-09',
    '2026-03-20', 'Engine seized; beyond economical repair.', 'Sold'],
];

async function up() {
  const existing = await knex('school_assets').where('tenant_id', TENANT).count('* as c');
  if (Number(existing[0].c) > 0) return console.log('assets already seeded:', existing[0].c);

  let n = 1000;
  const rows = ASSETS.map(([name, category, location, qty, unitCost, condition, status, date]) => ({
    tenant_id: TENANT,
    name,
    asset_code: `AST-${++n}`,
    category,
    quantity: qty,
    unit_cost: unitCost,
    total_cost: qty * unitCost,
    location,
    status,
    condition,
    purchase_date: date,
  }));

  const dRows = DISPOSED.map(([name, category, location, qty, unitCost, condition, status, pDate, disDate, reason, method]) => ({
    tenant_id: TENANT,
    name,
    asset_code: `AST-${++n}`,
    category,
    quantity: qty,
    unit_cost: unitCost,
    total_cost: qty * unitCost,
    location,
    status,
    condition,
    purchase_date: pDate,
    disposal_date: disDate,
    disposal_reason: reason,
    disposal_method: method,
  }));

  await knex('school_assets').insert([...rows, ...dRows]);
  console.log('seeded assets:', rows.length + dRows.length);
}

up().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
