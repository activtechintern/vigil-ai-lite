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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all unique users with monitors
    const { data: monitors, error: monitorsError } = await supabase
      .from('monitors')
      .select('user_id')
      .not('user_id', 'is', null);

    if (monitorsError) throw monitorsError;

    const uniqueUsers = [...new Set(monitors?.map(m => m.user_id) || [])];
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1); // Last 24 hours

    console.log(`Generating daily reports for ${uniqueUsers.length} users`);

    for (const userId of uniqueUsers) {
      try {
        // Fetch metrics for this user
        const { data: metrics, error: metricsError } = await supabase
          .from('metrics')
          .select(`
            *,
            monitors:monitor_id (
              id,
              name,
              url,
              user_id
            )
          `)
          .gte('checked_at', startDate.toISOString())
          .lte('checked_at', endDate.toISOString());

        if (metricsError) throw metricsError;

        const userMetrics = metrics?.filter(m => m.monitors?.user_id === userId) || [];

        if (userMetrics.length === 0) continue;

        // Generate CSV
        const csv = generateCSV(userMetrics);
        
        // Upload to storage
        const fileName = `daily-report-${startDate.toISOString().split('T')[0]}-${Date.now()}.csv`;
        const { error: uploadError } = await supabase
          .storage
          .from('reports')
          .upload(`${userId}/${fileName}`, csv, {
            contentType: 'text/csv',
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase
          .storage
          .from('reports')
          .getPublicUrl(`${userId}/${fileName}`);

        // Save report metadata
        await supabase
          .from('reports')
          .insert({
            user_id: userId,
            period: 'daily',
            report_url: publicUrl,
          });

        console.log(`Report generated for user ${userId}`);
      } catch (error) {
        console.error(`Failed to generate report for user ${userId}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, usersProcessed: uniqueUsers.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Daily report error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate daily reports' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateCSV(metrics: any[]): string {
  const headers = ['Timestamp', 'Monitor Name', 'URL', 'Status', 'Status Code', 'Response Time (ms)'];
  const rows = metrics.map(m => [
    new Date(m.checked_at).toISOString(),
    m.monitors?.name || 'Unknown',
    m.monitors?.url || 'Unknown',
    m.status,
    m.status_code || 'N/A',
    m.response_time || 'N/A',
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
}
