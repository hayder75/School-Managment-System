const bcrypt = require('bcrypt');
const db = require('../src/config/database');

const DEMO_USERS = [
  { role: 'owner', username: 'demo.owner', first_name: 'Demo', last_name: 'Owner', job_title: 'School Owner' },
  { role: 'general_manager', username: 'demo.director', first_name: 'Demo', last_name: 'Director', job_title: 'General Manager' },
  { role: 'quality_director', username: 'demo.quality', first_name: 'Demo', last_name: 'Quality', job_title: 'Quality Director' },
  { role: 'finance', username: 'demo.finance', first_name: 'Demo', last_name: 'Finance', job_title: 'Finance Officer' },
  { role: 'general_services', username: 'demo.services', first_name: 'Demo', last_name: 'Services', job_title: 'General Services' },
  { role: 'shift_coordinator', username: 'demo.shift', first_name: 'Demo', last_name: 'Shift', job_title: 'Shift Coordinator' },
  { role: 'security_head', username: 'demo.security', first_name: 'Demo', last_name: 'Security', job_title: 'Head of Security' },
  { role: 'face_attendance', username: 'demo.face', first_name: 'Demo', last_name: 'Face', job_title: 'Face Attendance' },
];

(async () => {
  const tenant = await db('tenants').orderBy('created_at').first();
  if (!tenant) {
    console.error('No tenant found.');
    process.exit(1);
  }
  const hash = await bcrypt.hash('1234', 10);
  for (const d of DEMO_USERS) {
    const exists = await db('users').where({ tenant_id: tenant.id, username: d.username }).first();
    if (exists) {
      console.log('skip  ', d.username, `(${d.role})`);
      continue;
    }
    await db('users').insert({
      tenant_id: tenant.id,
      email: `${d.username}@staff.mountolive.edu.et`,
      username: d.username,
      password_hash: hash,
      first_name: d.first_name,
      last_name: d.last_name,
      role: d.role,
      job_title: d.job_title,
      status: 'active',
    });
    console.log('created', d.username, `(${d.role})`);
  }
  process.exit(0);
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
