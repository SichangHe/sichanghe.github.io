# VSCodium

*2022-04-04*

I switched from Visual Studio Code (VSCode) to VSCodium.

I am writing this text using VSCodium.

## the reason to switch

This may be a weird reason,
but I switched from VSCode to VSCodium because of performance.

### the problem with VSCode

I was happy using VSCode.
However, Saa told me VSCode was resource-intensive.
She said her Lenovo laptop fans ramped up as soon as she opened VSCode.

Being on an M1 MacBook Pro,
I have never experienced ramping fans.
However, I did experience warm keyboard when I browsed the web
with VSCode in the background,
but I blamed it on the external monitor and too many browser tabs.
I checked Activity Monitor,
Visual Studio Code.app seemed to be using very little CPU and memory,
but there were also several "renderers" using as many resources,
and they combined to above 1GB of memory and 1% or 2% CPU.

After some searching about VSCode being resource-heavy,
I found out that VSCode uses Electron,
which uses a Chromium engine to render everything,
which means VSCode is essentially just an app running in its bundled browser.
It turned out Electron used about 2% CPU and half a Gig of memory.

Using a browser at its core guarantees
that VSCode is sure to be as resource-heavy as any browsers.
Thus, it is fundamentally flawed.

### searching for an alternative

I spent some time looking for other text editors.

Sublime Text seems to be the most popular alternative,
however, it is strictly proprietary,
and I caught words that you need to buy it and join its developer version
to get the latest version and support.
Atom is automatically excluded from the possibilities
because it started this "mini-browser app" shenanigan in the first place.

Neovim is a "pure," performant text editor.
I actually tried VimR and Neovide.
They provide something far from a drop-in replacement to VSCode, though.
I imagine I would need to spend days configuring everything.

Then, I read about VSCodium.
I learned that although the VSCode project is open source under the MIT license,
the Visual Studio Code app Microsoft ships is built
using Microsoft's custom configuration with their telemetry.
This reminds me of how bloated Windows's are…
I decided that switching to VSCodium will probably disable a lot of trash processes
Microsoft forces me to run when using VSCode.
And it would make a drop-in replacement.

## installation via Homebrew

Brainlessly, I ran this to install VSCodium:

```shell
brew install vscodium
```

I sim-linked `~/.vscode-oss` to `~/.vscode`
and `~/Library/Application Support/VSCodium` to `~/Library/Application Support/Code`.
I also deleted everything that I don't recognize as my configuration file nor extensions.

Upon opening, VSCodium was glitchy.
It opened deathly slowly and was far from as responsive as VSCode.
I was wondering whether that was because of some magical configuration
Microsoft does when they build VSCode.
But, I soon recognized bigger problems.

### the extension problem with VSCodium

Right out of the box,
Remote SSH does not work anymore.
I uninstalled it and tried to reinstall it from the marketplace,
but it turned out that VSCodium uses an open-source marketplace
instead of the one VSCode uses.
This marketplace does not have anything from Microsoft.
Installing the extension from a file downloaded using the browser
show it in the list of installed extensions,
but it still does not work.
It turned out that Remote SSH is strictly proprietary
and only works on Microsoft's Visual Studio Code build.

After some fiddling around,
I found SSHFS works pretty nicely.
It has all the features Remote SSH has,
and it allows you to save the password of the remote users',
and to enable it only at certain workspaces
instead of forcing you to enable it globally.
It actually seems better than what Microsoft offers.
I wonder why there are so few downloads.

I also followed the instruction from VSCodium's GitHub to
enable VSCode's marketplace by adding a `product.json`.
This change broke the Python extension and did not give me the VSCode marketplace.

I can tell easily that the VSCodium marketplace has way fewer extensions available,
but I guess as long as the extensions I need are not "Visual-Studio-Code-only,"
I can just install them via the browser and some commands.

### performance and macOS ARM support

Why is VSCodium so slow?
Why? Why on earth?

I opened Activity Monitor and found that it is "Intel"
—the app from Homebrew works via Rosetta translation…

I immediately went and searched for a macOS ARM build.
I saw a GitHub issue,
where they discussed not being able to build VSCodium for MacOS ARM
because the GitHub CI did not have a macOS ARM worker option.
It turns out that they have not figured it out yet by now.

However, there is a guy that has an M1 Mac Mini,
and they built MacOS ARM binaries and released up-to-date versions on GitHub.
I downloaded their build and it works nicely.
I checked Activity Monitor,
VSCodium seems to use much fewer resources
than VSCode while still using quite a lot…
