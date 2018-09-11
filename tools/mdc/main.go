// mdc is a tool that wraps godoc2md so it can run recursively on all packages given a top level
// package path. The tool also injects frontmatter tags in the generated markdown for processing
// by hugo.
// Usage:
//     $ mdc github.com/goadesign/goa public/reference/goa --exclude goa.design
package main

import (
	"flag"
	"fmt"
	"os/exec"
	"path"
	"path/filepath"
	"sort"
	"strings"
	"text/template"
	"time"

	"os"
)

// Sortable package path / md file path pairs
type packages [][2]string

func (p packages) Swap(i, j int)      { p[i], p[j] = p[j], p[i] }
func (p packages) Len() int           { return len(p) }
func (p packages) Less(i, j int) bool { return p[i][0] < p[j][0] }

func main() {
	if _, err := exec.LookPath("godoc2md"); err != nil {
		fatal("could not find godoc2md in path, please install godoc2md with go get github.com/davecheney/godoc2md")
	}

	var (
		excludes []string
		branch   string
		verbose  bool
	)
	{
		excl := flag.String("exclude", "", "comma separated `list` of excluded packages")
		br := flag.String("branch", "", "git `branch` name to generate docs for")
		verb := flag.Bool("verbose", false, "display additional information")
		flag.Usage = func() {
			fmt.Println("mdc - Generate markdown from GoDoc recursively")
			fmt.Printf("usage: %s [flags] PACKAGE OUTPUTDIR\n", os.Args[0])
			flag.PrintDefaults()
		}
		flag.Parse()
		if flag.NArg() != 2 {
			flag.Usage()
			os.Exit(1)
		}
		excludes = strings.Split(*excl, ",")
		for i, e := range excludes {
			excludes[i] = strings.TrimSpace(e)
		}
		branch = *br
		verbose = *verb
	}

	root := packageDir()
	base := filepath.Base(root)
	out, err := filepath.Abs(flag.CommandLine.Args()[1])
	if err != nil {
		fatal("invalid output dir: %s", err)
	}
	if err = os.MkdirAll(out, 0755); err != nil {
		fatal("cannot create output dir: %s", err)
	}

	if verbose {
		fmt.Printf("* Packages root: %s\n* Output dir: %s\n", root, out)
		if len(excludes) > 0 {
			fmt.Printf("* Excludes: %s\n", strings.Join(excludes, ", "))
		}
	}

	if branch != "" {
		cmd := exec.Command("git", "checkout", branch)
		cmd.Dir = root
		_, err := cmd.Output()
		if err != nil {
			if ex, ok := err.(*exec.ExitError); ok {
				fatal(ex.Error() + ": " + ex.String())
			}
			fatal(err)
		}
	}

	var pkgs packages
	err = filepath.Walk(root, func(p string, i os.FileInfo, _ error) error {
		if i.Name() == ".git" || strings.HasPrefix(i.Name(), "_") || has(excludes, i.Name()) {
			return filepath.SkipDir
		}
		if !i.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(root, p)
		if err != nil {
			return err
		}
		mdPath := filepath.Join(out, base, rel)
		if err := os.MkdirAll(filepath.Dir(mdPath), 0755); err != nil {
			return err
		}
		pkg := path.Join(flag.CommandLine.Args()[0], filepath.ToSlash(rel))
		pkgs = append(pkgs, [2]string{pkg, mdPath + ".md"})
		return nil
	})
	if err != nil {
		fatal(err)
	}
	sort.Sort(pkgs)
	for _, p := range pkgs {
		err = godoc2md(p[0], p[1], verbose)
		if err == nil {
			if verbose {
				fmt.Println("OK")
			}
		} else {
			fmt.Printf("FAIL: %s\n", err)
		}
	}
}

func godoc2md(pkg, filename string, verbose bool) error {
	if verbose {
		fmt.Printf("godoc2md %s > %s...", pkg, filename)
	}
	cmd := exec.Command("godoc2md", pkg)
	b, err := cmd.Output()
	if err != nil {
		fatal(err)
	}
	f, err := os.Create(filename)
	if err != nil {
		fatal(err)
	}
	defer f.Close()
	t, err := template.New("header").Parse(headerT)
	if err != nil {
		fatal(err)
	}
	data := map[string]interface{}{
		"PackagePath": pkg,
		"Date":        time.Now().Format(time.RFC3339),
		"PackageName": path.Base(pkg),
	}
	err = t.Execute(f, data)
	if err != nil {
		fatal(err)
	}
	f.Write(b)

	return nil

}

func packageDir() string {
	var (
		fullPath string
		pkgPath  = flag.CommandLine.Args()[0]
		gopaths  = filepath.SplitList(os.Getenv("GOPATH"))
	)
	for _, gopath := range gopaths {
		candidate := filepath.Join(gopath, "src", pkgPath)
		if c, err := filepath.Abs(candidate); err == nil {
			candidate = c
		}
		if _, err := os.Stat(candidate); err == nil {
			fullPath = candidate
			break
		}
	}
	if fullPath == "" {
		fatal("could not find package %s in %s", pkgPath, os.Getenv("GOPATH"))
	}
	root, err := filepath.Abs(fullPath)
	if err != nil {
		fatal("could not compute package dir absolute path: %s", err)
	}
	return root
}

func fatal(format interface{}, val ...interface{}) {
	var f string
	if err, ok := format.(error); ok {
		f = err.Error()
	} else if s, ok := format.(string); ok {
		f = s
	} else {
		f = fmt.Sprintf("%v", format)
	}
	fmt.Fprintf(os.Stderr, f, val...)
	os.Exit(-1)
}

func has(sl []string, s string) bool {
	for _, e := range sl {
		if e == s {
			return true
		}
	}
	return false
}

const headerT = `+++
date="{{.Date}}"
description="{{.PackagePath}}"
+++
`
