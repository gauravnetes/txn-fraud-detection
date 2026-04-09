import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Transaction {
  id: string;
  amount: number;
  timestamp: number;
  user_id: string;
  recipient: string;
  note: string;
  device_id: string;
  location: string;
  velocity: number;
  is_new_device: boolean;
  method: 'UPI' | 'Bank Transfer' | 'Card';
  risk_score: number;
  status: 'allow' | 'flag' | 'block';
  reasons: string[];
  // Backend-enriched fields
  backend_action?: string;           // APPROVE | SOFT_CHALLENGE | HARD_BLOCK
  network_risk?: string;             // from pre-flight check
  hops_to_fraud?: number;            // from pre-flight check
  recipient_status?: string;         // CLEAN | SUSPICIOUS | UNKNOWN
}

interface FraudStore {
  transactions: Transaction[];
  alerts: Transaction[];
  riskThreshold: number;
  addTransaction: (tx: Transaction) => void;
  setRiskThreshold: (threshold: number) => void;
  getStats: () => {
    total: number;
    flagged: number;
    blocked: number;
    avgRisk: number;
  };
}

export const useFraudStore = create<FraudStore>()(
  persist(
    (set, get) => ({
      transactions: [],
      alerts: [],
      riskThreshold: 70,
      addTransaction: (tx) => {
        set((state) => {
          const newTransactions = [tx, ...state.transactions];
          const newAlerts = tx.status !== 'allow' ? [tx, ...state.alerts] : state.alerts;
          return {
            transactions: newTransactions.slice(0, 100), // Keep last 100
            alerts: newAlerts.slice(0, 50),
          };
        });
      },
      setRiskThreshold: (threshold) => set({ riskThreshold: threshold }),
      getStats: () => {
        const { transactions } = get();
        if (transactions.length === 0) return { total: 0, flagged: 0, blocked: 0, avgRisk: 0 };
        
        const flagged = transactions.filter(t => t.status === 'flag').length;
        const blocked = transactions.filter(t => t.status === 'block').length;
        const avgRisk = transactions.reduce((acc, t) => acc + t.risk_score, 0) / transactions.length;
        
        return {
          total: transactions.length,
          flagged,
          blocked,
          avgRisk: Math.round(avgRisk),
        };
      },
    }),
    {
      name: 'txn-verify-storage',
    }
  )
);
