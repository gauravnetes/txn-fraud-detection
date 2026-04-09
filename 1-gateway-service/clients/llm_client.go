package clients

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"tx-verify/models"
)

// LLMPayload bundles everything the AI Agent needs to make a decision
type LLMPayload struct {
	Transaction models.Transaction  `json:"transaction"`
	Layer1      models.Layer1Result `json:"layer_1_result"`
	Layer2      models.Layer2Result `json:"layer_2_result"`
}

// LLMResponse is what the Python LangChain/Civic Agent returns
type LLMResponse struct {
	Action string `json:"action"` 
	Reason string `json:"reason"` // FIX: Added this missing field!
}

// CallReasoningEngine sends the full context to the AI Agent
func CallReasoningEngine(tx models.Transaction, l1 models.Layer1Result, l2 models.Layer2Result) (string, string, error) {
	payload := LLMPayload{
		Transaction: tx,
		Layer1:      l1,
		Layer2:      l2,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "ERROR", "Failed to marshal payload", err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post("http://localhost:8003/evaluate", "application/json", bytes.NewBuffer(jsonData))
	
	if err != nil {
		return "ERROR", fmt.Sprintf("Reasoning Engine unreachable: %v", err), err
	}
	defer resp.Body.Close()

	var result LLMResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "ERROR", "Failed to decode AI response", err
	}

	// FIX: Now result.Reason actually exists in the struct above
	return result.Action, result.Reason, nil 
}