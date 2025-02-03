package routes

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(server *gin.Engine) {
	server.POST("/item", saveItem)
	server.DELETE("/item/:id", deleteItem)
	server.GET("/metadata/:id", getMetadata)
}
