package grifts

import (
	"github.com/gobuffalo/buffalo"
	"github.com/waelbendhia/scruffy-backend/actions"
)

func init() {
	buffalo.Grifts(actions.App())
}
