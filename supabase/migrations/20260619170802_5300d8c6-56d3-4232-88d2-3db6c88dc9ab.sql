
SELECT cron.unschedule('finalize-voting-every-5min');
SELECT cron.unschedule('check-overdue-payments-daily');

SELECT cron.schedule(
  'finalize-voting-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mrgtdryzbaycmjtcbohf.supabase.co/functions/v1/finalize-voting',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer 7f3c9a2b8e1d4f60a5c7b9e3d8f1a4c6b2e5d9f3a7c1e8b4d6f9a2c5e7b1d3f9"}'::jsonb,
    body := '{"time":"now"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'check-overdue-payments-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mrgtdryzbaycmjtcbohf.supabase.co/functions/v1/check-overdue-payments',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer 7f3c9a2b8e1d4f60a5c7b9e3d8f1a4c6b2e5d9f3a7c1e8b4d6f9a2c5e7b1d3f9"}'::jsonb,
    body := '{"time":"daily-check"}'::jsonb
  );
  $$
);
