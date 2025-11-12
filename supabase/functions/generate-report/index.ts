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

    const { period, userId, startDate, endDate } = await req.json();

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return new Response(
        JSON.stringify({ error: 'Invalid date range provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (start > end) {
      return new Response(
        JSON.stringify({ error: 'Start date must be before end date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch metrics data
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
      .gte('checked_at', start.toISOString())
      .lte('checked_at', end.toISOString())
      .order('checked_at', { ascending: true });

    if (metricsError) throw metricsError;

    // Filter by user's monitors
    const userMetrics = metrics?.filter(m => m.monitors?.user_id === userId) || [];

    if (userMetrics.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data available for the selected period' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate CSV
    const csv = generateCSV(userMetrics);
    
    // Upload to storage
    const fileName = `report-${period}-${Date.now()}.csv`;
    const { data: uploadData, error: uploadError } = await supabase
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
    const { error: reportError } = await supabase
      .from('reports')
      .insert({
        user_id: userId,
        period,
        report_url: publicUrl,
      });

    if (reportError) throw reportError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        reportUrl: publicUrl,
        fileName,
        recordCount: userMetrics.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Report generation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate report' }),
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
