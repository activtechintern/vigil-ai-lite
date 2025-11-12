import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { reportSchema } from "@/lib/validation";
import { format } from "date-fns";

const Reports = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const generateReport = useMutation({
    mutationFn: async ({ period, days }: { period: string; days: number }) => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Validate dates
      const validation = reportSchema.safeParse({
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const { data, error } = await supabase.functions.invoke("generate-report", {
        body: {
          period,
          userId: user?.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({
        title: "Report Generated",
        description: `Report created successfully with ${data.recordCount} records`,
      });
      // Auto-download
      window.open(data.reportUrl, '_blank');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Generate and download uptime reports
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ReportCard
          title="Daily Report"
          description="Last 24 hours uptime summary"
          period="daily"
          days={1}
          onGenerate={(period, days) => generateReport.mutate({ period, days })}
          isGenerating={generateReport.isPending}
        />
        <ReportCard
          title="Weekly Report"
          description="Last 7 days uptime summary"
          period="weekly"
          days={7}
          onGenerate={(period, days) => generateReport.mutate({ period, days })}
          isGenerating={generateReport.isPending}
        />
        <ReportCard
          title="Monthly Report"
          description="Last 30 days uptime summary"
          period="monthly"
          days={30}
          onGenerate={(period, days) => generateReport.mutate({ period, days })}
          isGenerating={generateReport.isPending}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading reports...
            </div>
          ) : reports && reports.length > 0 ? (
            <div className="space-y-2">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium capitalize">{report.period} Report</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(report.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(report.report_url, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No reports generated yet. Click generate on any report type above to create your first report.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const ReportCard = ({
  title,
  description,
  period,
  days,
  onGenerate,
  isGenerating,
}: {
  title: string;
  description: string;
  period: string;
  days: number;
  onGenerate: (period: string, days: number) => void;
  isGenerating: boolean;
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => onGenerate(period, days)}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default Reports;
