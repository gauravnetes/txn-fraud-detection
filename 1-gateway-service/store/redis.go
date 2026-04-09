package store

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

var Rdb *redis.Client
var ctx = context.Background()

func InitRedis() {
	Rdb = redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "", 
		DB:       0, 
	})

	_, err := Rdb.Ping(ctx).Result()
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	log.Println("✅ Connected to Redis Feature Store")
}

type UserFeatures struct {
	Spend24h    float64 `json:"spend_24h"`
	IsKnownDevice bool  `json:"is_known_device"`
}

func GetUserFeatures(userID string, currentDeviceID string) UserFeatures {
	now := time.Now().Unix()
	twentyFourHoursAgo := now - (24 * 60 * 60)

	spendKey := fmt.Sprintf("user:%s:spend_history", userID)
	deviceKey := fmt.Sprintf("user:%s:devices", userID)

	Rdb.ZRemRangeByScore(ctx, spendKey, "-inf", strconv.FormatInt(twentyFourHoursAgo, 10))
	
	recentTransactions, _ := Rdb.ZRangeWithScores(ctx, spendKey, 0, -1).Result()
	var totalSpend24h float64
	for _, tx := range recentTransactions {
		amount, _ := strconv.ParseFloat(tx.Member.(string), 64)
		totalSpend24h += amount
	}

	isKnownDevice, _ := Rdb.SIsMember(ctx, deviceKey, currentDeviceID).Result()

	return UserFeatures{
		Spend24h:      totalSpend24h,
		IsKnownDevice: isKnownDevice,
	}
}

func UpdateUserFeatures(userID string, amount float64, deviceID string) {
	now := float64(time.Now().Unix())
	
	spendKey := fmt.Sprintf("user:%s:spend_history", userID)
	Rdb.ZAdd(ctx, spendKey, redis.Z{
		Score:  now,
		Member: fmt.Sprintf("%f_%f", amount, now), // Make member unique
	})

	deviceKey := fmt.Sprintf("user:%s:devices", userID)
	Rdb.SAdd(ctx, deviceKey, deviceID)
}