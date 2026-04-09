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
		finalAction, reason, err = clients.CallReasoningEngine(tx, layer1, layer2)
		if err != nil {
			log.Printf("⚠️ Reasoning Engine Error, defaulting to HARD_BLOCK: %v", err)
			finalAction = "HARD_BLOCK"
			reason = "System automatically blocked — reasoning engine unreachable."
		}
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

// CheckRecipient performs a pre-flight check on a target account
// before a transaction is initiated (Truecaller-style UX pattern).
func CheckRecipient(c *gin.Context) {
	account := c.Query("account")
	if account == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing 'account' query parameter"})
		return
	}

	log.Printf("🔍 Pre-flight check for recipient: %s", account)

	// Build a minimal transaction just to query the graph engine
	minimalTx := models.Transaction{
		TxID:      "PREFLIGHT",
		UserID:    "SYSTEM",
		Amount:    0,
		DeviceID:  "SYSTEM",
		IPAddress: "0.0.0.0",
		TargetAcc: account,
	}

	layer2, err := clients.CallGraphEngine(minimalTx)
	if err != nil {
		log.Printf("⚠️ Graph Engine Error during pre-flight: %v", err)
		c.JSON(http.StatusOK, models.RecipientCheckResponse{
			Account:     account,
			Status:      "UNKNOWN",
			NetworkRisk: "UNKNOWN",
			HopsToFraud: -1,
		})
		return
	}

	status := "CLEAN"
	if layer2.NetworkRisk == "HIGH" || layer2.NetworkRisk == "MEDIUM" {
		status = "SUSPICIOUS"
	}

	c.JSON(http.StatusOK, models.RecipientCheckResponse{
		Account:     account,
		Status:      status,
		NetworkRisk: layer2.NetworkRisk,
		HopsToFraud: layer2.HopsToFraud,
	})
}

// GetNetworkGraph fetches the node/link visual graph from the Neo4j Graph Engine
func GetNetworkGraph(c *gin.Context) {
	account := c.Query("account")
	sender := c.Query("sender")
	if account == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing 'account' query parameter"})
		return
	}

	url := "http://localhost:8002/graph?account=" + account
	if sender != "" {
		url += "&sender=" + sender
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		log.Printf("⚠️ Graph Engine UI query failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Graph engine unreachable"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(resp.StatusCode, gin.H{"error": "Graph engine returned non-200"})
		return
	}

	// Stream response back to frontend
	c.DataFromReader(http.StatusOK, resp.ContentLength, resp.Header.Get("Content-Type"), resp.Body, nil)
}