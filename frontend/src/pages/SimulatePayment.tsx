import React, { useState, useEffect } from 'react';
import { useFraudStore, Transaction } from '@/lib/store';
import { verifyTransaction, checkRecipient, RecipientCheckResponse } from '@/lib/fraud-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, XCircle, ShieldAlert, Smartphone, Monitor, Laptop, Search, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export default function SimulatePayment() {
  const addTransaction = useFraudStore((state) => state.addTransaction);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<Transaction | null>(null);

  // Pre-flight recipient check state
  const [recipientCheck, setRecipientCheck] = useState<RecipientCheckResponse | null>(null);
  const [isCheckingRecipient, setIsCheckingRecipient] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    recipient: '',
    note: '',
    method: 'UPI' as const,
    device: 'Mobile',
    location: 'Mumbai',
    velocity: '1',
    isNewDevice: false,
  });

  // Pre-flight: Check recipient when they finish typing (debounced)
  useEffect(() => {
    const recipient = formData.recipient.trim();
    if (recipient.length < 3) {
      setRecipientCheck(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingRecipient(true);
      const result = await checkRecipient(recipient);
      setRecipientCheck(result);
      setIsCheckingRecipient(false);
    }, 600); // 600ms debounce

    return () => clearTimeout(timer);
  }, [formData.recipient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);

    const amount = parseFloat(formData.amount);
    const txId = `TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    // Call the REAL backend (Go Gateway → ML → Graph → Reasoning)
    const analysis = await verifyTransaction({
      tx_id: txId,
      user_id: 'USR-8821',
      amount,
      timestamp,
      device_id: `DEV-${formData.device.toUpperCase()}`,
      ip_address: '127.0.0.1',
      location: formData.location,
      target_account: formData.recipient,
    });

    const tx: Transaction = {
      id: txId,
      amount,
      timestamp: Date.now(),
      user_id: 'USR-8821',
      recipient: formData.recipient,
      note: formData.note,
      device_id: `DEV-${formData.device.toUpperCase()}`,
      location: formData.location,
      velocity: parseInt(formData.velocity),
      is_new_device: formData.isNewDevice,
      method: formData.method,
      risk_score: analysis.risk_score,
      status: analysis.status,
      reasons: analysis.reasons,
      backend_action: analysis.backend_action,
      network_risk: recipientCheck?.network_risk,
      hops_to_fraud: recipientCheck?.hops_to_fraud,
      recipient_status: recipientCheck?.status,
    };

    addTransaction(tx);
    setResult(tx);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen pt-32 pb-12 px-6 bg-muted">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-float border-border/50">
            <CardHeader className="pb-8">
              <CardTitle className="text-3xl font-black tracking-tighter">Simulate <span className="text-primary">Payment</span></CardTitle>
              <CardDescription className="text-muted-foreground text-base">
                Test the fraud detection engine by simulating a real transaction through all 3 layers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="method" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Method</Label>
                    <Select 
                      value={formData.method} 
                      onValueChange={(v: any) => setFormData({...formData, method: v})}
                    >
                      <SelectTrigger className="bg-white border-border h-12 rounded-xl">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border rounded-xl">
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Card">Card Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount (INR)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      className="bg-white border-border h-12 rounded-xl"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      required
                    />
                  </div>
                </div>

                {/* Recipient field with live pre-flight check */}
                <div className="space-y-2">
                  <Label htmlFor="recipient" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recipient ID / Account</Label>
                  <div className="relative">
                    <Input
                      id="recipient"
                      placeholder="e.g. FRAUD-ACC-001 or LEGIT-ACC-002"
                      className="bg-white border-border h-12 rounded-xl pr-10"
                      value={formData.recipient}
                      onChange={(e) => setFormData({...formData, recipient: e.target.value})}
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isCheckingRecipient ? (
                        <Search className="w-4 h-4 text-muted-foreground animate-pulse" />
                      ) : recipientCheck ? (
                        recipientCheck.status === 'CLEAN' ? (
                          <Shield className="w-4 h-4 text-green-500" />
                        ) : recipientCheck.status === 'SUSPICIOUS' ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Shield className="w-4 h-4 text-muted-foreground/30" />
                        )
                      ) : null}
                    </div>
                  </div>
                  {/* Pre-flight result banner */}
                  <AnimatePresence>
                    {recipientCheck && recipientCheck.status !== 'UNKNOWN' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={cn(
                          "p-3 rounded-xl text-xs font-bold flex items-center gap-2",
                          recipientCheck.status === 'CLEAN' 
                            ? "bg-green-50 text-green-700 border border-green-200" 
                            : "bg-red-50 text-red-700 border border-red-200"
                        )}
                      >
                        {recipientCheck.status === 'CLEAN' ? (
                          <><CheckCircle2 className="w-3.5 h-3.5" /> Account verified clean — no fraud links detected</>
                        ) : (
                          <><AlertTriangle className="w-3.5 h-3.5" /> SUSPICIOUS — {recipientCheck.hops_to_fraud} hop(s) from known fraud ({recipientCheck.network_risk} risk)</>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="device" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Device Type</Label>
                    <Select 
                      value={formData.device} 
                      onValueChange={(v) => setFormData({...formData, device: v})}
                    >
                      <SelectTrigger className="bg-white border-border h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border rounded-xl">
                        <SelectItem value="Mobile">Mobile Phone</SelectItem>
                        <SelectItem value="Desktop">Desktop PC</SelectItem>
                        <SelectItem value="Laptop">MacBook / Laptop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</Label>
                    <Select 
                      value={formData.location} 
                      onValueChange={(v) => setFormData({...formData, location: v})}
                    >
                      <SelectTrigger className="bg-white border-border h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-border rounded-xl">
                        <SelectItem value="Mumbai">Mumbai, IN</SelectItem>
                        <SelectItem value="Bangalore">Bangalore, IN</SelectItem>
                        <SelectItem value="Delhi">Delhi, IN</SelectItem>
                        <SelectItem value="International">International (High Risk)</SelectItem>
                        <SelectItem value="Unknown">Unknown Proxy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 rounded-xl bg-muted/50 border border-border/50">
                  <input
                    type="checkbox"
                    id="isNewDevice"
                    className="w-5 h-5 rounded-md border-border bg-white accent-primary"
                    checked={formData.isNewDevice}
                    onChange={(e) => setFormData({...formData, isNewDevice: e.target.checked})}
                  />
                  <Label htmlFor="isNewDevice" className="text-sm font-medium cursor-pointer">Mark as new/unrecognized device</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="note" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Note (optional)</Label>
                  <Input
                    id="note"
                    placeholder="Payment note..."
                    className="bg-white border-border h-12 rounded-xl"
                    value={formData.note}
                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Analyzing via 3-Layer Engine..." : "Process Transaction"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-8">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <Card className={cn(
                  "shadow-float border-none overflow-hidden",
                  result.status === 'allow' ? "bg-green-50" : 
                  result.status === 'flag' ? "bg-amber-50" : "bg-red-50"
                )}>
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl font-black tracking-tighter">Analysis Result</CardTitle>
                        <CardDescription className="text-muted-foreground font-mono text-xs">{result.id}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={cn(
                          "px-4 py-1.5 text-xs font-bold rounded-full",
                          result.status === 'allow' ? "bg-green-500 text-white" : 
                          result.status === 'flag' ? "bg-amber-500 text-white" : 
                          "bg-red-500 text-white"
                        )}>
                          {result.backend_action || result.status.toUpperCase()}
                        </Badge>
                        {result.network_risk && result.network_risk !== 'UNKNOWN' && (
                          <Badge variant="secondary" className="text-[10px] font-bold bg-secondary/10 text-secondary border-none">
                            Network: {result.network_risk}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Risk Score</span>
                        <span className={cn(
                          "text-3xl font-black tracking-tighter",
                          result.risk_score < 30 ? "text-green-600" : 
                          result.risk_score < 70 ? "text-amber-600" : "text-red-600"
                        )}>{result.risk_score}<span className="text-sm text-muted-foreground/50">/100</span></span>
                      </div>
                      <div className="h-3 w-full bg-white rounded-full overflow-hidden border border-border/50 p-0.5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${result.risk_score}%` }}
                          className={cn(
                            "h-full rounded-full",
                            result.risk_score < 30 ? "bg-green-500" : 
                            result.risk_score < 70 ? "bg-amber-500" : "bg-red-500"
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-6 p-6 rounded-2xl bg-white shadow-soft border border-border/50">
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0",
                        result.status === 'allow' ? "bg-green-100 text-green-600" : 
                        result.status === 'flag' ? "bg-amber-100 text-amber-600" : 
                        "bg-red-100 text-red-600"
                      )}>
                        {result.status === 'allow' ? (
                          <CheckCircle2 className="w-8 h-8" />
                        ) : result.status === 'flag' ? (
                          <AlertTriangle className="w-8 h-8" />
                        ) : (
                          <XCircle className="w-8 h-8" />
                        )}
                      </div>
                      <div>
                        <p className="text-xl font-bold tracking-tight mb-1">
                          {result.status === 'allow' ? "Transaction Approved" : 
                           result.status === 'flag' ? "Review Required" : "Transaction Blocked"}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {result.status === 'allow' ? "All 3 layers verified this transaction as safe." : 
                           result.status === 'flag' ? "Unusual patterns detected by ML/Graph engine. Manual verification suggested." : 
                           "Multi-layer analysis confirmed high probability of fraudulent activity."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Risk Breakdown</p>
                      <div className="grid grid-cols-1 gap-3">
                        {result.reasons.map((reason, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/50 border border-border/30 text-sm font-medium">
                            <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(163,230,53,0.5)]" />
                            {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-white/50 border-t border-border/50 py-4 flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    <span>Processed at {new Date(result.timestamp).toLocaleTimeString()}</span>
                    <span>Engine: Go + ML + Neo4j + LLM</span>
                  </CardFooter>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 rounded-2xl border-2 border-dashed border-border/50 bg-white/30"
              >
                <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center mb-6">
                  <ShieldAlert className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-muted-foreground mb-2">Awaiting Transaction</h3>
                <p className="text-sm text-muted-foreground/60 max-w-xs">
                  Submit the form to see real-time fraud analysis powered by ML, Graph DB, and LLM reasoning.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-8 rounded-2xl bg-secondary text-white shadow-float relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-16 -mt-16" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-6">Live Engine Pipeline</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center gap-4 text-sm font-medium text-white/80">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-primary" />
                </div>
                <span>Layer 1: ML Isolation Forest (Anomaly Detection)</span>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium text-white/80">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-primary" />
                </div>
                <span>Layer 2: Neo4j Graph (Fraud Ring Detection)</span>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium text-white/80">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Laptop className="w-4 h-4 text-primary" />
                </div>
                <span>Layer 3: LLM Reasoning Engine (Decision + Civic)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
