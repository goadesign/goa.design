// mdc is a tool that wraps godoc2md so it can run recursively on all packages given a top level
// package path. The tool also injects frontmatter tags in the generated markdown for processing
// by hugo.
// Usage:
//     $ mdc github.com/goadesign/goa public/reference/goa --exclude goa.design
package main

import (
	"fmt"
	"os/exec"
	"path"
	"path/filepath"
	"strings"
	"text/template"
	"time"

	"os"

	"github.com/spf13/cobra"
)

// Cmd is the only command of mdc
var Cmd = &cobra.Command{
	Use:   "mdc",
	Short: "Generate markdown from godocs recursively",
	Long:  "This tool produces the goa.design reference content",
	Run:   run,
}

// List of paths to exclude from processing
var excludes []string

func init() {
	Cmd.Flags().StringSliceVarP(&excludes, "exclude", "x", nil, "list of paths to exclude from processing")
}

func main() {
	if _, err := exec.LookPath("godoc2md"); err != nil {
		fatal("could not find godoc2md in path, please install godoc2md with go get github.com/davecheney/godoc2md")
	}
	if err := Cmd.Execute(); err != nil {
		fatal(err)
	}
}

func run(cmd *cobra.Command, args []string) {
	if len(args) < 2 {
		fatal("usage: %s PACKAGE OUTPUTDIR [flags]", os.Args[0])
	}
	packagePath := args[0]
	var fullPath string
	gopaths := filepath.SplitList(os.Getenv("GOPATH"))
	for _, gopath := range gopaths {
		candidate := filepath.Join(gopath, "src", packagePath)
		if c, err := filepath.Abs(candidate); err == nil {
			candidate = c
		}
		if _, err := os.Stat(candidate); err == nil {
			fullPath = candidate
			break
		}
	}
	if fullPath == "" {
		fatal("could not find package %s in %s", packagePath, os.Getenv("GOPATH"))
	}
	root, err := filepath.Abs(fullPath)
	if err != nil {
		fatal(err)
	}
	out, err := filepath.Abs(args[1])
	if err != nil {
		fatal(err)
	}
	if err := os.MkdirAll(out, 0755); err != nil {
		fatal(err)
	}
	ex := make(map[string]bool)
	for _, e := range excludes {
		ex[e] = true
	}
	fmt.Printf("* Packages root: %s\n* Output dir: %s\n", root, out)
	if len(excludes) > 0 {
		fmt.Printf("* Excludes: %s\n", strings.Join(excludes, ", "))
	}
	err = filepath.Walk(root, func(p string, i os.FileInfo, _ error) error {
		if i.Name() == ".git" || strings.HasPrefix(i.Name(), "_") || ex[i.Name()] {
			return filepath.SkipDir
		}
		if !i.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(root, p)
		if err != nil {
			return err
		}
		mdPath := filepath.Join(out, filepath.Base(root), rel)
		if err := os.MkdirAll(filepath.Dir(mdPath), 0755); err != nil {
			return err
		}
		pkg := path.Join(packagePath, filepath.ToSlash(rel))
		fullMdPath := fmt.Sprintf("%s.%s", mdPath, "md")
		err = godoc2md(pkg, fullMdPath)
		if err == nil {
			fmt.Println("OK")
		} else {
			fmt.Printf("FAIL: %s\n", err)
		}
		return nil
	})
	if err != nil {
		fatal(err)
	}
}

func godoc2md(pkg, filename string) error {
	fmt.Printf("godoc2md %s > %s...", pkg, filename)
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

const headerT = `+++
date="{{.Date}}"
description="{{.PackagePath}}"
+++
`
