import React, { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { fetchNetworkGraph } from '@/lib/fraud-engine';
import { Network } from 'lucide-react';

export default function NetworkGraph({ accountId, senderId }: { accountId: string, senderId?: string }) {
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });

  useEffect(() => {
    // Responsive width
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 400
        });
      }
    };
    
    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    
    // Slight delay to ensure DOM is painted
    setTimeout(updateDimensions, 100);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!accountId) return;
    
    const loadData = async () => {
      setLoading(true);
      const data = await fetchNetworkGraph(accountId, senderId);
      setGraphData(data);
      setLoading(false);
    };
    
    loadData();
  }, [accountId, senderId]);

  if (!accountId) return null;

  return (
    <Card className="mt-8 shadow-float border-border/50 overflow-hidden">
      <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Network className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-black tracking-tighter">Transaction Network</CardTitle>
            <CardDescription>Live subgraph around {accountId}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative" ref={containerRef}>
        {loading ? (
          <div className="flex h-[400px] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="flex flex-col h-[400px] items-center justify-center text-muted-foreground">
            <Network className="w-8 h-8 mb-4 opacity-20" />
            <p>No network data found in the graph.</p>
          </div>
        ) : (
          <div className="relative">
            <ForceGraph2D
              width={dimensions.width}
              height={dimensions.height}
              graphData={graphData}
              nodeLabel="id"
              nodeColor={(node: any) => 
                node.id === accountId ? '#3b82f6' : // Blue for target block
                node.group === 2 ? '#ef4444' : // Red for flagged fraud
                '#22c55e' // Green for safe component
              }
              nodeRelSize={6}
              linkColor={() => 'rgba(156, 163, 175, 0.4)'}
              linkWidth={1.5}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
            />
            {/* Legend Overlay */}
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-border shadow-sm text-xs font-bold flex flex-col gap-2 pointer-events-none">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Target Account</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> Flagged Fraud</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div> Clean Node</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
