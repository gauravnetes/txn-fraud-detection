package clients

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
	"tx-verify/models"
	"tx-verify/store"
)

// MLPayload represents the enriched data sent to Python
type MLPayload struct {
	models.Transaction
	Features store.UserFeatures `json:"features"`
}

// CallMLEngine sends the transaction + Redis features to the Python API
func CallMLEngine(tx models.Transaction, features store.UserFeatures) (models.Layer1Result, error) {
	payload := MLPayload{
		Transaction: tx,
		Features:    features,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return models.Layer1Result{}, err
	}

	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Post("http://localhost:8001/predict", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return models.Layer1Result{}, fmt.Errorf("ML Engine unreachable: %v", err)
	}
	defer resp.Body.Close()

	var result models.Layer1Result
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return models.Layer1Result{}, err
	}

	return result, nil
}