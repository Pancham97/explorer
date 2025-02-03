package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/oklog/ulid/v2"
	"sunchay.com/backend/models"
)

func getMetadata(context *gin.Context) {
	itemID := context.Param("id")

	parsedItemID, err := ulid.Parse(itemID)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"error": "Invalid item ID"})
		return
	}

	metadata, err := models.GetMetadata(parsedItemID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch metadata"})
		return
	}

	context.JSON(http.StatusOK, metadata)
}
