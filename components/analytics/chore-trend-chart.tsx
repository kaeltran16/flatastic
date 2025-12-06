'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import { TrendDataPoint } from '@/hooks/use-analytics';
import { CheckSquare, TrendingDown, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface ChoreTrendChartProps {
  data: TrendDataPoint[];
}

export function ChoreTrendChart({ data }: ChoreTrendChartProps) {
  const chartConfig: ChartConfig = {
    completed: {
      label: 'Completed',
      color: 'var(--chart-2)',
    },
    pending: {
      label: 'Pending',
      color: 'var(--chart-5)',
    },
  };

  const totalCompleted = data.reduce((sum, item) => sum + item.completed, 0);
  const totalPending = data.reduce((sum, item) => sum + item.pending, 0);
  const totalChores = totalCompleted + totalPending;
  const completionRate =
    totalChores > 0 ? Math.round((totalCompleted / totalChores) * 100) : 0;

  // Compare recent vs previous performance
  const recentCompleted = data.slice(-3).reduce((sum, d) => sum + d.completed, 0);
  const previousCompleted = data.slice(0, 3).reduce((sum, d) => sum + d.completed, 0);
  const isImproving = recentCompleted > previousCompleted;

  const hasData = data.some((d) => d.completed > 0 || d.pending > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-muted-foreground" />
            Chore Activity
          </CardTitle>
          <CardDescription>Last 6 months</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No chore activity to display yet!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all hover:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-muted-foreground" />
          Chore Activity
        </CardTitle>
        <CardDescription>
          Monthly completed vs pending chores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart
            accessibilityLayer
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient
                id="completedGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--chart-2)"
                  stopOpacity={1}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-2)"
                  stopOpacity={0.6}
                />
              </linearGradient>
              <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-5)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-5)"
                  stopOpacity={0.4}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-muted"
            />
            <XAxis
              dataKey="monthShort"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
              width={30}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
              content={
                <ChartTooltipContent
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.month;
                    }
                    return label;
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="completed"
              fill="url(#completedGradient)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="pending"
              fill="url(#pendingGradient)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 border-t pt-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          {isImproving ? (
            <>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span>Productivity is improving!</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-4 w-4 text-amber-500" />
              <span>Productivity has dropped</span>
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Overall completion rate:{' '}
          <span className="font-medium text-foreground">{completionRate}%</span>{' '}
          ({totalCompleted} of {totalChores} chores)
        </p>
      </CardFooter>
    </Card>
  );
}
