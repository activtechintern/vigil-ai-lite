import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCanManageMonitors } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import { monitorSchema, sanitizeInput } from "@/lib/validation";

const Monitors = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [checkInterval, setCheckInterval] = useState("5");
  const [alertEmail, setAlertEmail] = useState("");
  
  const { toast } = useToast();
  const { user } = useAuth();
  const canManage = useCanManageMonitors();
  const queryClient = useQueryClient();

  const { data: monitors, isLoading } = useQuery({
    queryKey: ["monitors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monitors")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Real-time subscription for monitors
  useEffect(() => {
    const channel = supabase
      .channel('monitors-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monitors' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["monitors"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createMonitor = useMutation({
    mutationFn: async (newMonitor: any) => {
      const { error } = await supabase.from("monitors").insert([newMonitor]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      toast({ title: "Success", description: "Monitor created successfully" });
      setOpen(false);
      setName("");
      setUrl("");
      setCheckInterval("5");
      setAlertEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMonitor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("monitors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      toast({ title: "Success", description: "Monitor deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = monitorSchema.safeParse({
      name,
      url,
      check_interval: parseInt(checkInterval),
      alert_email: alertEmail,
    });

    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    createMonitor.mutate({
      user_id: user?.id,
      name: sanitizeInput(name),
      url: url,
      check_interval: parseInt(checkInterval),
      alert_email: alertEmail || null,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "up":
        return "bg-success text-success-foreground";
      case "down":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-warning text-warning-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitors</h1>
          <p className="text-muted-foreground">
            Manage your monitored endpoints and services
          </p>
        </div>
        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Monitor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Monitor</DialogTitle>
                <DialogDescription>
                  Add a new endpoint to monitor for uptime and performance
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Monitor Name</Label>
                  <Input
                    id="name"
                    placeholder="My Website"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Check Interval (minutes)</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    value={checkInterval}
                    onChange={(e) => setCheckInterval(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Alert Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="alerts@example.com"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Create Monitor
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading monitors...
          </CardContent>
        </Card>
      ) : monitors && monitors.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {monitors.map((monitor) => (
            <Card key={monitor.id} className="group relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{monitor.name}</CardTitle>
                    <Badge className={getStatusColor(monitor.status)}>
                      {monitor.status.toUpperCase()}
                    </Badge>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => deleteMonitor.mutate(monitor.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">URL:</span>
                  <span className="truncate ml-2 font-mono">{monitor.url}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interval:</span>
                  <span>{monitor.check_interval} min</span>
                </div>
                {monitor.last_checked_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Check:</span>
                    <span>{new Date(monitor.last_checked_at).toLocaleTimeString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">
              No monitors yet. {canManage && "Create your first monitor to get started."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Monitors;
