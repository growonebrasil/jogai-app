
SELECT cron.unschedule('finalize-voting-every-5min');
SELECT cron.unschedule('check-overdue-payments-daily');

SELECT cron.schedule(
  'finalize-voting-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mrgtdryzbaycmjtcbohf.supabase.co/functions/v1/finalize-voting',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer 8D3F9A72C1E54B6F98A3D7E2C5F1A8B4"}'::jsonb,
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
    headers := '{"Content-Type":"application/json","Authorization":"Bearer 8D3F9A72C1E54B6F98A3D7E2C5F1A8B4"}'::jsonb,
    body := '{"time":"daily-check"}'::jsonb
  );
  $$
);
