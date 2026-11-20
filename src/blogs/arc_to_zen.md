# Moving from Arc to Zen: the Tricky Bits

(Written by agent; Steven'll come back to clean it up later.)

Arc updated itself, dropped Manifest V2, and took full uBlock Origin with it.
I moved to Zen, a Firefox fork with Arc-style Spaces.
The happy path is "click Import".
**This post records everything that was not the happy path**, on
macOS 14.4 with an M3 Pro, Arc with five profiles, and Zen 1.24.2b.

## Do not touch the app bundle

To force-install extensions, the documented Firefox way is
`distribution/policies.json` inside the app.
**On macOS, writing anything into `Zen.app` or `Firefox.app` breaks the code
signature**, and Gatekeeper then calls the app "damaged and dangerous".
`codesign --verify --deep --strict` confirms it.
Removing the file (and `xattr -cr` for stray attributes) restores
"Notarized Developer ID".

What works instead: drop the signed `.xpi` from addons.mozilla.org into
`<profile>/extensions/<addon-id>.xpi` and set
`extensions.autoDisableScopes` to `0` in `user.js`.
All of them come up active, signed, and untouched by Gatekeeper.

## Know which profile is real

I created a profile with `zen -CreateProfile`, configured it, and
Zen ignored it.
On first launch, Zen made its own `Default (release)` profile and
pinned it in `profiles.ini` under an `[Install…]` section with `Locked=1`.
**The `Default=1` flag on a profile does not win against the install lock.**
Check `profiles.ini` (or the `-profile` argument of the running process)
before writing a single pref.

## `0` does not mean unlimited

Firefox's Chromium importer caps history with
`browser.migrate.chrome.history.limit` (2000 URLs) and
`browser.migrate.history.maxAgeInDays` (180).
I set both to `0`, expecting "no limit".
**`0` means zero: zero URLs from the last zero days**, so
the reimport silently imported nothing.
Large numbers (`100000000`, `36500`) are what you want.

Even then, Zen's Arc importer brought in under a thousand more visits.
It has a cap of its own that these prefs do not reach.

## Writing history by hand

So I wrote the history into `places.sqlite` directly.
Arc's `History` is plain Chromium SQLite: `urls` plus `visits`,
timestamps in microseconds since 1601.
Firefox wants microseconds since 1970.

The catch is `moz_places.url_hash`, which Firefox computes with
a C++ SQL function that `sqlite3` does not have.
It is reimplementable:

```python
G = 0x9E3779B9
def hs(b):
    h = 0
    for c in b:
        h = ((((h << 5) | (h >> 27)) & 0xFFFFFFFF) ^ c) * G & 0xFFFFFFFF
    return h

def url_hash(url):
    b = url.encode()
    i = b.find(b":")
    prefix = hs(b[:i]) & 0xFFFF if i >= 0 else 0
    return (prefix << 32) + hs(b[:1500])
```

I checked it against every row Zen had already written; zero mismatches.
The other gotchas:

- `moz_origins` is maintained by triggers Firefox creates at runtime,
  not stored in the file, so origins must be inserted manually.
- `rev_host` is the reversed host plus a trailing dot.
- Set `frecency = -1` and `recalc_frecency = 1`;
  Firefox recomputes rankings in the background.
- `moz_historyvisits` has a `userContextId` column, so
  each Arc profile's visits can be tied to its container.

Result: 897,078 visits back to 2022.
Run it on a copy first, back up the original, and keep the browser closed.

## Cookies: decrypt, strip, convert

Zen's importer does not move cookies.
Arc's are AES-128-CBC with a key from PBKDF2-SHA1 over the
"Arc Safe Storage" Keychain password, salt `saltysalt`, 1003 rounds, and
an IV of 16 spaces.
**Since Chromium cookie DB version 24, the plaintext starts with
the SHA-256 of the host**, 32 bytes to strip before the actual value.

Firefox's `moz_cookies` then mixes units:
`expiry` is in milliseconds,
`lastAccessed` and `creationTime` in microseconds.
Container cookies go under `originAttributes = ^userContextId=N`.
Zen's Arc import had already created one container per extra Arc profile,
so the mapping was straightforward; 1,634 cookies, none undecryptable.

## Containers are not profiles

Zen imports extra Arc profiles as containers.
Containers separate cookies, site storage, and cache.
They share history, bookmarks, extensions, and saved passwords.
For me that was enough; for someone splitting work and personal identity,
it may not be.

## Cache does not move

Chromium and Gecko caches are different formats with no converter.
It is only a cache. It rebuilds.

## Extensions and their settings

Most of my extensions exist on addons.mozilla.org under the same name.
Two lessons:

- Search by name finds look-alikes.
  Check daily users and last update before trusting a match.
- Sideloaded extensions get no toolbar placement;
  they sit in Zen's overflow menu and look missing.

Extension settings live in Arc's `Local Extension Settings` and
`Sync Extension Settings` LevelDB folders.
Small stores are only in the `.log` file, which a 60-line Python parser can
read: 32 KiB blocks, 7-byte record headers, write batches of
varint-prefixed keys and values.
Writing them into Firefox's extension storage is not practical, so
I exported JSON for the extensions with an import button
(Vimium, SponsorBlock, DeArrow) and set the rest by hand.

## "Boosts" were not where I thought

Arc's `boosts` folder was empty.
The scripts I thought of as Boosts were actually in the
"User JavaScript and CSS" extension's storage, already
written as userscripts with `// ==UserScript==` headers.
They import into Violentmonkey as a zip of `.user.js` files.
The one real Arc Boost appears only as an ID; its content apparently lives on
Arc's servers.

## Things I would do differently

- Read the prefs' source before assuming `0` means unlimited.
- Find the locked profile before configuring anything.
- Never write into a signed app bundle.
- Test every database write on a copy, then compare counts.

---

*2026-11-13*
