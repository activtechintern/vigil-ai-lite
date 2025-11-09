import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

const Reports = () => {
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
        />
        <ReportCard
          title="Weekly Report"
          description="Last 7 days uptime summary"
          period="weekly"
        />
        <ReportCard
          title="Monthly Report"
          description="Last 30 days uptime summary"
          period="monthly"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No reports generated yet. Click generate on any report type above to create your first report.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const ReportCard = ({
  title,
  description,
  period,
}: {
  title: string;
  description: string;
  period: string;
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
        <Button className="w-full" variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </CardContent>
    </Card>
  );
};

export default Reports;
