package util

import "time"

func RightNow() time.Time {
	return time.Now().UTC()
}
