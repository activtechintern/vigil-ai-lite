import { Button } from "@/components/ui/button";
import { Activity, BarChart3, Bell, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-transparent" />
        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl">
              Monitor Your Site <span className="text-accent">24×7</span>
            </h1>
            <p className="mb-8 text-xl text-muted-foreground md:text-2xl">
              AI-powered infrastructure monitoring that keeps your services running smoothly.
              Get instant alerts and intelligent insights.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="text-lg">
                <Link to="/auth">Get Started Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg">
                <Link to="/auth">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Activity className="h-8 w-8" />}
            title="Real-Time Monitoring"
            description="Track uptime and performance metrics in real-time with instant updates."
          />
          <FeatureCard
            icon={<Bell className="h-8 w-8" />}
            title="Smart Alerts"
            description="Get notified instantly when issues are detected, before your users notice."
          />
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8" />}
            title="Detailed Reports"
            description="Generate comprehensive uptime reports with beautiful visualizations."
          />
          <FeatureCard
            icon={<Shield className="h-8 w-8" />}
            title="Role-Based Access"
            description="Manage your team with granular permissions and role-based access control."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="rounded-2xl bg-gradient-to-r from-primary to-accent p-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">
            Ready to Monitor Your Infrastructure?
          </h2>
          <p className="mb-8 text-lg text-primary-foreground/90">
            Join teams who trust Site24x7-Lite to keep their services running.
          </p>
          <Button asChild size="lg" variant="secondary" className="text-lg">
            <Link to="/auth">Start Monitoring Now</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <div className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-accent hover:shadow-lg hover:shadow-accent/10">
      <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3 text-primary transition-colors group-hover:bg-accent/10 group-hover:text-accent">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default Landing;
