package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"sunchay.com/backend/db"
	"sunchay.com/backend/routes"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	db.InitDB()

	server := gin.Default()

	routes.RegisterRoutes(server)

	err = server.Run(":8080")
	if err != nil {
		panic("Could not start the server")
	}
}
