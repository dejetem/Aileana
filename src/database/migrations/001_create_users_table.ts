import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable();
    table.string('email', 255).unique().notNullable();
    table.string('phone', 20).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('avatar', 500).nullable();
    table.boolean('email_verified').defaultTo(false);
    table.boolean('phone_verified').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at').nullable();
    table.timestamps(true, true);

    // Indexes
    table.index(['email']);
    table.index(['phone']);
    table.index(['is_active']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}