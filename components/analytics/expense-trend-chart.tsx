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
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import { ExpenseTrendDataPoint } from '@/hooks/use-analytics';
import { LineChart as LineChartIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface ExpenseTrendChartProps {
  data: ExpenseTrendDataPoint[];
}

export function ExpenseTrendChart({ data }: ExpenseTrendChartProps) {
  const chartConfig: ChartConfig = {
    amount: {
      label: 'Expenses',
      color: 'var(--chart-1)',
    },
  };

  const totalExpenses = data.reduce((sum, item) => sum + item.amount, 0);
  const avgExpenses = data.length > 0 ? totalExpenses / data.length : 0;

  // Calculate trend (comparing last 3 months to previous 3 months)
  const recent = data.slice(-3).reduce((sum, d) => sum + d.amount, 0);
  const previous = data.slice(0, 3).reduce((sum, d) => sum + d.amount, 0);
  const trendDirection = recent > previous ? 'up' : recent < previous ? 'down' : 'flat';

  const hasData = data.some((d) => d.amount > 0);

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChartIcon className="h-5 w-5 text-muted-foreground" />
            Expense Trends
          </CardTitle>
          <CardDescription>Last 6 months</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            No expense data to show trends yet!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all hover:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChartIcon className="h-5 w-5 text-muted-foreground" />
          Expense Trends
        </CardTitle>
        <CardDescription>
          Track your spending over the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.05}
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
              tickFormatter={(value) => `$${value}`}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
              width={60}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: '5 5' }}
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.month;
                    }
                    return label;
                  }}
                  formatter={(value) => (
                    <span className="font-medium">
                      ${Number(value).toLocaleString()}
                    </span>
                  )}
                />
              }
            />
            <Area
              dataKey="amount"
              type="natural"
              fill="url(#expenseGradient)"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{
                fill: 'var(--chart-1)',
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{
                r: 6,
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 border-t pt-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          {trendDirection === 'up' && (
            <>
              <TrendingUp className="h-4 w-4 text-red-500" />
              <span>Spending is trending up</span>
            </>
          )}
          {trendDirection === 'down' && (
            <>
              <TrendingDown className="h-4 w-4 text-emerald-500" />
              <span>Spending is trending down</span>
            </>
          )}
          {trendDirection === 'flat' && (
            <span className="text-muted-foreground">Spending is stable</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Average: ${Math.round(avgExpenses).toLocaleString()}/month
        </p>
      </CardFooter>
    </Card>
  );
}
