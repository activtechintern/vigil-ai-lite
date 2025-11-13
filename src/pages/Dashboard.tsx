import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Dashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch monitors count
  const { data: monitors } = useQuery({
    queryKey: ["monitors-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monitors")
        .select("id, status");
      if (error) throw error;
      return data;
    },
  });

  // Fetch active alerts count
  const { data: alerts } = useQuery({
    queryKey: ["alerts-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  // Fetch metrics for uptime and response time
  const { data: metrics } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("metrics")
        .select("status, response_time, checked_at")
        .gte("checked_at", thirtyDaysAgo.toISOString())
        .order("checked_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monitors' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["monitors-count"] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["alerts-count"] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'metrics' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const totalMonitors = monitors?.length || 0;
  const activeAlerts = alerts?.length || 0;

  // Calculate uptime percentage (last 30 days)
  const uptimePercent = metrics && metrics.length > 0
    ? ((metrics.filter(m => m.status === "up").length / metrics.length) * 100).toFixed(1)
    : "0.0";

  // Calculate average response time (last 24h)
  const last24h = metrics?.filter(m => {
    const checkTime = new Date(m.checked_at);
    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    return checkTime >= dayAgo;
  }) || [];

  const avgResponseTime = last24h.length > 0
    ? Math.round(
        last24h
          .filter(m => m.response_time)
          .reduce((sum, m) => sum + (m.response_time || 0), 0) / 
        last24h.filter(m => m.response_time).length
      )
    : 0;

  // Prepare chart data (hourly averages for last 24h)
  const chartData = last24h.length > 0
    ? Object.values(
        last24h.reduce((acc: any, m) => {
          const hour = format(new Date(m.checked_at), "HH:00");
          if (!acc[hour]) {
            acc[hour] = { time: hour, total: 0, count: 0 };
          }
          if (m.response_time) {
            acc[hour].total += m.response_time;
            acc[hour].count += 1;
          }
          return acc;
        }, {})
      ).map((item: any) => ({
        time: item.time,
        responseTime: Math.round(item.total / item.count),
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your monitored services and infrastructure
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Monitors"
          value={totalMonitors}
          icon={<Activity className="h-4 w-4" />}
          description="Active endpoints"
        />
        <MetricCard
          title="Uptime"
          value={`${uptimePercent}%`}
          icon={<TrendingUp className="h-4 w-4" />}
          description="Last 24 hours"
          positive
        />
        <MetricCard
          title="Active Alerts"
          value={activeAlerts}
          icon={<AlertTriangle className="h-4 w-4" />}
          description="Requires attention"
          alert={activeAlerts > 0}
        />
        <MetricCard
          title="Avg Response"
          value={`${avgResponseTime}ms`}
          icon={<Clock className="h-4 w-4" />}
          description="Last 24 hours"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Response Time (Last 24 Hours)</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}ms`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line
                  type="monotone"
                  dataKey="responseTime"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No data available yet. Add monitors to start tracking performance.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  icon,
  description,
  positive,
  alert,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  positive?: boolean;
  alert?: boolean;
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div
          className={`rounded-lg p-2 ${
            alert
              ? "bg-destructive/10 text-destructive"
              : positive
              ? "bg-success/10 text-success"
              : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
