# Sucklessfy

allow apps from anywhere

```sh
sudo spctl --master-disable
```

## DS.Store

remove all .DS_Store in subfolder

```sh
find . -name '.DS_Store' -type f -delete
```

## key repeat

disable alternate character and enable key repeat for `APP_NAME`

```sh
defaults write APP_NAME ApplePressAndHoldEnabled -bool false
```

## disable bloat daemon


```sh
cd /System/Library/LaunchDaemons
sudo launchctl unload com.apple.mobile.softwareupdated.plist
```
