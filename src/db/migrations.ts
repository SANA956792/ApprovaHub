import type { Pool } from 'pg';

/**
 * Additive compatibility migrations for databases created by earlier releases.
 * These statements preserve existing rows and can safely run at every startup.
 */
export async function runSchemaMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE public.request_categories
        ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'FileText',
        ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS subcategories text NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS requires_amount boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS requires_dates boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
        ADD COLUMN IF NOT EXISTS created_at timestamp without time zone NOT NULL DEFAULT now()
    `);

    // Earlier deployments may have created these Drizzle boolean fields as
    // integers. Convert them in place, preserving 1/0 and treating NULL as the
    // schema's default; no rows or tables are removed.
    await client.query(`
      DO $migration$
      DECLARE
        flag record;
        current_type text;
      BEGIN
        FOR flag IN
          SELECT * FROM (VALUES
            ('requires_amount', true),
            ('requires_dates', false),
            ('is_default', false),
            ('is_active', true)
          ) AS flags(column_name, default_value)
        LOOP
          SELECT data_type
            INTO current_type
            FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'request_categories'
             AND column_name = flag.column_name;

          IF current_type IN ('smallint', 'integer', 'bigint') THEN
            EXECUTE format(
              'ALTER TABLE public.request_categories ALTER COLUMN %I DROP DEFAULT',
              flag.column_name
            );
            EXECUTE format(
              'ALTER TABLE public.request_categories ALTER COLUMN %I TYPE boolean USING CASE WHEN %I IS NULL THEN %L::boolean WHEN %I = 0 THEN false ELSE true END',
              flag.column_name,
              flag.column_name,
              flag.default_value,
              flag.column_name
            );
          ELSIF current_type IS DISTINCT FROM 'boolean' THEN
            RAISE EXCEPTION
              'Unexpected data type % for request_categories.%; expected boolean or integer',
              current_type,
              flag.column_name;
          END IF;

          EXECUTE format(
            'UPDATE public.request_categories SET %I = %L::boolean WHERE %I IS NULL',
            flag.column_name,
            flag.default_value,
            flag.column_name
          );
          EXECUTE format(
            'ALTER TABLE public.request_categories ALTER COLUMN %I SET DEFAULT %L::boolean',
            flag.column_name,
            flag.default_value
          );
          EXECUTE format(
            'ALTER TABLE public.request_categories ALTER COLUMN %I SET NOT NULL',
            flag.column_name
          );
        END LOOP;
      END
      $migration$;
    `);

    // ON CONFLICT (name) requires a unique constraint/index. Do not remove or
    // rewrite duplicate records: report them and abort this transaction so an
    // operator can decide how to reconcile the preserved rows.
    await client.query(`
      DO $migration$
      DECLARE
        duplicate_names text;
      BEGIN
        SELECT string_agg(
                 format('%L (%s rows)', name, row_count),
                 ', ' ORDER BY name
               )
          INTO duplicate_names
          FROM (
            SELECT name, count(*) AS row_count
              FROM public.request_categories
             GROUP BY name
            HAVING count(*) > 1
          ) AS duplicates;

        IF duplicate_names IS NOT NULL THEN
          RAISE EXCEPTION
            'Cannot create unique index on public.request_categories(name): duplicate names found: %',
            duplicate_names;
        END IF;

        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS request_categories_name_unique_idx ON public.request_categories (name)';
      END
      $migration$;
    `);

    // Drizzle's serial('id') requires an integer column with an attached
    // sequence-backed default. Repair this for every table using that schema
    // pattern, retaining all existing IDs and moving each sequence past MAX(id).
    await client.query(`
      DO $migration$
      DECLARE
        table_name text;
        id_type text;
        sequence_name text;
        max_id bigint;
      BEGIN
        FOREACH table_name IN ARRAY ARRAY[
          'users',
          'request_categories',
          'requests',
          'request_attachments',
          'approval_history',
          'groups',
          'group_members',
          'group_messages',
          'notifications',
          'push_subscriptions',
          'app_settings'
        ]
        LOOP
          IF to_regclass(format('public.%I', table_name)) IS NULL THEN
            CONTINUE;
          END IF;

          SELECT data_type
            INTO id_type
            FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = table_name
             AND column_name = 'id';

          IF id_type IS NULL THEN
            CONTINUE;
          ELSIF id_type <> 'integer' THEN
            RAISE EXCEPTION
              'Unexpected data type % for public.%.id; Drizzle serial schema expects integer',
              id_type,
              table_name;
          END IF;

          sequence_name := pg_get_serial_sequence(
            format('public.%I', table_name),
            'id'
          );

          IF sequence_name IS NULL THEN
            sequence_name := format('public.%I', table_name || '_id_seq');
            EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %s', sequence_name);
            EXECUTE format(
              'ALTER SEQUENCE %s OWNED BY public.%I.id',
              sequence_name,
              table_name
            );
          END IF;

          EXECUTE format(
            'ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT nextval(%L::regclass)',
            table_name,
            sequence_name
          );

          EXECUTE format('SELECT MAX(id) FROM public.%I', table_name)
            INTO max_id;
          IF max_id IS NULL THEN
            PERFORM setval(sequence_name::regclass, 1, false);
          ELSE
            PERFORM setval(sequence_name::regclass, max_id, true);
          END IF;
        END LOOP;
      END
      $migration$;
    `);

    await client.query('COMMIT');
    console.info('Database schema migrations completed.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
