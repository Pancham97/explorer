package util

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/dyatlov/go-htmlinfo/htmlinfo"

	"github.com/chromedp/chromedp"
)

const (
	maxRedirects   = 10
	requestTimeout = 10 * time.Second
	maxContentSize = 10 << 20 // 10 MB
)

type PageMetadata struct {
	URL         string
	Title       string
	Description string
	Image       string
	Favicon     string
}

func unfurlURL(inputURL string) (*PageMetadata, error) {
	parsedURL, err := url.ParseRequestURI(inputURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	htmlContent, err := StartBrowser(parsedURL.String())
	if err != nil {
		return nil, fmt.Errorf("making request: %w", err)
	}

	info := htmlinfo.NewHTMLInfo()

	// if url can be nil too, just then we won't be able to fetch (and generate) oembed information
	err = info.Parse(strings.NewReader(htmlContent), &inputURL, nil)

	if err != nil {
		return nil, fmt.Errorf("parsing HTML: %w", err)
	}

	fmt.Printf("Info:\n%s\n", info)

	fmt.Printf("Title: %s\n", info.Title)
	fmt.Printf("Description: %s\n", info.Description)
	fmt.Printf("Images: %v\n", info.ImageSrcURL)
	fmt.Printf("URL: %s\n", info.OGInfo.URL)
	fmt.Printf("Icon: %s\n", info.FaviconURL)

	fmt.Printf("Oembed information: %s\n", info.GenerateOembedFor(inputURL))

	metadata := &PageMetadata{
		URL: inputURL,
		Title: func() string {
			if info.OembedInfo != nil && info.OembedInfo.Title != "" {
				return info.OembedInfo.Title
			}
			return info.Title
		}(),
		Description: func() string {
			if info.OembedInfo != nil && info.OembedInfo.Description != "" {
				return info.OembedInfo.Description
			}
			return info.Description
		}(),
		Image: func() string {
			if info.ImageSrcURL != "" {
				return info.ImageSrcURL
			}
			if len(info.OGInfo.Images) > 0 {
				return info.OGInfo.Images[0].URL
			}
			return ""
		}(),
		Favicon: info.FaviconURL,
	}

	return metadata, nil
}

func FetchMetadata(url string) (*PageMetadata, error) {

	metadata, err := unfurlURL(url)
	if err != nil {
		fmt.Printf("Error processing %s: %v\n", url, err)
		return nil, err
	}

	fmt.Printf("Original URL: %s\n", url)
	fmt.Printf("Final URL: %s\n", metadata.URL)
	fmt.Printf("Title: %s\n", metadata.Title)
	fmt.Printf("Description: %s\n", metadata.Description)
	fmt.Printf("Favicon: %s\n", metadata.Favicon)
	fmt.Printf("Image: %s\n", metadata.Image)
	fmt.Println("--------------------")

	return metadata, nil
}

func StartBrowser(url string) (string, error) {
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		// set up a proxy (such as Fiddler) and uncomment the next two lines to see the network requests if it still does not work.
		//chromedp.ProxyServer("localhost:8866"),
		//chromedp.Flag("ignore-certificate-errors", true),
		chromedp.UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.106 Safari/537.36"),
	)
	ctx, cancel := chromedp.NewExecAllocator(context.Background(), opts...)
	defer cancel()

	ctx, cancel = chromedp.NewContext(ctx)
	defer cancel()

	var htmlContent string
	var b1 []byte
	if err := chromedp.Run(ctx,
		chromedp.EmulateViewport(1920, 2000),
		chromedp.Navigate(url),
		chromedp.CaptureScreenshot(&b1),
		chromedp.OuterHTML(`html`, &htmlContent),
	); err != nil {
		log.Fatal(err)
	}

	if err := os.WriteFile("screenshot1.png", b1, 0o644); err != nil {
		log.Fatal(err)
	}

	fmt.Println("htmlContent", htmlContent)

	return htmlContent, nil
}
