<!-- toc -->
# Sucklessfy

allow apps from anywhere

```shell
sudo spctl --master-disable
```

## DS.Store

remove all .DS_Store in subfolder

```shell
find . -name '.DS_Store' -type f -delete
```

## key repeat

disable alternate character and enable key repeat for `APP_NAME`

```bash
defaults write APP_NAME ApplePressAndHoldEnabled -bool false
```
