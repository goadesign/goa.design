package main

import (
	"fmt"
	"os/exec"
	"path"
	"path/filepath"
	"strings"

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
		fatal("usage: %s INPUTDIR OUTPUTDIR", os.Args[0])
	}
	root, err := filepath.Abs(args[0])
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
	var packagePath string
	gopaths := filepath.SplitList(os.Getenv("GOPATH"))
	for _, gopath := range gopaths {
		if g, err := filepath.Abs(gopath); err == nil {
			gopath = g
		}
		if strings.HasPrefix(root, gopath) {
			packagePath = filepath.ToSlash(strings.TrimPrefix(root, filepath.Join(gopath, "src")))[1:]
			break
		}
	}
	if packagePath == "" {
		fatal("path %s is not in a Go workspace", root)
	}
	fmt.Printf("* Packages root: %s\n* Output dir: %s\n", root, out)
	err = filepath.Walk(root, func(p string, i os.FileInfo, _ error) error {
		if i.Name() == ".git" || strings.HasPrefix(i.Name(), "_") {
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
