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
import { Minus, PieChartIcon, TrendingDown, TrendingUp } from 'lucide-react';
import {
    Label,
    PolarAngleAxis,
    RadialBar,
    RadialBarChart,
} from 'recharts';

interface ExpenseChartProps {
  data: {
    category: string;
    amount: number;
    fill: string;
  }[];
  comparison?: number;
}

export function ExpenseChart({ data, comparison = 0 }: ExpenseChartProps) {
  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
  const maxAmount = Math.max(...data.map((d) => d.amount));

  // Create chart config for legend/tooltip
  const chartConfig: ChartConfig = data.reduce(
    (config, item, index) => ({
      ...config,
      [item.category]: {
        label: item.category,
        color: `var(--chart-${(index % 8) + 1})`,
      },
    }),
    {} as ChartConfig
  );

  // Transform data for radial bar chart
  // Each bar needs a percentage value relative to max for proper scaling
  const radialData = data.map((item, index) => ({
    ...item,
    name: item.category,
    value: (item.amount / maxAmount) * 100, // Percentage of max for bar size
    fill: `var(--chart-${(index % 8) + 1})`,
  }));

  const TrendIcon =
    comparison > 0 ? TrendingUp : comparison < 0 ? TrendingDown : Minus;
  const trendColor =
    comparison > 0
      ? 'text-red-600 dark:text-red-400'
      : comparison < 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-muted-foreground';
  const trendText =
    comparison > 0
      ? 'spending more'
      : comparison < 0
        ? 'spending less'
        : 'same spending';

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-muted-foreground" />
            Expenses by Category
          </CardTitle>
          <CardDescription>No expenses recorded yet</CardDescription>
        </CardHeader>
        <CardContent className="flex h-[250px] items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Add some expenses to see the breakdown!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col transition-all hover:shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-muted-foreground" />
          Expenses by Category
        </CardTitle>
        <CardDescription>Where is your money going?</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="flex flex-col lg:flex-row items-center gap-4">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square h-[200px]"
          >
            <RadialBarChart
              data={radialData}
              innerRadius={40}
              outerRadius={90}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                dataKey="value"
                background={{ fill: 'var(--muted)', opacity: 0.3 }}
                cornerRadius={10}
                className="stroke-transparent stroke-2"
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, name, props) => (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{props.payload.category}</span>
                        <span className="text-muted-foreground">
                          ${props.payload.amount.toLocaleString()}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-xl font-bold"
                        >
                          ${totalAmount.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 18}
                          className="fill-muted-foreground text-xs"
                        >
                          Total
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </RadialBarChart>
          </ChartContainer>
          {/* Legend */}
          <div className="flex flex-col gap-2 text-sm">
            {data.slice(0, 5).map((item, index) => (
              <div key={item.category} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{
                    backgroundColor: `var(--chart-${(index % 8) + 1})`,
                  }}
                />
                <span className="text-muted-foreground truncate max-w-[120px]">
                  {item.category}
                </span>
                <span className="font-medium ml-auto">${item.amount.toLocaleString()}</span>
              </div>
            ))}
            {data.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{data.length - 5} more categories
              </span>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <div className="flex items-center gap-2 text-sm">
          {comparison !== 0 ? (
            <>
              <TrendIcon className={`h-4 w-4 ${trendColor}`} />
              <span className={trendColor}>
                {Math.abs(comparison)}% {trendText}
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </>
          ) : (
            <span className="text-muted-foreground">
              {data.length} expense categor{data.length !== 1 ? 'ies' : 'y'}
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
