'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface ContributionChartProps {
  data: {
    name: string;
    amount: number;
    fill: string;
  }[];
}

export function ContributionChart({ data }: ContributionChartProps) {
  const chartConfig = {
    amount: {
      label: 'Amount Paid',
      color: 'var(--chart-2)',
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Contributions</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => `$${value}`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
