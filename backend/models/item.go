package models

import (
	"log"
	"time"

	"fmt"

	"github.com/oklog/ulid/v2"
	"sunchay.com/backend/db"
	"sunchay.com/backend/util"
)

const ITEM_TABLE = "item"

type Type string

const FileType Type = "file"
const URLType Type = "url"
const TextType Type = "text"

type Item struct {
	Content        string    `binding:"required"`
	CreatedAt      time.Time `json:"created_at"`
	Description    string
	FaviconURL     string `json:"favicon_url"`
	ID             ulid.ULID
	IsFavorite     bool      `json:"is_favorite"`
	LastAccessedAt time.Time `json:"last_accessed_at"`
	Metadata       interface{}
	Tags           interface{}
	ThumbnailURL   string `json:"thumbnail_url"`
	Title          string
	Type           Type
	UpdatedAt      time.Time `json:"updated_at"`
	URL            string
	UserID         ulid.ULID `json:"user_id"`
}

func (item *Item) Save() error {
	saveItemQuery := fmt.Sprintf("INSERT INTO %s(id, content, type, user_id, created_at, updated_at, last_accessed_at) VALUES (?, ?, ?, ?, ?, ?, ?)", ITEM_TABLE)

	stmt, err := db.DB.Prepare(saveItemQuery)
	if err != nil {
		fmt.Println("error preparing the query", saveItemQuery)
		return err
	}

	item.ID = ulid.Make()
	userID, err := ulid.Parse("01JGE47ST3BK4846N6WNA8SWGX")
	if err != nil {
		fmt.Println("failed to parse temp user ID")
	}

	var itemType = TextType
	if util.IsValidURL(item.Content) {
		itemType = URLType
	}

	item.Type = itemType

	defer stmt.Close()
	_, err = stmt.Exec(item.ID.String(), item.Content, item.Type, userID.String(), util.RightNow(), util.RightNow(), util.RightNow())
	fmt.Println("error saving item to database", err)
	return nil
}

func (item *Item) Update() error {
	updateItemQuery := fmt.Sprintf("UPDATE %s SET title = ?, description = ?, thumbnail_url = ?, favicon_url = ?, url = ?, updated_at = ? WHERE id = ?", ITEM_TABLE)

	stmt, err := db.DB.Prepare(updateItemQuery)
	if err != nil {
		fmt.Println("error preparing the query", updateItemQuery)
		return err
	}

	defer stmt.Close()
	_, err = stmt.Exec(item.Title, item.Description, item.ThumbnailURL, item.FaviconURL, item.URL, util.RightNow(), item.ID.String())
	if err != nil {
		fmt.Println("error updating item in database", err)
		return err
	}

	return nil
}

func FetchItemFromDatabase(itemID ulid.ULID) (Item, error) {
	fetchItemQuery := fmt.Sprintf("SELECT id, content, type, user_id, created_at, updated_at, last_accessed_at FROM %s WHERE id = ?", ITEM_TABLE)

	stmt, err := db.DB.Prepare(fetchItemQuery)
	if err != nil {
		fmt.Println("error preparing the query", fetchItemQuery)
		return Item{}, err
	}

	defer stmt.Close()

	row := stmt.QueryRow(itemID.String())

	var fetchedItem Item
	var fetchedItemID string
	var fetchedItemUserID string
	err = row.Scan(&fetchedItemID, &fetchedItem.Content, &fetchedItem.Type, &fetchedItemUserID, &fetchedItem.CreatedAt, &fetchedItem.UpdatedAt, &fetchedItem.LastAccessedAt)
	if err != nil {
		fmt.Println("error fetching item from database", err)
		return Item{}, err
	}

	fetchedItem.ID, err = ulid.Parse(fetchedItemID)
	if err != nil {
		fmt.Println("error parsing item ID", err)
		return Item{}, err
	}

	fetchedItem.UserID, err = ulid.Parse(fetchedItemUserID)
	if err != nil {
		fmt.Println("error parsing user ID", err)
		return Item{}, err
	}

	return fetchedItem, nil

}

func GetMetadata(itemID ulid.ULID) (interface{}, error) {
	fetchedItem, err := FetchItemFromDatabase(itemID)
	if err != nil {
		fmt.Println("error fetching item from database", err)
		return nil, err
	}

	if fetchedItem.Type == URLType {
		metadata, err := util.FetchMetadata(fetchedItem.Content)
		if err != nil {
			log.Fatalf("Failed to fetch metadata: %v", err)
		}

		fmt.Println("metadata", metadata)

		fetchedItem.ID = itemID
		fetchedItem.Title = metadata.Title
		fetchedItem.Description = metadata.Description
		fetchedItem.ThumbnailURL = metadata.Image
		fetchedItem.FaviconURL = metadata.Favicon
		fetchedItem.URL = metadata.URL

		err = fetchedItem.Update()
		if err != nil {
			fmt.Println("error updating item in database", err)
			return nil, err
		}
	}

	return fetchedItem, nil
}

func DeleteItem(itemID ulid.ULID) error {
	deleteItemQuery := fmt.Sprintf("DELETE FROM %s WHERE id = ?", ITEM_TABLE)

	stmt, err := db.DB.Prepare(deleteItemQuery)
	if err != nil {
		fmt.Println("error preparing the query", deleteItemQuery)
		return err
	}

	defer stmt.Close()
	_, err = stmt.Exec(itemID.String())
	if err != nil {
		fmt.Println("error deleting item from database", err)
		return err
	}

	return nil
}
