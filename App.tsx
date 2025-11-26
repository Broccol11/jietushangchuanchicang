import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  List, 
  Upload, 
  BrainCircuit, 
  ArrowRight,
  TrendingUp,
  Wallet
} from './components/IconComponents';
import { TrendChart, AllocationChart } from './components/Charts';
import { Asset, HistoryPoint, AnalysisResponse, ViewState, AssetCategory } from './types';
import { parseHoldingsScreenshot, generateWealthAnalysis, fileToGenerativePart } from './services/geminiService';

// Mock initial history for the demo
const MOCK_HISTORY: HistoryPoint[] = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return {
    date: d.toISOString().split('T')[0],
    totalNetWorth: 100000 + Math.random() * 5000 + (i * 1000),
    totalReturnRate: 2 + Math.random() * 1.5
  };
});

// Category Display Map
const CategoryDisplayMap: Record<string, string> = {
  [AssetCategory.STOCK]: '股票',
  [AssetCategory.FUND]: '基金',
  [AssetCategory.BOND]: '债券',
  [AssetCategory.CRYPTO]: '数字货币',
  [AssetCategory.CASH]: '现金',
  [AssetCategory.OTHER]: '其他'
};

const App: React.FC = () => {
  // --- State ---
  const [view, setView] = useState<ViewState>('dashboard');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>(MOCK_HISTORY);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chartType, setChartType] = useState<'netWorth' | 'return'>('netWorth');

  // --- Effects ---
  useEffect(() => {
    // Load from local storage if available
    const savedAssets = localStorage.getItem('aurum_assets');
    const savedHistory = localStorage.getItem('aurum_history');
    const savedAnalysis = localStorage.getItem('aurum_analysis');
    
    if (savedAssets) setAssets(JSON.parse(savedAssets));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedAnalysis) setAnalysis(JSON.parse(savedAnalysis));
  }, []);

  useEffect(() => {
    // Persist
    localStorage.setItem('aurum_assets', JSON.stringify(assets));
    localStorage.setItem('aurum_history', JSON.stringify(history));
    if (analysis) localStorage.setItem('aurum_analysis', JSON.stringify(analysis));
  }, [assets, history, analysis]);

  // --- Computed ---
  const totalNetWorth = assets.reduce((sum, a) => sum + a.amount, 0);
  const totalReturn = assets.reduce((sum, a) => sum + (a.amount * (a.returnRate / 100)), 0);
  const totalReturnRate = totalNetWorth > 0 ? (totalReturn / totalNetWorth) * 100 : 0;

  // --- Handlers ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64 = await fileToGenerativePart(file);
      const extractedAssets = await parseHoldingsScreenshot(base64);
      
      // Merge logic: Update existing by name, add new
      setAssets(prev => {
        const newAssets = [...prev];
        extractedAssets.forEach(extracted => {
            if(!extracted.name) return;
            const index = newAssets.findIndex(a => a.name === extracted.name);
            if (index >= 0) {
                // Update
                newAssets[index] = { ...newAssets[index], ...extracted, lastUpdated: new Date().toISOString() } as Asset;
            } else {
                // Add new with ID
                newAssets.push({ ...extracted, id: crypto.randomUUID(), lastUpdated: new Date().toISOString() } as Asset;
            }
        });
        return newAssets;
      });

      // Update history for "Today"
      setHistory(prev => {
         const todayStr = new Date().toISOString().split('T')[0];
         // Simple logic: if today exists, overwrite, else append
         const existingTodayIndex = prev.findIndex(h => h.date.startsWith(todayStr));
         const newPoint: HistoryPoint = {
             date: todayStr,
             totalNetWorth: totalNetWorth + (extractedAssets.reduce((s, a) => s + (a.amount || 0), 0)), // Approx for immediate UI feedback
             totalReturnRate: totalReturnRate // This is lagging, but fine for demo
         };

         if (existingTodayIndex >= 0) {
             const copy = [...prev];
             copy[existingTodayIndex] = newPoint;
             return copy;
         } else {
             return [...prev, newPoint];
         }
      });

      alert("截图解析成功，您的持仓已更新。");
    } catch (error) {
      console.error(error);
      alert("截图解析失败，请确保图片清晰并重试。");
    } finally {
      setIsUploading(false);
      // Reset input
      event.target.value = '';
    }
  };

  const handleRunAnalysis = async () => {
    if (assets.length === 0) {
        alert("请先添加资产后再运行分析。");
        return;
    }
    setIsAnalyzing(true);
    try {
      const result = await generateWealthAnalysis(assets);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      alert("AI 分析生成失败，请稍后重试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- Render Helpers ---

  const renderDashboard = () => (
    <div className="space-y-8 animate-fade-in">
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wallet size={80} className="text-gold-500" />
                </div>
                <h3 className="text-gray-400 text-sm font-medium tracking-widest mb-1">总资产净值</h3>
                <div className="text-4xl font-sans text-white font-bold tracking-tight">
                    ¥{totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="mt-2 text-green-400 flex items-center text-sm">
                    <TrendingUp size={16} className="mr-1" />
                    +¥{totalReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })} 今日盈亏
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <TrendingUp size={80} className="text-gold-500" />
                </div>
                <h3 className="text-gray-400 text-sm font-medium tracking-widest mb-1">累计收益率</h3>
                <div className="text-4xl font-sans text-gold-400 font-bold tracking-tight">
                    {totalReturnRate.toFixed(2)}%
                </div>
                <div className="mt-2 text-gray-400 text-sm">
                    加权组合收益
                </div>
            </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Trend Chart */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">财富走势</h3>
                    <div className="flex space-x-2 bg-obsidian-900 rounded-lg p-1 border border-neutral-800">
                        <button 
                            onClick={() => setChartType('netWorth')}
                            className={`px-3 py-1 text-xs rounded-md transition-all ${chartType === 'netWorth' ? 'bg-gold-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            总净值
                        </button>
                        <button 
                             onClick={() => setChartType('return')}
                             className={`px-3 py-1 text-xs rounded-md transition-all ${chartType === 'return' ? 'bg-gold-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            收益率
                        </button>
                    </div>
                </div>
                <TrendChart history={history} type={chartType} />
            </div>

            {/* Asset Allocation */}
            <div className="glass-panel p-6 rounded-2xl flex flex-col">
                <h3 className="text-xl font-bold text-white mb-6">资产配置</h3>
                <div className="flex-grow flex items-center justify-center">
                    <AllocationChart assets={assets} />
                </div>
            </div>
        </div>

        {/* Quick Analysis Preview if available */}
        {analysis && (
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-gold-500">
                <h3 className="text-lg font-bold text-gold-300 mb-2 flex items-center">
                    <BrainCircuit size={20} className="mr-2" />
                    AI 财富洞察
                </h3>
                <p className="text-gray-300 italic">"{analysis.investmentAdvice.substring(0, 80)}..."</p>
                <button onClick={() => setView('holdings')} className="mt-4 text-sm text-gold-400 hover:text-gold-300 flex items-center">
                    查看完整报告 <ArrowRight size={14} className="ml-1" />
                </button>
            </div>
        )}
    </div>
  );

  const renderHoldings = () => (
    <div className="space-y-8 animate-fade-in">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
             <h2 className="text-3xl font-bold text-white">持仓明细</h2>
             <button 
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-gold-600 to-gold-400 text-black font-bold rounded-xl hover:shadow-[0_0_15px_rgba(212,165,50,0.5)] transition-all disabled:opacity-50"
             >
                {isAnalyzing ? (
                    <span className="animate-pulse">智能分析中...</span>
                ) : (
                    <>
                        <BrainCircuit size={20} className="mr-2" /> 生成 AI 财富分析
                    </>
                )}
             </button>
        </div>

        {/* Holdings Table */}
        <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-obsidian-900 text-gray-400 text-xs tracking-wider">
                        <tr>
                            <th className="p-4">资产名称</th>
                            <th className="p-4">类别</th>
                            <th className="p-4 text-right">金额</th>
                            <th className="p-4 text-right">收益率</th>
                            <th className="p-4 text-right">更新时间</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {assets.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    暂无持仓信息，请上传投资 APP 截图。
                                </td>
                            </tr>
                        ) : assets.map((asset) => (
                            <tr key={asset.id} className="hover:bg-neutral-800/50 transition-colors">
                                <td className="p-4 font-medium text-white">{asset.name}</td>
                                <td className="p-4">
                                    <span className="px-2 py-1 rounded text-xs border border-neutral-700 text-gold-200 bg-obsidian-900">
                                        {CategoryDisplayMap[asset.category] || asset.category}
                                    </span>
                                </td>
                                <td className="p-4 text-right font-mono text-gray-200">
                                    {asset.amount.toLocaleString()} <span className="text-xs text-gray-500">{asset.currency}</span>
                                </td>
                                <td className={`p-4 text-right font-mono ${asset.returnRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {asset.returnRate > 0 ? '+' : ''}{asset.returnRate}%
                                </td>
                                <td className="p-4 text-right text-xs text-gray-500">
                                    {new Date(asset.lastUpdated).toLocaleDateString('zh-CN')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* AI Analysis Result Section */}
        {analysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-2xl border-t-2 border-gold-500">
                    <h3 className="text-xl font-bold text-white mb-4">资产配置分析</h3>
                    <p className="text-gray-300 leading-relaxed whitespace-pre-line text-justify">
                        {analysis.assetAllocationAnalysis}
                    </p>
                </div>
                <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-2xl border-t-2 border-blue-500">
                        <h3 className="text-xl font-bold text-white mb-4">投资理财建议</h3>
                        <p className="text-gray-300 leading-relaxed whitespace-pre-line text-justify">
                            {analysis.investmentAdvice}
                        </p>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl border-t-2 border-green-500">
                         <h3 className="text-xl font-bold text-white mb-4">持仓调整建议</h3>
                         <p className="text-gray-300 leading-relaxed whitespace-pre-line text-justify">
                            {analysis.adjustmentSuggestions}
                         </p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-obsidian-950 text-gray-100 font-sans selection:bg-gold-500 selection:text-black">
      {/* Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 glass-panel border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
                <div className="flex items-center">
                    <div className="h-8 w-8 rounded bg-gradient-to-br from-gold-400 to-gold-700 flex items-center justify-center text-black font-bold mr-3">
                        财
                    </div>
                    <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-200 to-gold-500">
                        财富管家
                    </span>
                </div>
                
                <div className="hidden md:block">
                    <div className="ml-10 flex items-baseline space-x-4">
                        <button 
                            onClick={() => setView('dashboard')}
                            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'dashboard' ? 'text-gold-400 bg-white/5' : 'text-gray-300 hover:text-white'}`}
                        >
                            <LayoutDashboard size={16} className="mr-2" /> 资产总览
                        </button>
                        <button 
                             onClick={() => setView('holdings')}
                             className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === 'holdings' ? 'text-gold-400 bg-white/5' : 'text-gray-300 hover:text-white'}`}
                        >
                            <List size={16} className="mr-2" /> 持仓与分析
                        </button>
                    </div>
                </div>

                {/* Upload Button (Sticky CTA) */}
                <div className="relative">
                     <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="nav-upload"
                        disabled={isUploading}
                     />
                     <label 
                        htmlFor="nav-upload"
                        className={`cursor-pointer flex items-center px-4 py-2 border border-gold-600/50 rounded-full text-sm font-medium text-gold-300 hover:bg-gold-600/20 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                     >
                        {isUploading ? (
                             <div className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                        ) : (
                             <Upload size={16} className="mr-2" /> 
                        )}
                        {isUploading ? '处理中...' : '上传截图'}
                     </label>
                </div>
            </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {view === 'dashboard' ? renderDashboard() : renderHoldings()}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 mt-auto bg-obsidian-900 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 text-sm">
            <p>&copy; {new Date().getFullYear()} 财富管家 AI. 尊享智能财富管理.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;