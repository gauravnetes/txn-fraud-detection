/**
 * fraud-engine.ts — Real backend integration for tx.verify()
 * 
 * Calls the Go Gateway API which orchestrates:
 *   Layer 1 (ML Engine) → Layer 2 (Graph Engine) → Layer 3 (Reasoning Engine)
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface BackendVerifyResponse {
  tx_id: string;
  action: 'APPROVE' | 'SOFT_CHALLENGE' | 'HARD_BLOCK';
  composite_score: number;
  reason: string;
}

export interface RecipientCheckResponse {
  account: string;
  status: 'CLEAN' | 'SUSPICIOUS' | 'UNKNOWN';
  network_risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  hops_to_fraud: number;
}

export interface FraudResult {
  risk_score: number;
  status: 'allow' | 'flag' | 'block';
  reasons: string[];
  backend_action?: string;
}

// ─── Backend Action → Frontend Status Mapping ────────────────────────

function mapActionToStatus(action: string): 'allow' | 'flag' | 'block' {
  switch (action) {
    case 'APPROVE': return 'allow';
    case 'SOFT_CHALLENGE': return 'flag';
    case 'HARD_BLOCK': return 'block';
    default: return 'flag';
  }
}

// ─── Main Verify Function (Calls Real Backend) ──────────────────────

export const verifyTransaction = async (tx: {
  tx_id: string;
  user_id: string;
  amount: number;
  timestamp: string;
  device_id: string;
  ip_address: string;
  location: string;
  target_account: string;
}): Promise<FraudResult> => {
  try {
    const response = await fetch('/api/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data: BackendVerifyResponse = await response.json();

    // Parse the reason string into an array of reasons
    const reasons = data.reason
      .replace('[Rule Engine] ', '')
      .split('; ')
      .filter(r => r.length > 0)
      .map(r => r.replace(/\.$/, ''));

    return {
      risk_score: Math.round(data.composite_score),
      status: mapActionToStatus(data.action),
      reasons: reasons.length > 0 ? reasons : ['No significant risk factors detected'],
      backend_action: data.action,
    };
  } catch (error) {
    console.error('[fraud-engine] Backend call failed, using client-side fallback:', error);
    return analyzeTransactionLocal(tx);
  }
};

// ─── Pre-flight Recipient Check ─────────────────────────────────────

export const checkRecipient = async (account: string): Promise<RecipientCheckResponse> => {
  try {
    const response = await fetch(`/api/v1/check-recipient?account=${encodeURIComponent(account)}`);
    
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[fraud-engine] Recipient check failed:', error);
    return {
      account,
      status: 'UNKNOWN',
      network_risk: 'UNKNOWN',
      hops_to_fraud: -1,
    };
  }
};

// ─── Graph Visualization Fetch ──────────────────────────────────────

export const fetchNetworkGraph = async (account: string, sender?: string): Promise<{ nodes: any[], links: any[] }> => {
  try {
    let url = `/api/v1/network-graph?account=${encodeURIComponent(account)}`;
    if (sender) {
      url += `&sender=${encodeURIComponent(sender)}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[fraud-engine] Network graph fetch failed:', error);
    return { nodes: [], links: [] };
  }
};

// ─── Client-side Fallback (Original Logic) ──────────────────────────

const analyzeTransactionLocal = (tx: {
  amount: number;
  location: string;
}): FraudResult => {
  let risk_score = 0;
  const reasons: string[] = [];

  if (tx.amount > 50000) {
    risk_score += 40;
    reasons.push('High transaction amount detected');
  } else if (tx.amount > 10000) {
    risk_score += 20;
    reasons.push('Elevated transaction volume');
  }

  if (tx.location === 'Unknown' || tx.location === 'International') {
    risk_score += 25;
    reasons.push('Geographic location mismatch or high-risk area');
  }

  risk_score = Math.min(risk_score, 100);

  let status: 'allow' | 'flag' | 'block' = 'allow';
  if (risk_score >= 80) status = 'block';
  else if (risk_score >= 50) status = 'flag';

  return {
    risk_score,
    status,
    reasons: reasons.length > 0 ? reasons : ['No significant risk factors detected (offline mode)'],
  };
};
