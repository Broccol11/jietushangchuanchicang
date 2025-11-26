import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { HistoryPoint, Asset, AssetCategory } from '../types';

// Gold palette
const COLORS = ['#D4A532', '#AA8428', '#80631E', '#E6CB7D', '#554214', '#F9F1D8'];

// Chinese Mapping for Charts
const CategoryMap: Record<string, string> = {
  'Stock': '股票',
  'Fund': '基金',
  'Bond': '债券',
  'Crypto': '数字货币',
  'Cash': '现金',
  'Other': '其他'
};

interface TrendChartProps {
  history: HistoryPoint[];
  type: 'netWorth' | 'return';
}

export const TrendChart: React.FC<TrendChartProps> = ({ history, type }) => {
  const dataKey = type === 'netWorth' ? 'totalNetWorth' : 'totalReturnRate';
  
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#D4A532" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#D4A532" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#666" 
            tick={{fontSize: 12}} 
            tickFormatter={(value) => new Date(value).toLocaleDateString('zh-CN', {month: '2-digit', day: '2-digit'})}
          />
          <YAxis 
            stroke="#666" 
            tick={{fontSize: 12}}
            tickFormatter={(val) => type === 'netWorth' ? `${(val/10000).toFixed(1)}万` : `${val}%`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#D4A532', color: '#fff' }}
            itemStyle={{ color: '#D4A532' }}
            formatter={(value: number) => [
                type === 'netWorth' ? `¥${value.toLocaleString()}` : `${value.toFixed(2)}%`, 
                type === 'netWorth' ? '总净值' : '收益率'
            ]}
            labelFormatter={(label) => new Date(label).toLocaleDateString('zh-CN', {year: 'numeric', month: 'long', day: 'numeric'})}
          />
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke="#D4A532" 
            fillOpacity={1} 
            fill="url(#colorGold)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

interface AllocationChartProps {
  assets: Asset[];
}

export const AllocationChart: React.FC<AllocationChartProps> = ({ assets }) => {
  // Aggregate by category
  const data = assets.reduce((acc, asset) => {
    // Translate category name for display
    const categoryName = CategoryMap[asset.category] || asset.category;
    
    const existing = acc.find(i => i.name === categoryName);
    if (existing) {
      existing.value += asset.amount;
    } else {
      acc.push({ name: categoryName, value: asset.amount });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
            ))}
          </Pie>
          <Tooltip 
             contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#D4A532', color: '#fff' }}
             formatter={(value: number) => `¥${value.toLocaleString()}`}
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};