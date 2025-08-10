import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('wallets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('wallet_id', 100).unique().notNullable(); // OnePipe wallet ID
    table.string('account_number', 20).nullable();
    table.string('bank_code', 10).nullable();
    table.decimal('balance', 15, 2).defaultTo(0);
    table.string('currency', 3).defaultTo('NGN');
    table.string('status', 20).defaultTo('active'); // active, suspended, closed
    table.json('metadata').nullable(); // Additional OnePipe data
    table.timestamps(true, true);

    // Indexes
    table.index(['user_id']);
    table.index(['wallet_id']);
    table.index(['status']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('wallets');
}