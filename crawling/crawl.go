package crawling

import (
	"log"
	"net/http"
	"net/url"
	"strings"

	"github.com/PuerkitoBio/goquery"
	"github.com/pkg/errors"
)

func urlJoin(a, b string) (string, error) {
	u, err := url.Parse(b)
	if err != nil {
		return "", err
	}
	base, err := url.Parse(a)
	if err != nil {
		return "", err
	}
	res := base.ResolveReference(u)
	return res.String(), nil
}

func cleanUrl(v string) (string, error) {
	_, err := url.Parse(v)
	if err != nil {
		return "", err
	}

	for strings.Contains(v, "#") {
		vs := strings.Split(v, "#")
		v = strings.Join(vs[:len(vs)-1], "")
	}

	return v, nil
}

func getLinksFromPage(url, discrimintor string) (*stringset, error) {
	res, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return nil, err
	}

	links := newStringSet()

	doc.
		Find("a").
		Each(func(i int, s *goquery.Selection) {
			val, ok := s.Attr("href")
			if ok {
				if strings.Contains(val, "http") {
					if strings.Contains(val, discrimintor) {
						links.Add(val)
					}
				} else if v, err := urlJoin(url, val); err == nil {
					links.Add(v)
				}
			}
		})

	return links, nil
}

func joinFilterFunctions(fs ...func(string) bool) func(string) bool {
	return func(v string) bool {
		for _, f := range fs {
			if !f(v) {
				return false
			}
		}
		return true
	}
}

func getRecursive(url, discrimintor string) (*stringset, error) {
	links, nodes := newStringSet(url), []string{url}

	for len(nodes) > 0 {
		var cur string
		cur, nodes = nodes[0], nodes[1:]
		newLinks, err := getLinksFromPage(cur, discrimintor)
		if err != nil {
			log.Println(errors.Wrapf(err, "failed at '%s'", cur))
			continue
		}
		keeping := newLinks.
			Difference(links).
			Filter(func(v string) bool {
				_, err := cleanUrl(v)
				return err == nil
			}).
			Map(func(v string) string {
				v, _ = cleanUrl(v)
				return v
			})
		nodes = append(nodes, keeping.ToSlice()...)
		links = links.Union(keeping)
		log.Println(
			"found:", links.Cardinality(),
			"remaining:", len(nodes),
		)
	}
	return links, nil
}

func CrawlChannel(discrimintor string, url ...string) <-chan string {
	outPut := make(chan string)
	go func() {
		links, nodes := newStringSet(url...), url
		for len(nodes) > 0 {
			var cur string
			cur, nodes = nodes[0], nodes[1:]
			newLinks, err := getLinksFromPage(cur, discrimintor)
			if err != nil {
				log.Println(errors.Wrapf(err, "failed at '%s'", cur))
				continue
			}
			newLinks = newLinks.
				Filter(func(v string) bool {
					_, err := cleanUrl(v)
					return err == nil
				}).
				Map(func(v string) string {
					v, _ = cleanUrl(v)
					return v
				}).
				Difference(links)
			newLinks.Each(func(v string) bool {
				outPut <- v
				return false
			})
			nodes = append(nodes, newLinks.ToSlice()...)
			links = links.Union(newLinks)
			log.Println(
				"found:", links.Cardinality(),
				"remaining:", len(nodes),
			)
		}
		close(outPut)
	}()
	return outPut
}

func Crawl(url, discrimintor string) ([]string, error) {
	links, err := getRecursive(url, discrimintor)
	if err != nil {
		return nil, err
	}
	return links.ToSlice(), nil
}
