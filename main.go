package main

import (
	"fmt"
	"log"
	"os"

	"github.com/waelbendhia/scruffy-backend/crawling"
)

func main() {
	log.Println("Hello world")
	file, err := os.OpenFile("links", os.O_APPEND|os.O_WRONLY, 0777)
	if err != nil {
		log.Fatalf("Failed to open file: %v", err)
	}
	defer file.Close()
	output := crawling.CrawlChannel("scaruffi.com", "http://www.scaruffi.com")
	for v := range output {
		_, err := fmt.Fprintln(file, v)
		if err != nil {
			log.Fatalf("Failed to write to file: %v", err)
		}
		if err := file.Sync(); err != nil {
			log.Fatalf("Failed to sync file: %v", err)
		}
	}
}
