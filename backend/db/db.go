package db

import (
	"crypto/tls"
	"crypto/x509"
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func InitDB() {
	config := struct {
		hostname string
		port     string
		username string
		password string
		database string
		certPath string
	}{
		hostname: os.Getenv("DATABASE_HOST"),
		port:     os.Getenv("DATABASE_PORT"),
		username: os.Getenv("DATABASE_USER"),
		password: os.Getenv("DATABASE_PASSWORD"),
		database: os.Getenv("DATABASE_NAME"),
		certPath: "db/singlestore_bundle.pem",
	}

	rootCert, err := os.ReadFile(config.certPath)
	if err != nil {
		log.Fatal("Could not read SSL certificate")
		panic("Could not read SSL certificate")
	}

	rootCertPool := x509.NewCertPool()
	if ok := rootCertPool.AppendCertsFromPEM(rootCert); !ok {
		log.Fatal("Failed to append certificate")
		panic("Failed to append certificate")
	}

	err = mysql.RegisterTLSConfig("custom", &tls.Config{RootCAs: rootCertPool, MinVersion: tls.VersionTLS12})
	if err != nil {
		panic("Error registering TLS config")
	}

	connection := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?tls=custom&parseTime=true", config.username, config.password, config.hostname, config.port, config.database)

	var dbErr error
	DB, dbErr = sql.Open("mysql", connection)
	if dbErr != nil {
		panic("Something went wrong when initializing the database!")
	}

	err = DB.Ping()
	if err != nil {
		fmt.Println("error pinging database", err)
		panic("Error pinging database")
	}

	fmt.Println("Ping successful!")

	DB.SetMaxOpenConns(10)
	DB.SetMaxIdleConns(5)

	createTables()
}

func createTables() {
	usersTableQuery := `CREATE TABLE IF NOT EXISTS users_table (
	id varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
	birth_date date DEFAULT NULL,
	email varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
	first_name varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
	last_name varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
	avatar_url varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	user_name varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
	PRIMARY KEY (id),
	SHARD KEY __SHARDKEY (id),
	SORT KEY __UNORDERED ()
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES'`

	_, err := DB.Exec(usersTableQuery)
	if err != nil {
		panic("Error creating users table")
	}

	itemTableQuery := `CREATE TABLE IF NOT EXISTS item (
	id varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
	user_id varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
	content text CHARACTER SET utf8 COLLATE utf8_general_ci,
	type enum('file','url','text') CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
	favicon_url varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
	tags JSON COLLATE utf8mb4_bin,
	is_favorite tinyint(4) NOT NULL DEFAULT 0,
	metadata JSON COLLATE utf8mb4_bin,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	last_accessed_at timestamp NULL DEFAULT NULL,
	url varchar(4096) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
	thumbnail_url varchar(4096) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
	title varchar(360) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
	description varchar(360) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
	PRIMARY KEY (id),
	SHARD KEY __SHARDKEY (id),
	SORT KEY __UNORDERED ()
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES'`

	_, err = DB.Exec(itemTableQuery)
	if err != nil {
		panic("Error creating item table")
	}

	providerTableQuery := `CREATE TABLE IF NOT EXISTS provider (
	id varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
	user_id varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
	provider varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
	created_at timestamp NOT NULL,
	updated_at timestamp NOT NULL,
	PRIMARY KEY (id),
	SHARD KEY __SHARDKEY (id),
	SORT KEY __UNORDERED ()
) AUTOSTATS_CARDINALITY_MODE=INCREMENTAL AUTOSTATS_HISTOGRAM_MODE=CREATE AUTOSTATS_SAMPLING=ON SQL_MODE='STRICT_ALL_TABLES'`

	_, err = DB.Exec(providerTableQuery)
	if err != nil {
		panic("Error creating provider table")
	}
}
