'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import { Cell, Pie, PieChart } from 'recharts';

interface ExpenseChartProps {
  data: {
    category: string;
    amount: number;
    fill: string;
  }[];
}

export function ExpenseChart({ data }: ExpenseChartProps) {
  const chartConfig = {
    amount: {
      label: 'Amount',
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="category"
              innerRadius={60}
              strokeWidth={5}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
