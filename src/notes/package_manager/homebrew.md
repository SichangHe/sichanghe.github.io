<!-- toc -->
# Homebrew

search package

```shell
brew search <package>
```

install package

```shell
brew install <package>
```

update

```shell
brew update \
&& brew upgrade --greedy \
&& brew cleanup \
&& brew autoremove
```

list installed packages

```shell
brew list
```

show dependency tree of package

```shell
brew deps -t <package>
```

export package and cask name to reproduce environment

```sh
brew leaves > brew_leaves.txt
brew list --cask > brew_list_cask.txt
```

display information about package

```shell
brew info <package>
```

clean up junk

```shell
brew cleanup && brew autoremove
```

no stop-the-world auto update

```sh
export HOMEBREW_NO_AUTO_UPDATE=1
```
