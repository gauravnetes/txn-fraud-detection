import { useFraudStore, Transaction } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { 
  ShieldCheck, AlertTriangle, ShieldX, Activity, 
  ArrowUpRight, Clock, MapPin, Smartphone, Info
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const { transactions, alerts, getStats, riskThreshold, setRiskThreshold } = useFraudStore();
  const stats = getStats();
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Prepare chart data
  const timeData = transactions.slice(0, 20).reverse().map(t => ({
    time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    risk: t.risk_score,
    amount: t.amount / 1000,
  }));

  const statusData = [
    { name: 'Approved', value: transactions.filter(t => t.status === 'allow').length, color: '#10B981' },
    { name: 'Flagged', value: transactions.filter(t => t.status === 'flag').length, color: '#F59E0B' },
    { name: 'Blocked', value: transactions.filter(t => t.status === 'block').length, color: '#EF4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen pt-32 pb-12 px-6 bg-muted">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="heading-massive text-5xl md:text-6xl mb-2">Fraud <span className="text-primary">Analytics</span></h1>
            <p className="text-muted-foreground text-lg">Real-time monitoring and threat intelligence dashboard.</p>
          </div>
          <div className="flex items-center gap-6 bg-white p-4 px-6 rounded-2xl shadow-soft border border-border/50">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Risk Threshold</span>
              <span className="text-xl font-black text-secondary">{riskThreshold}%</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="90" 
              value={riskThreshold} 
              onChange={(e) => setRiskThreshold(parseInt(e.target.value))}
              className="w-32 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:scale-[1.02] transition-transform">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <Activity className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Tx</p>
                <p className="text-3xl font-black tracking-tighter">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:scale-[1.02] transition-transform">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Flagged</p>
                <p className="text-3xl font-black tracking-tighter text-amber-600">{stats.flagged}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:scale-[1.02] transition-transform">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <ShieldX className="w-7 h-7 text-red-500" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Blocked</p>
                <p className="text-3xl font-black tracking-tighter text-red-600">{stats.blocked}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:scale-[1.02] transition-transform">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-secondary" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Avg. Risk</p>
                <p className="text-3xl font-black tracking-tighter text-secondary">{stats.avgRisk}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 shadow-float">
            <CardHeader className="pb-8">
              <CardTitle className="text-xl font-black tracking-tight">Transaction Risk Trend</CardTitle>
              <CardDescription className="text-muted-foreground">Risk scores of the last 20 transactions.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#64748B" 
                    fontSize={11} 
                    fontWeight={600}
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#64748B" 
                    fontSize={11} 
                    fontWeight={600}
                    tickLine={false} 
                    axisLine={false} 
                    domain={[0, 100]}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#064E3B', fontWeight: 700 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="risk" 
                    stroke="#A3E635" 
                    strokeWidth={4} 
                    dot={{ fill: '#064E3B', strokeWidth: 2, r: 4, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#A3E635' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-float">
            <CardHeader className="pb-8">
              <CardTitle className="text-xl font-black tracking-tight">Status Distribution</CardTitle>
              <CardDescription className="text-muted-foreground">Legit vs Fraud ratio.</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground/30 text-sm font-bold uppercase tracking-widest">No data available</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="all" className="space-y-8">
          <div className="flex justify-between items-center">
            <TabsList className="bg-white border border-border/50 p-1 rounded-full shadow-soft">
              <TabsTrigger value="all" className="rounded-full px-8 py-2 data-[state=active]:bg-secondary data-[state=active]:text-white transition-all">All Transactions</TabsTrigger>
              <TabsTrigger value="alerts" className="rounded-full px-8 py-2 data-[state=active]:bg-secondary data-[state=active]:text-white transition-all">High Risk Alerts</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all">
            <Card className="shadow-float border-none overflow-hidden rounded-3xl">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs font-bold uppercase tracking-widest text-muted-foreground py-6 pl-8">Time</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-widest text-muted-foreground py-6">Amount</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-widest text-muted-foreground py-6">Method</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-widest text-muted-foreground py-6">Risk Score</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-widest text-muted-foreground py-6">Status</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-widest text-muted-foreground py-6 pr-8">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length > 0 ? transactions.map((tx) => (
                    <TableRow key={tx.id} className="border-border/30 hover:bg-muted/30 transition-colors group">
                      <TableCell className="font-mono text-xs text-muted-foreground pl-8">
                        {new Date(tx.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="font-black text-base">₹{tx.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-sm font-medium text-muted-foreground">{tx.method}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-2 bg-muted rounded-full overflow-hidden border border-border/30 p-0.5">
                            <div 
                              className={cn(
                                "h-full rounded-full",
                                tx.risk_score < 30 ? "bg-green-500" : 
                                tx.risk_score < 70 ? "bg-amber-500" : "bg-red-500"
                              )}
                              style={{ width: `${tx.risk_score}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-muted-foreground">{tx.risk_score}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "px-3 py-1 text-[10px] font-bold rounded-full border-none",
                          tx.status === 'allow' ? "bg-green-100 text-green-700" : 
                          tx.status === 'flag' ? "bg-amber-100 text-amber-700" : 
                          "bg-red-100 text-red-700"
                        )}>
                          {tx.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <button 
                          onClick={() => setSelectedTx(tx)}
                          className="p-3 hover:bg-muted rounded-full transition-all opacity-0 group-hover:opacity-100 text-secondary"
                        >
                          <Info className="w-5 h-5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-muted-foreground/30 font-bold uppercase tracking-widest">
                        No transactions recorded yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alerts.length > 0 ? alerts.map((alert) => (
                <Card key={alert.id} className="shadow-soft hover:shadow-float transition-all cursor-pointer group border-border/50" onClick={() => setSelectedTx(alert)}>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          alert.status === 'flag' ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                        )}>
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black font-mono text-muted-foreground/60">{alert.id}</span>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground/60">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <CardTitle className="text-2xl font-black tracking-tighter mt-4">₹{alert.amount.toLocaleString()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-muted-foreground line-clamp-2 leading-relaxed">{alert.reasons[0]}</p>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-[10px] font-bold bg-muted text-muted-foreground border-none px-3">{alert.location}</Badge>
                        <Badge variant="secondary" className="text-[10px] font-bold bg-muted text-muted-foreground border-none px-3">{alert.method}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-full h-48 flex items-center justify-center text-muted-foreground/30 font-bold uppercase tracking-widest rounded-3xl border-2 border-dashed border-border/50 bg-white/50">
                  No high-risk alerts at this time.
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="bg-white border-none text-foreground max-w-2xl rounded-3xl shadow-float p-0 overflow-hidden">
          <div className={cn(
            "h-2 w-full",
            selectedTx?.status === 'allow' ? "bg-green-500" : 
            selectedTx?.status === 'flag' ? "bg-amber-500" : "bg-red-500"
          )} />
          
          <div className="p-8">
            <DialogHeader className="mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-3xl font-black tracking-tighter flex items-center gap-4">
                    Transaction Detail
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground text-base mt-1">
                    Full metadata and risk breakdown for <span className="font-mono text-sm font-bold">{selectedTx?.id}</span>
                  </DialogDescription>
                </div>
                {selectedTx && (
                  <Badge className={cn(
                    "px-4 py-1.5 text-xs font-bold rounded-full border-none",
                    selectedTx.status === 'allow' ? "bg-green-100 text-green-700" : 
                    selectedTx.status === 'flag' ? "bg-amber-100 text-amber-700" : 
                    "bg-red-100 text-red-700"
                  )}>
                    {selectedTx.status.toUpperCase()}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            {selectedTx && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Metadata</h4>
                    <div className="grid grid-cols-1 gap-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <Clock className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Timestamp</span>
                          <span className="text-sm font-bold">{new Date(selectedTx.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Location</span>
                          <span className="text-sm font-bold">{selectedTx.location}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <Smartphone className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Device</span>
                          <span className="text-sm font-bold">{selectedTx.device_id} {selectedTx.is_new_device && "(New)"}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                          <ArrowUpRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Method</span>
                          <span className="text-sm font-bold">{selectedTx.method}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Entities</h4>
                    <div className="p-4 rounded-2xl bg-muted/50 border border-border/50 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">User ID</span>
                        <span className="font-mono font-bold">{selectedTx.user_id}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground font-medium">Recipient</span>
                        <span className="font-mono font-bold">{selectedTx.recipient}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Risk Analysis</h4>
                    <div className="p-6 rounded-2xl bg-muted/50 border border-border/50 space-y-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-bold uppercase text-muted-foreground">Risk Score</span>
                          <span className="text-2xl font-black text-secondary">{selectedTx.risk_score}<span className="text-xs text-muted-foreground/50">/100</span></span>
                        </div>
                        <div className="h-2 w-full bg-white rounded-full overflow-hidden p-0.5">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              selectedTx.risk_score < 30 ? "bg-green-500" : 
                              selectedTx.risk_score < 70 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${selectedTx.risk_score}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Decision Factors:</span>
                        <div className="space-y-2">
                          {selectedTx.reasons.map((reason, i) => (
                            <div key={i} className="text-xs font-medium text-muted-foreground flex gap-3 items-center p-2 rounded-lg bg-white/50 border border-border/20">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              {reason}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl border border-border/50 bg-secondary text-white shadow-soft relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-12 -mt-12" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-3">Note:</p>
                    <p className="text-sm font-medium leading-relaxed italic">"{selectedTx.note || "No note provided"}"</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
