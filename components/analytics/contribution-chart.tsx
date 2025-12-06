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
import { DollarSign, Trophy } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';

interface ContributionChartProps {
  data: {
    name: string;
    amount: number;
    fill: string;
  }[];
}

export function ContributionChart({ data }: ContributionChartProps) {
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
  const sortedData = [...data].sort((a, b) => b.amount - a.amount);
  const topContributor = sortedData[0];

  // Create dynamic chart config based on data
  const chartConfig: ChartConfig = data.reduce(
    (config, item, index) => ({
      ...config,
      [item.name]: {
        label: item.name,
        color: `var(--chart-${(index % 8) + 1})`,
      },
    }),
    {
      amount: {
        label: 'Amount Paid',
      },
    } as ChartConfig
  );

  if (data.length === 0 || totalAmount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            Financial Contributions
          </CardTitle>
          <CardDescription>No contributions recorded yet</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Add some expenses to see who&apos;s contributing!
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate each person's share percentage
  const dataWithPercentage = data.map((item) => ({
    ...item,
    percentage: totalAmount > 0 ? Math.round((item.amount / totalAmount) * 100) : 0,
  }));

  return (
    <Card className="transition-all hover:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          Financial Contributions
        </CardTitle>
        <CardDescription>
          How much has each member contributed?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart accessibilityLayer data={dataWithPercentage}>
            <defs>
              {data.map((entry, index) => (
                <linearGradient
                  key={`gradient-${index}`}
                  id={`contributionGradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={`var(--chart-${(index % 8) + 1})`}
                    stopOpacity={1}
                  />
                  <stop
                    offset="100%"
                    stopColor={`var(--chart-${(index % 8) + 1})`}
                    stopOpacity={0.6}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              className="stroke-muted"
            />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={(value) => `$${value}`}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name, props) => (
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        ${Number(value).toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {props.payload.percentage}% of total
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="amount" radius={[8, 8, 0, 0]} maxBarSize={60}>
              {dataWithPercentage.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#contributionGradient-${index})`}
                  className="transition-opacity hover:opacity-80"
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm border-t pt-4">
        <div className="flex items-center gap-2 font-medium">
          Total contributions:{' '}
          <span className="text-lg">${totalAmount.toLocaleString()}</span>
        </div>
        {topContributor && topContributor.amount > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>
              <span className="font-medium text-foreground">
                {topContributor.name}
              </span>{' '}
              is the top contributor with $
              {topContributor.amount.toLocaleString()} (
              {totalAmount > 0
                ? Math.round((topContributor.amount / totalAmount) * 100)
                : 0}
              %)
            </span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
