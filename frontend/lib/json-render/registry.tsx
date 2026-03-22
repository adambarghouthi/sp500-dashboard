'use client'
import { defineRegistry } from '@json-render/react'
import { shadcnComponents } from '@json-render/shadcn'
import { catalog } from './catalog'
import {
  LineChart as RechartsLine,
  BarChart as RechartsBar,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const { registry } = defineRegistry(catalog, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: ({
    ...shadcnComponents,
    LineChart: ({ props }: { props: { title: string; data: Record<string, string | number>[]; lines: { key: string; color?: string; name?: string }[]; xKey?: string } }) => (
      <div className="w-full">
        <h3 className="font-syne text-sm font-semibold text-amber mb-3">{props.title}</h3>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsLine data={props.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey={props.xKey || 'date'}
              tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'DM Mono' }}
            />
            <YAxis tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'DM Mono' }} />
            <Tooltip
              contentStyle={{
                background: '#0F0F11',
                border: '1px solid rgba(240,180,41,0.3)',
                borderRadius: 6,
                fontFamily: 'DM Mono',
                fontSize: 12,
              }}
            />
            <Legend />
            {(props.lines || []).map((line, i) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name || line.key}
                stroke={line.color || ['#F0B429', '#16A34A', '#DC2626', '#60A5FA'][i % 4]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </RechartsLine>
        </ResponsiveContainer>
      </div>
    ),
    BarChart: ({ props }: { props: { title: string; data: { label: string; value: number }[]; color?: string; horizontal?: boolean } }) => {
      const colors = ['#F0B429', '#16A34A', '#DC2626', '#60A5FA', '#A78BFA']
      return (
        <div className="w-full">
          <h3 className="font-syne text-sm font-semibold text-amber mb-3">{props.title}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBar
              data={props.data}
              layout={props.horizontal ? 'vertical' : 'horizontal'}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              {props.horizontal ? (
                <>
                  <XAxis type="number" tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'DM Mono' }} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'DM Mono' }}
                    width={80}
                  />
                </>
              ) : (
                <>
                  <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'DM Mono' }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 11, fontFamily: 'DM Mono' }} />
                </>
              )}
              <Tooltip
                contentStyle={{
                  background: '#0F0F11',
                  border: '1px solid rgba(240,180,41,0.3)',
                  borderRadius: 6,
                  fontFamily: 'DM Mono',
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {props.data?.map((_: unknown, index: number) => (
                  <Cell key={`cell-${index}`} fill={props.color || colors[index % colors.length]} />
                ))}
              </Bar>
            </RechartsBar>
          </ResponsiveContainer>
        </div>
      )
    },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any),
  actions: {},
})

export { registry }
