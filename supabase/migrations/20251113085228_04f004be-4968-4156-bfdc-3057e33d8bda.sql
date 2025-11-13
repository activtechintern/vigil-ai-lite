-- Enable realtime on tables
ALTER TABLE public.monitors REPLICA IDENTITY FULL;
ALTER TABLE public.metrics REPLICA IDENTITY FULL;
ALTER TABLE public.alerts REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.monitors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

-- Create function to trigger health checks
CREATE OR REPLACE FUNCTION public.trigger_health_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://amyjujudtttoumsrlbng.supabase.co/functions/v1/health-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
END;
$$;