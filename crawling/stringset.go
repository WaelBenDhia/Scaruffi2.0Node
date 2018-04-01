package crawling

import (
	set "github.com/deckarep/golang-set"
)

type stringset struct {
	underlying set.Set
}

func newStringSet(s ...string) *stringset {
	var conv []interface{}
	for _, v := range s {
		conv = append(conv, v)
	}
	return &stringset{
		set.NewSet(conv...),
	}
}

func (s *stringset) Add(i string) bool {
	return s.underlying.Add(i)
}

func (s *stringset) Cardinality() int {
	return s.underlying.Cardinality()
}

func (s *stringset) Clear() {
	s.underlying.Clear()
}

func (s *stringset) Clone() *stringset {
	return &stringset{s.underlying.Clone()}
}

func (s *stringset) Contains(i ...string) bool {
	var conv []interface{}
	for _, v := range i {
		conv = append(conv, v)
	}
	return s.underlying.Contains(conv...)
}

func (s *stringset) Difference(other *stringset) *stringset {
	return &stringset{s.underlying.Difference(other.underlying)}
}

func (s *stringset) Equal(other *stringset) bool {
	return s.underlying.Equal(other.underlying)
}

func (s *stringset) Intersect(other *stringset) *stringset {
	return &stringset{
		s.underlying.Intersect(other.underlying),
	}
}

func (s *stringset) IsProperSubset(other *stringset) bool {
	return s.underlying.IsProperSubset(other.underlying)
}

func (s *stringset) IsProperSuperset(other *stringset) bool {
	return s.underlying.IsProperSuperset(other.underlying)
}

func (s *stringset) IsSubset(other *stringset) bool {
	return s.underlying.IsSubset(other.underlying)
}
func (s *stringset) IsSuperset(other *stringset) bool {
	return s.underlying.IsSuperset(other.underlying)
}

func (s *stringset) Each(f func(string) bool) {
	s.underlying.Each(func(arg interface{}) bool {
		return f(arg.(string))
	})
}

func (s *stringset) Iter() <-chan string {
	out := make(chan string)
	in := s.underlying.Iter()
	go func() {
		for n := range in {
			out <- n.(string)
		}
		close(out)
	}()
	return out
}

func (s *stringset) Remove(i string) {
	s.underlying.Add(i)
}

func (s *stringset) String() string {
	return s.underlying.String()
}

func (s *stringset) SymmetricDifference(other *stringset) *stringset {
	return &stringset{
		s.underlying.SymmetricDifference(other.underlying),
	}
}

func (s *stringset) Union(other *stringset) *stringset {
	return &stringset{
		s.underlying.Union(other.underlying),
	}
}

func (s *stringset) PowerSet() *stringset {
	return &stringset{
		s.underlying.PowerSet(),
	}
}

func (s *stringset) CartesianProduct(other *stringset) *stringset {
	return &stringset{
		s.underlying.CartesianProduct(other.underlying),
	}
}

func (s *stringset) ToSlice() []string {
	var out []string
	for _, v := range s.underlying.ToSlice() {
		out = append(out, v.(string))
	}
	return out
}

func (s *stringset) Filter(f func(string) bool) *stringset {
	newSet := newStringSet()
	s.Each(func(v string) bool {
		if f(v) {
			newSet.Add(v)
		}
		return false
	})
	return newSet
}

func (s *stringset) Map(f func(string) string) *stringset {
	newSet := newStringSet()
	s.Each(func(v string) bool {
		newSet.Add(f(v))
		return false
	})
	return newSet
}
