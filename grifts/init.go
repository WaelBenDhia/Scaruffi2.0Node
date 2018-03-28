package grifts

import (
	"github.com/gobuffalo/buffalo"
	"github.com/waelbendhia/scruffy_backend/actions"
)

func init() {
	buffalo.Grifts(actions.App())
}
