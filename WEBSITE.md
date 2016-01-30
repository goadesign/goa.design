## Website Instructions

To modify the website you'll need [hugo](http://gohugo.io)

```
cd website
hugo serve --theme=goa --buildDrafts -v
```

Hugo is now running at http://localhost:1313

Modify web contents in the /website/content/ folder.  Hugo will update the site running locally.

## Goa's Theme

The theme is in /website/themes/goa.  Layouts are in the `layouts` folder, static assets are under `static`.

## The PUBLIC folder

If you generate the website with `hugo` (no `serve`), don't check in the public folder.

##  Deployment

TBD after the site is ready we'll link the public directory to the gh-pages branch using git magic.

