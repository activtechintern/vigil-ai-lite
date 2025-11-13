import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { useEffect } from "react";

const Alerts = () => {
  const queryClient = useQueryClient();
  
  const { data: alerts, isLoading } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select(`
          *,
          monitors:monitor_id (name, url)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription for alerts
  useEffect(() => {
    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["alerts"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-destructive text-destructive-foreground";
      case "acknowledged":
        return "bg-warning text-warning-foreground";
      case "resolved":
        return "bg-success text-success-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
        <p className="text-muted-foreground">
          View and manage downtime alerts and incidents
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading alerts...
          </CardContent>
        </Card>
      ) : alerts && alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className="border-l-4 border-l-destructive">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      {alert.monitors?.name || "Unknown Monitor"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {alert.monitors?.url}
                    </p>
                  </div>
                  <Badge className={getStatusColor(alert.status)}>
                    {alert.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{alert.issue}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>
                    Detected: {new Date(alert.created_at).toLocaleString()}
                  </span>
                  {alert.acknowledged_at && (
                    <span>
                      Acknowledged: {new Date(alert.acknowledged_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              No alerts. All systems operational!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Alerts;
