## Website Instructions

To modify the website you'll need [hugo](http://gohugo.io)

```bash
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

Commits to the master branch cause the site to get redeployed via TravisCI.
