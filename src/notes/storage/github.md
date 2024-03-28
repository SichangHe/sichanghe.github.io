# GitHub

GitHub linguist settings in `.gitattributes`
([reference](https://github.com/github-linguist/linguist/blob/master/docs/overrides.md)):

```gitattributes
<directory to exclude from stats>/** linguist-vendored
<directory to exclude from stats and hide from diffs>/** linguist-generated
<directory to forcely include>/** linguist-detectable
```

Git large file system (Git LFS) settings in `.gitattributes`:

```gitattributes
<directory to be included in Git LFS> filter=lfs diff=lfs merge=lfs -text
```

GitHub repository size: <https://api.github.com/repos/git/git>
