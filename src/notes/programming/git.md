# Git

## Checkout

git clone without downloading

```shell
git clone <repo> --no-checkout
```

check what are the branches

```shell
git fetch && git branch
```

force sync from origin

```shell
git reset --hard origin/main
```

pull main without checking out main

```sh
git fetch origin main:main
```

fetch only 1 commit

```sh
git fetch --depth 1 git@github.com:username/repo.git FULL_SHA_FOR_COMMIT
```

## Config

sane config

```sh
git config --global pull.rebase true # rebase on pull conflict
git config --global rebase.autoStash true # stash before rebase
git config --global submodule.recurse true # always recur submodule
```

## Commit

commit with message

```shell
git commit -m "<msg>"
```

stage all changes and commit

```shell
git commit -am "<msg>"
```

revert to the last commit

```shell
git reset HEAD~
```

or

```shell
git revert …
```

change the last commit

```shell
--amend
```

create orphan branch

```shell
git switch --orphan <branch>
```

add coauthor to commit

```sh
git commit -m "Commit message.

Co-authored-by: Name <email@example.com>"
```

## Bookkeeping

delete all history of a certain file (*deprecated*)

```shell
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch --index-filter \
    'git rm -rf --cached --ignore-unmatch <path_to_file>' HEAD
```

delete all history of a certain file using git-filter-repo

```shell
git filter-repo --invert-paths --path '<path_to_file>' --use-base-name
```

ignore all symlink

```bash
find * -type l -not -exec grep -q "^{}$" .gitignore \; -print >> .gitignore
```

git commit sizes

```sh
bash -c "git rev-list --objects --all |
git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' |
sed -n 's/^blob //p' |
sort --numeric-sort --key=2 |
cut -c 1-12,41- |
$(command -v gnumfmt || echo numfmt) --field=2 --to=iec-i --suffix=B --padding=7 --round=nearest"
```

verify no change since commit

```sh
git diff --exit-code HEAD
```

remove uncommitted files

```sh
git clean -f
```

remove ignored files

```sh
git clean -fX
```

go back and clean up history

```sh
git rebase -i COMMIT_BEFORE_CHANGES
```

squash merge

```sh
git merge --squash <branch>
```

## Multiple repo

add repo as submodule

```shell
git submodule add <repo>
```

clone all submodules

```sh
git submodule update --init --recursive
```

after changing `.gitmodule`

```sh
git submodule sync --recursive
```

pull every repo under the current folder

```shell
fd .git -H -t d -x git --git-dir={} pull
```

fetch and status every repo under the current folder

```shell
fd .git -H -t d -x git --git-dir={} fetch \; -x git --git-dir={} --work-tree {}/.. status
```

## Multiple origin

push all branch to all remote

```shell
git remote | xargs -L1 git push --all
```

push main to all remote

```shell
git remote | xargs -L1 -I R git push R main
```
