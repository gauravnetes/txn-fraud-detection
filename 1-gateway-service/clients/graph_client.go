package clients

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"tx-verify/models"
)

func CallGraphEngine(tx models.Transaction) (models.Layer2Result, error) {
	jsonData, err := json.Marshal(tx)
	if err != nil {
		return models.Layer2Result{}, err
	}

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Post("http://localhost:8002/check-network", "application/json", bytes.NewBuffer(jsonData))
	
	if err != nil {
		return models.Layer2Result{}, fmt.Errorf("Graph Engine unreachable: %v", err)
	}
	defer resp.Body.Close()

	var result models.Layer2Result
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return models.Layer2Result{}, err
	}

	return result, nil
}