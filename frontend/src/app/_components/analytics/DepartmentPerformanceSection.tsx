import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DynamicChart from "@/app/_components/common/DynamicCharts"

const departmentPerformance = [
  { name: "Legal", department: "Legal", value: 150, efficiency: 92, contracts: 150, savings: 125000 },
  { name: "Sales", department: "Sales", value: 200, efficiency: 88, contracts: 200, savings: 180000 },
  { name: "Procurement", department: "Procurement", value: 180, efficiency: 95, contracts: 180, savings: 150000 },
];

export const DepartmentPerformanceSection = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
    <Card>
      <CardHeader>
        <CardTitle>Department Contract Volume</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <DynamicChart
            type="bar"
            data={departmentPerformance}
            series={[{
              dataKey: "contracts",
              name: "Contracts",
              color: "#60a5fa"
            }] as ChartSeries[]}
            xAxisKey="department"
            height={280}
            showGrid={true}
            showLegend={true}
            showTooltip={true}
          />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Department Savings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <DynamicChart
            type="line"
            data={departmentPerformance}
            series={[{
              dataKey: "savings",
              name: "Savings",
              color: "#4ade80",
              strokeWidth: 2,
              dot: true
            }] as ChartSeries[]}
            xAxisKey="department"
            height={280}
            showGrid={true}
            showLegend={true}
            showTooltip={true}
          />
        </div>
      </CardContent>
    </Card>
  </div>
);