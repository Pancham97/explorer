package util

import "net/url"

func IsValidURL(input string) bool {
	URL, err := url.ParseRequestURI(input)
	if err != nil {
		return false
	}

	return URL.Scheme != "" && URL.Host != ""
}
