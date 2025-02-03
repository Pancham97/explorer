package routes

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/oklog/ulid/v2"
	"sunchay.com/backend/models"
)

// 1. Save the item to DB immediately
// 2. if it is a URL, fetch metadata
// 3. if it is a file, store file in S3 and return a preview
// 4. if it a normal text file, simply return the text
func saveItem(context *gin.Context) {
	var item models.Item

	err := context.ShouldBindJSON(&item)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Could not parse the item"})
		return
	}

	err = item.Save()
	if err != nil {
		fmt.Println("error saving item", err)
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not save the item"})
		return
	}

	context.JSON(http.StatusCreated, gin.H{"message": "Item saved successfully!", "id": item.ID.String()})
}

func deleteItem(context *gin.Context) {
	itemID := context.Param("id")

	parsedItemID, err := ulid.Parse(itemID)
	if err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Invalid item ID"})
		return
	}

	err = models.DeleteItem(parsedItemID)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Could not delete the item"})
		return
	}

	context.JSON(http.StatusOK, gin.H{"message": "Item deleted successfully!", "id": itemID})
}
