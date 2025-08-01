import { MetricCard } from "@/app/_components/common/MetricCard"
import { Clock, DollarSign, Users, FileText } from "lucide-react";

export const KPISection = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    <MetricCard
      title="Total Active Contracts"
      value="486"
      icon={FileText}
      trend={12}
      changeType="positive"
      description="Currently active contracts"
    />
    <MetricCard
      title="Total Contract Value"
      value="$2.4M"
      icon={DollarSign}
      trend={8}
      changeType="positive"
      description="Aggregate contract value"
    />
    <MetricCard
      title="Average Completion Time"
      value="4.2 days"
      icon={Clock}
      trend={-15}
      changeType="negative"
      description="Time to signature completion"
    />
    <MetricCard
      title="Active Users"
      value="234"
      icon={Users}
      trend={5}
      changeType="positive"
      description="Users engaged this month"
    />
  </div>
);
