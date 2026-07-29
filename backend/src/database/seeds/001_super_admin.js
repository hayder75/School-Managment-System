const bcrypt = require('bcrypt');

exports.seed = async function (knex) {
  await knex('users').where({ email: 'super@demo.com' }).del();
  await knex('tenants').where({ slug: 'demo-school' }).del();

  const hash = await bcrypt.hash('1234', 10);

  await knex('tenants').insert({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Yemokera International School',
    slug: 'demo-school',
    email: 'info@yemokera.edu.et',
    phone: '+251-911-000001',
    address: 'Birhan Adebabay, Addis Ababa, Ethiopia',
    subscription_plan: 'premium',
    status: 'active',
  });

  await knex('users').insert({
    id: '00000000-0000-0000-0000-000000000001',
    tenant_id: null,
    email: 'super@demo.com',
    password_hash: hash,
    first_name: 'Hayder',
    last_name: 'Astedadari',
    role: 'super_admin',
    status: 'active',
  });
};
