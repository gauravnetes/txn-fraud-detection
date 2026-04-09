package api

import (
	"log"
	"net/http"

	"tx-verify/clients"
	"tx-verify/models"
	"tx-verify/store"

	"github.com/gin-gonic/gin"
)

func VerifyTransaction(c *gin.Context) {
	var tx models.Transaction

	if err := c.ShouldBindJSON(&tx); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload: " + err.Error()})
		return
	}

	log.Printf("⚡ Processing TxID: %s for User: %s", tx.TxID, tx.UserID)

	// --- LAYER 1: BEHAVIORAL PROFILING ---
	// Fetch sub-millisecond context from Redis
	features := store.GetUserFeatures(tx.UserID, tx.DeviceID)
	log.Printf("Context fetched: 24h Spend=%.2f, KnownDevice=%v", features.Spend24h, features.IsKnownDevice)

	// Ask Python ML Engine for Anomaly Score
	layer1, err := clients.CallMLEngine(tx, features)
	if err != nil {
		log.Printf("⚠️ ML Engine Error, falling back to safe defaults: %v", err)
		layer1 = models.Layer1Result{AnomalyScore: 0} // Fail-open policy if ML goes down
	}

	// --- LAYER 2: GRAPH DETECTION ---
	// Check Neo4j for N-Hop fraud ring connections
	layer2, err := clients.CallGraphEngine(tx)
	if err != nil {
		log.Printf("⚠️ Graph Engine Error, defaulting to LOW risk: %v", err)
		layer2 = models.Layer2Result{NetworkRisk: "LOW", HopsToFraud: 0}
	}

	// --- LAYER 3 & 4: REASONING & CIVIC ACTION ---
	var finalAction string
	var reason string

	// Escalation Logic: If Layer 1 or Layer 2 flag an issue, trigger the Agent
	if layer1.AnomalyScore > 60.0 || layer2.NetworkRisk == "HIGH" {
		log.Println("🔍 High risk detected. Escalating to Civic Reasoning Engine...")
		// finalAction, reason, err = clients.CallReasoningEngine(tx, layer1, layer2)
		
		// Temporary fallback until CallReasoningEngine is implemented
		finalAction = "HARD_BLOCK" // Fail-closed policy: lock it down if AI is unreachable
		reason = "System automatically blocked due to high risk factors."
	} else {
		finalAction = "APPROVE"
		reason = "Transaction aligns with behavioral patterns and has no known fraud network links."
	}

	go store.UpdateUserFeatures(tx.UserID, tx.Amount, tx.DeviceID)

	response := models.VerifyResponse{
		TxID:   tx.TxID,
		Action: finalAction,
		Score:  layer1.AnomalyScore,
		Reason: reason,
	}

	c.JSON(http.StatusOK, response)
}