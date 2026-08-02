exports.up = function (knex) {
  return knex.schema
    .table('students', (table) => {
      table.string('father_name', 100);
      table.string('grandfather_name', 100);
      table.string('mother_name', 100);
      table.string('nationality', 100);
      table.string('country_of_birth', 100);
      table.string('region_of_residence', 150);
      table.string('zone_of_residence', 150);
      table.string('woreda_of_residence', 150);
      table.string('region_of_birth', 150);
      table.string('zone_of_birth', 150);
      table.string('woreda_of_birth', 150);
      table.string('kebele', 150);
      table.string('location_type', 20);
      table.boolean('disability').defaultTo(false);
      table.string('disability_type', 100);
      table.string('economic_status', 20);
      table.string('national_id', 50);
      table.string('parent_status', 50);
      table.string('family_head_gender', 10);
    })
    .table('users', (table) => {
      table.string('job_title', 150);
      table.string('qualification', 150);
      table.string('field_of_study', 150);
    })
    .table('student_parents', (table) => {
      table.string('education_level', 150);
    })
    .table('classes', (table) => {
      table.string('level_group', 20).defaultTo('primary');
    })
    .table('payroll', (table) => {
      table.integer('work_days');
      table.integer('absent_days');
      table.decimal('transport_allowance', 12, 2).defaultTo(0);
      table.decimal('overtime', 12, 2).defaultTo(0);
      table.decimal('back_pay', 12, 2).defaultTo(0);
      table.decimal('unit_leader_allowance', 12, 2).defaultTo(0);
      table.decimal('department_head_allowance', 12, 2).defaultTo(0);
      table.decimal('housing_allowance', 12, 2).defaultTo(0);
      table.decimal('account_allowance', 12, 2).defaultTo(0);
      table.decimal('phone_allowance', 12, 2).defaultTo(0);
      table.decimal('income_tax', 12, 2).defaultTo(0);
      table.decimal('eder', 12, 2).defaultTo(0);
      table.decimal('office_loan', 12, 2).defaultTo(0);
      table.decimal('cafe_loan', 12, 2).defaultTo(0);
      table.decimal('school_pay', 12, 2).defaultTo(0);
      table.decimal('pension_employee', 12, 2).defaultTo(0);
      table.decimal('pension_employer', 12, 2).defaultTo(0);
      table.decimal('ne_starving', 12, 2).defaultTo(0);
      table.string('bank_account', 50);
      table.string('bank_name', 150);
    })
    .then(() =>
      knex.schema.createTable('enrollments', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE').onUpdate('CASCADE');
        table.uuid('student_id').notNullable().references('id').inTable('students').onDelete('CASCADE');
        table.uuid('academic_year_id').references('id').inTable('academic_years').onDelete('SET NULL');
        table.uuid('class_id').references('id').inTable('classes').onDelete('SET NULL');
        table.integer('grade_level');
        table.string('section', 20);
        table.string('admission_category', 50);
        table.string('admission_modality', 50);
        table.string('education_stream', 100);
        table.string('cte_field_1', 150);
        table.string('cte_field_2', 150);
        table.integer('num_textbooks');
        table.string('instructional_language', 100);
        table.boolean('school_feeding').defaultTo(false);
        table.boolean('food_ration_home').defaultTo(false);
        table.integer('meals_per_week');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.unique(['tenant_id', 'student_id', 'academic_year_id']);
        table.index('tenant_id');
        table.index('class_id');
      })
    );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('enrollments')
    .then(() =>
      knex.schema
        .table('students', (table) => {
          table.dropColumn('father_name');
          table.dropColumn('grandfather_name');
          table.dropColumn('mother_name');
          table.dropColumn('nationality');
          table.dropColumn('country_of_birth');
          table.dropColumn('region_of_residence');
          table.dropColumn('zone_of_residence');
          table.dropColumn('woreda_of_residence');
          table.dropColumn('region_of_birth');
          table.dropColumn('zone_of_birth');
          table.dropColumn('woreda_of_birth');
          table.dropColumn('kebele');
          table.dropColumn('location_type');
          table.dropColumn('disability');
          table.dropColumn('disability_type');
          table.dropColumn('economic_status');
          table.dropColumn('national_id');
          table.dropColumn('parent_status');
          table.dropColumn('family_head_gender');
        })
        .table('users', (table) => {
          table.dropColumn('job_title');
          table.dropColumn('qualification');
          table.dropColumn('field_of_study');
        })
        .table('student_parents', (table) => {
          table.dropColumn('education_level');
        })
        .table('classes', (table) => {
          table.dropColumn('level_group');
        })
        .table('payroll', (table) => {
          table.dropColumn('work_days');
          table.dropColumn('absent_days');
          table.dropColumn('transport_allowance');
          table.dropColumn('overtime');
          table.dropColumn('back_pay');
          table.dropColumn('unit_leader_allowance');
          table.dropColumn('department_head_allowance');
          table.dropColumn('housing_allowance');
          table.dropColumn('account_allowance');
          table.dropColumn('phone_allowance');
          table.dropColumn('income_tax');
          table.dropColumn('eder');
          table.dropColumn('office_loan');
          table.dropColumn('cafe_loan');
          table.dropColumn('school_pay');
          table.dropColumn('pension_employee');
          table.dropColumn('pension_employer');
          table.dropColumn('ne_starving');
          table.dropColumn('bank_account');
          table.dropColumn('bank_name');
        })
    );
};
