import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const Dashboard = () => {
  const { data: monitors } = useQuery({
    queryKey: ["monitors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("monitors").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: alerts } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const totalMonitors = monitors?.length || 0;
  const activeAlerts = alerts?.length || 0;
  const upMonitors = monitors?.filter((m) => m.status === "up").length || 0;
  const uptimePercent = totalMonitors > 0 ? ((upMonitors / totalMonitors) * 100).toFixed(1) : "0.0";

  // Mock data for the chart
  const chartData = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    responseTime: Math.floor(Math.random() * 200) + 100,
  }));

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
          value="142ms"
          icon={<Clock className="h-4 w-4" />}
          description="Across all monitors"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Response Time (Last 24 Hours)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
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
                  borderRadius: "var(--radius)",
                }}
              />
              <Line
                type="monotone"
                dataKey="responseTime"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
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
