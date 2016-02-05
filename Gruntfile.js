var toml = require("toml");
var S = require("string");

var CONTENT_PATH_PREFIX = "content";
var SITE_IDX_DEST = "static/js/pindex.json";

module.exports = function(grunt) {

    grunt.registerTask("lunr-index", function() {

        grunt.log.writeln("Build pages index");

        var indexPages = function() {
            var pagesIndex = [];
            grunt.file.recurse(CONTENT_PATH_PREFIX, function(abspath, rootdir, subdir, filename) {
                grunt.verbose.writeln("Parse file:",abspath);
                pagesIndex.push(processFile(abspath, filename));
            });

            return pagesIndex;
        };

        var processFile = function(abspath, filename) {
            var pageIndex;

            if (S(filename).endsWith(".html")) {
                pageIndex = processHTMLFile(abspath, filename);
            } else {
                pageIndex = processMDFile(abspath, filename);
            }

            return pageIndex;
        };

        var processHTMLFile = function(abspath, filename) {
            var content = grunt.file.read(abspath);
            var pageName = S(filename).chompRight(".html").s;
            var href = S(abspath)
                .chompLeft(CONTENT_PATH_PREFIX).s;
            return {
                title: pageName,
                href: href,
                content: S(content).trim().stripTags().stripPunctuation().s
            };
        };

        var processMDFile = function(abspath, filename) {
            var content = grunt.file.read(abspath);
            grunt.log.ok("READING FILE:" + abspath)
            var pageIndex;
            // First separate the Front Matter from the content and parse it
            content = content.split("+++");
            var frontMatter;
            try {
                frontMatter = toml.parse(content[1].trim());
            } catch (e) {
                grunt.log.error("ERROR WHILST PROCESSING: " + abspath + e.message);
            }
            if (frontMatter.url) {
                var href = frontMatter.url;
            } else {
                var href = S(abspath).chompLeft(CONTENT_PATH_PREFIX).chompRight(".md").s + ".html";
                // href for index.md files stops at the folder name - Not with ugly URLs
                // if (filename === "index.md") {
                //     href = S(abspath).chompLeft(CONTENT_PATH_PREFIX).chompRight(filename).s;
                // }
            }


            // Build Lunr index for this page
            pageIndex = {
                title: frontMatter.title,
                tags: frontMatter.tags,
                href: href,
                content: S(content[2]).trim().stripTags().stripPunctuation().s
            };

            return pageIndex;
        };

        grunt.file.write(SITE_IDX_DEST, JSON.stringify(indexPages()));
        grunt.log.ok("Index built");
    });
};
