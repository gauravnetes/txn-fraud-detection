package main

import (
	"log"
	
	"tx-verify/api"
	"tx-verify/store" 

	"github.com/gin-gonic/gin"
)

func main() {
	store.InitRedis()

	r := gin.Default()
	v1 := r.Group("/api/v1")
	{
		v1.POST("/verify", api.VerifyTransaction)
	}

	log.Println("🚀 Starting tx-verify Gateway on :8080")
	r.Run(":8080")
}