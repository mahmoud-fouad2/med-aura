"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

export type ActivityPoint = {
  day: string
  newCases: number
  paidPayments: number
  paidAmount: number
}

function fmtDay(d: string): string {
  const dt = new Date(d + "T00:00:00Z")
  return new Intl.DateTimeFormat("ar-SA", {
    day: "numeric",
    month: "short",
  }).format(dt)
}

export function ActivityChart({
  data,
  showFinance,
}: {
  data: ActivityPoint[]
  showFinance: boolean
}) {
  return (
    <div className="h-72 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="grad-cases" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="grad-payments" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis
            dataKey="day"
            tickFormatter={fmtDay}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={30}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 12,
              fontSize: 12,
              fontFamily: "var(--font-body)",
            }}
            labelFormatter={(v) => fmtDay(String(v))}
            formatter={(value, name) => {
              const labels: Record<string, string> = {
                newCases: "حالات جديدة",
                paidPayments: "دفعات ناجحة",
              }
              return [value, labels[name as string] ?? name]
            }}
          />
          <Legend
            verticalAlign="top"
            height={30}
            iconType="circle"
            wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-body)" }}
            formatter={(v) =>
              v === "newCases" ? "حالات جديدة" : v === "paidPayments" ? "دفعات ناجحة" : v
            }
          />
          <Area
            type="monotone"
            dataKey="newCases"
            stroke="hsl(var(--chart-1))"
            strokeWidth={2}
            fill="url(#grad-cases)"
          />
          {showFinance && (
            <Area
              type="monotone"
              dataKey="paidPayments"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              fill="url(#grad-payments)"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
