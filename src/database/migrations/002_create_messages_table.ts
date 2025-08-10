import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('sender_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('recipient_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.text('content').notNullable();
    table.string('message_type', 20).defaultTo('text'); // text, image, file, etc.
    table.string('file_url', 500).nullable();
    table.boolean('is_read').defaultTo(false);
    table.timestamp('read_at').nullable();
    table.boolean('is_deleted').defaultTo(false);
    table.timestamp('deleted_at').nullable();
    table.json('metadata').nullable(); // Additional message data
    table.timestamps(true, true);

    // Indexes
    table.index(['sender_id']);
    table.index(['recipient_id']);
    table.index(['sender_id', 'recipient_id']);
    table.index(['is_read']);
    table.index(['created_at']);
    table.index(['is_deleted']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('messages');
}