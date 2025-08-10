import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('calls', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('caller_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('callee_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('call_type', 10).notNullable(); // voice, video
    table.string('status', 20).defaultTo('initiated'); // initiated, ringing, answered, ended, missed, rejected
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('answered_at').nullable();
    table.timestamp('ended_at').nullable();
    table.integer('duration_seconds').nullable(); // Call duration in seconds
    table.string('end_reason', 50).nullable(); // completed, missed, rejected, failed
    table.json('metadata').nullable(); // Call quality metrics, etc.
    table.timestamps(true, true);

    // Indexes
    table.index(['caller_id']);
    table.index(['callee_id']);
    table.index(['caller_id', 'callee_id']);
    table.index(['status']);
    table.index(['call_type']);
    table.index(['started_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('calls');
}