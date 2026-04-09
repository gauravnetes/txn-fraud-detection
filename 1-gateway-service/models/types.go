// 1-gateway-service/models/types.go
package models

import "time"

// Transaction represents the incoming payload from the payment gateway
type Transaction struct {
	TxID      string    `json:"tx_id" binding:"required"`
	UserID    string    `json:"user_id" binding:"required"`
	Amount    float64   `json:"amount" binding:"required,gt=0"`
	Timestamp time.Time `json:"timestamp" binding:"required"`
	DeviceID  string    `json:"device_id" binding:"required"`
	IPAddress string    `json:"ip_address" binding:"required"`
	Location  string    `json:"location"` // e.g., "lat,lon" or "city,country"
	TargetAcc string    `json:"target_account" binding:"required"`
}

// Layer1Result is what the Python ML service returns
type Layer1Result struct {
	AnomalyScore float64 `json:"anomaly_score"` // 0 to 100
	IsNewDevice  bool    `json:"is_new_device"`
	VelocitySpike bool   `json:"velocity_spike"`
}

// Layer2Result is what the Graph DB service returns
type Layer2Result struct {
	NetworkRisk   string `json:"network_risk"` // "LOW", "MEDIUM", "HIGH"
	HopsToFraud   int    `json:"hops_to_fraud"`
	FlaggedEntity string `json:"flagged_entity,omitempty"`
}

// VerifyResponse is the final output sent back to the FE/Payment Gateway
type VerifyResponse struct {
	TxID    string  `json:"tx_id"`
	Action  string  `json:"action"`  // "APPROVE", "SOFT_CHALLENGE", "HARD_BLOCK"
	Score   float64 `json:"composite_score"`
	Reason  string  `json:"reason"`  // LLM generated explanation
}