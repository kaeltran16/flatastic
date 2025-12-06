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
  ChartTooltipContent
} from '@/components/ui/chart';
import { Minus, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';

interface ChoreChartProps {
  data: {
    name: string;
    completed: number;
    fill: string;
  }[];
  comparison?: number;
}

export function ChoreChart({ data, comparison = 0 }: ChoreChartProps) {
  const totalCompleted = data.reduce((sum, item) => sum + item.completed, 0);
  const topPerformer = data.reduce(
    (prev, current) => (prev.completed > current.completed ? prev : current),
    data[0]
  );

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
      completed: {
        label: 'Completed Chores',
      },
    } as ChartConfig
  );

  const TrendIcon =
    comparison > 0 ? TrendingUp : comparison < 0 ? TrendingDown : Minus;
  const trendColor =
    comparison > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : comparison < 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground';

  if (data.length === 0 || totalCompleted === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Chore Completion by Member
          </CardTitle>
          <CardDescription>No completed chores yet</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Complete some chores to see statistics here!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all hover:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          Chore Completion by Member
        </CardTitle>
        <CardDescription>
          Who&apos;s pulling their weight around here?
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart accessibilityLayer data={data} layout="vertical">
            <defs>
              {data.map((entry, index) => (
                <linearGradient
                  key={`gradient-${index}`}
                  id={`choreGradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop
                    offset="0%"
                    stopColor={`var(--chart-${(index % 8) + 1})`}
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="100%"
                    stopColor={`var(--chart-${(index % 8) + 1})`}
                    stopOpacity={1}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              horizontal={true}
              vertical={false}
              strokeDasharray="3 3"
              className="stroke-muted"
            />
            <XAxis type="number" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={80}
              tick={{ fontSize: 12 }}
            />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value) => (
                    <span className="font-medium">
                      {value} chore{Number(value) !== 1 ? 's' : ''} completed
                    </span>
                  )}
                />
              }
            />
            <Bar dataKey="completed" radius={[0, 6, 6, 0]} maxBarSize={40}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#choreGradient-${index})`}
                  className="transition-opacity hover:opacity-80"
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm border-t pt-4">
        <div className="flex items-center gap-2 font-medium">
          <span>
            {totalCompleted} total chore{totalCompleted !== 1 ? 's' : ''}{' '}
            completed
          </span>
          {comparison !== 0 && (
            <span className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              {comparison > 0 ? '+' : ''}
              {comparison}% vs last month
            </span>
          )}
        </div>
        {topPerformer && topPerformer.completed > 0 && (
          <p className="text-muted-foreground">
            🏆 Top performer:{' '}
            <span className="font-medium text-foreground">
              {topPerformer.name}
            </span>{' '}
            with {topPerformer.completed} chore
            {topPerformer.completed !== 1 ? 's' : ''}
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
