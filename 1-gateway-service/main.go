package main

import (
	"log"
	"net/http"

	"tx-verify/api"
	"tx-verify/store"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware allows the frontend dev server to call the API
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func main() {
	store.InitRedis()

	r := gin.Default()
	r.Use(CORSMiddleware())

	v1 := r.Group("/api/v1")
	{
		v1.POST("/verify", api.VerifyTransaction)
		v1.GET("/check-recipient", api.CheckRecipient)
	}

	log.Println("🚀 Starting tx-verify Gateway on :8080")
	r.Run(":8080")
}