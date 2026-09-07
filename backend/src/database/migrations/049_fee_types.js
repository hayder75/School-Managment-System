exports.up = async function up(knex) {
  const has = await knex.schema.hasColumn('fee_structures', 'fee_type');
  if (!has) {
    await knex.schema.table('fee_structures', (table) => {
      table.string('fee_type', 30).defaultTo('other');
    });
  }

  // Seed default fee structures if none exist
  const tenant = '00000000-0000-0000-0000-000000000001';
  const count = await knex('fee_structures').where('tenant_id', tenant).count('* as c');
  if (Number(count[0].c) === 0) {
    const classes = await knex('classes').where('tenant_id', tenant).select('id').limit(4);
    for (const cls of classes) {
      await knex('fee_structures').insert([
        { tenant_id: tenant, name: 'Registration Fee', class_id: cls.id, amount: 500, frequency: 'once', fee_type: 'registration' },
        { tenant_id: tenant, name: 'Monthly Tuition', class_id: cls.id, amount: 450, frequency: 'monthly', fee_type: 'mandatory-monthly' },
        { tenant_id: tenant, name: 'Transport Fee', class_id: cls.id, amount: 200, frequency: 'monthly', fee_type: 'optional' },
        { tenant_id: tenant, name: 'Sports & Activities', class_id: cls.id, amount: 100, frequency: 'termly', fee_type: 'optional' },
      ]);
    }
  }
};

exports.down = async function down(knex) {
  if (await knex.schema.hasColumn('fee_structures', 'fee_type')) {
    await knex.schema.table('fee_structures', (table) => table.dropColumn('fee_type'));
  }
};