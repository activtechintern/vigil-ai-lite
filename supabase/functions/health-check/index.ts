import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active monitors
    const { data: monitors, error: fetchError } = await supabase
      .from('monitors')
      .select('*')
      .order('created_at');

    if (fetchError) {
      console.error('Error fetching monitors:', fetchError);
      throw fetchError;
    }

    console.log(`Starting health checks for ${monitors?.length || 0} monitors`);

    // Check each monitor
    for (const monitor of monitors || []) {
      const startTime = Date.now();
      let status: 'up' | 'down' = 'down';
      let statusCode: number | null = null;
      let responseTime: number | null = null;
      let issue: string | null = null;

      try {
        console.log(`Checking monitor: ${monitor.name} (${monitor.url})`);
        
        const response = await fetch(monitor.url, {
          method: 'GET',
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        statusCode = response.status;
        responseTime = Date.now() - startTime;
        status = response.ok ? 'up' : 'down';
        
        if (!response.ok) {
          issue = `HTTP ${statusCode}: ${response.statusText}`;
        }

        console.log(`Monitor ${monitor.name}: ${status} (${responseTime}ms, status: ${statusCode})`);
      } catch (error) {
        responseTime = Date.now() - startTime;
        status = 'down';
        issue = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Monitor ${monitor.name} failed:`, issue);
      }

      // Update monitor status
      const { error: updateError } = await supabase
        .from('monitors')
        .update({
          status,
          last_checked_at: new Date().toISOString(),
        })
        .eq('id', monitor.id);

      if (updateError) {
        console.error(`Error updating monitor ${monitor.id}:`, updateError);
      }

      // Insert metric
      const { error: metricError } = await supabase
        .from('metrics')
        .insert({
          monitor_id: monitor.id,
          status,
          status_code: statusCode,
          response_time: responseTime,
          checked_at: new Date().toISOString(),
        });

      if (metricError) {
        console.error(`Error inserting metric for ${monitor.id}:`, metricError);
      }

      // Handle alerts
      if (status === 'down') {
        // Check if there's already an active alert for this monitor
        const { data: existingAlert } = await supabase
          .from('alerts')
          .select('*')
          .eq('monitor_id', monitor.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!existingAlert) {
          // Create new alert
          const { error: alertError } = await supabase
            .from('alerts')
            .insert({
              monitor_id: monitor.id,
              status: 'active',
              issue: issue || 'Service is down',
            });

          if (alertError) {
            console.error(`Error creating alert for ${monitor.id}:`, alertError);
          } else {
            console.log(`Created alert for monitor ${monitor.name}`);
          }
        }
      } else if (status === 'up') {
        // Resolve any active alerts
        const { error: resolveError } = await supabase
          .from('alerts')
          .update({ status: 'resolved' })
          .eq('monitor_id', monitor.id)
          .eq('status', 'active');

        if (resolveError) {
          console.error(`Error resolving alerts for ${monitor.id}:`, resolveError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: monitors?.length || 0,
        timestamp: new Date().toISOString() 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
