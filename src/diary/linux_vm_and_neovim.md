# Linux VM And Neovim

20220806

After a long time,
I decided that I should write something again.
I've been sick multiple times during the months since coming back to Canton.
I highly doubt that the pathogen density here is much higher than in Kunshan.
Despite that,
I have actually done quite a lot of stuff recently.

## Linux VM on M1 MBP

After fiddling with qemu and virt-manager on my M1 MBP,
I gave up and went back to Parallels Desktop.

### virt-manager and qemu

I used virt-manager with qemu on Arch Linux and Ubuntu Linux.
On M1 MBP, though, KVM does not exist,
and virt-manager cannot connect to hvf in my experience.
Therefore, I was merely using qemu's emulation and the performance was dreadful.

### Parallels Desktop

Having met obstacles using virt-manager,
I decided to try out Parallels Desktop again.

The problem was how to get it.

At first,
I searched for the good old Russian TNT.
The search took a long time and the results were diminishing.
I then looked for Chinese cracks.

All of the Chinese cracks use PD runner,
which I knew about and also tried.
Basically, it is a standalone program that calls functions from Parallels Despite
to launch VMs after the trail period has ended.
Some sites even sell PD runner for quite an amount of money.

I don't like the idea of getting a caller program somewhere randomly on the internet
and using it just to launch an official program.
I remembered vaguely that this thing was leaked from GitHub.
And, that was the right place to search for it.
The program was hidden behind a non-default branch for some reason,
but I managed to download it.

I simply got Parallels Desktop from their official website.
It turned out later that the PD runner from GitHub works just fine.
Now, the problem became which distro I should use.

### The distro for the VM

A big thing about Linux distros is that no all of them support ARM that well.
It also come with the actual reason why I need a Linux VM.
There are certain tools,
such as valgrind,
that cannot be used on macOS.
And, I want to be able to get my hands on some of them.
Because that's the reason,
I decided that compatibility is the top requirement.
Therefore, Alpine, which is very lightweight and "suckless,"
is excluded from my choices.
I use Arch Linux for my other laptop,
but I believe ARM is not a first class support for them.
It usually comes to Ubuntu as the choice for such VMs.
But, I dislike distros like Ubuntu because they fiddle on the original repos
(like Debian's repos)
and produce what effectively is a Frankenstein of repos.

Their base, Debian is good though,
but Debian stable provides packages that are on average one or two years old.
Luckily, I recently got to know that Debian testing is actually very usable.
It is also a rolling-release distro.
It seems like a very good choice for development
which is what I would do on the VM anyways.

### Installing the VM

I grabbed a weekly build ISO and installed it as a Parallels Desktop VM.
The first time, I got it wrong.
I used TUI install, partitioned the drive,
gave it 100MB for the boot partition and the rest for the home partition.
At the end of the installation I selected "install system utilities"
and did not install any desktop environments.
As the installation process proceeds,
I was watching the virtual disk growing larger and larger in size on Finder.
It grew from under 1G to over 2.5G.

I wanted a minimum installation, and that was not.
I deleted the VM and tried a second time.
This time, I did not select anything to preinstall during the installation process.
However, I made another mistake.
At the end of the installation,
it prompted me to remove the installation media,
which I did later by deleting the ISO.
What happened was, it said that the VM did not have any OS installed!
I reconnected the ISO and booted into rescue mode,
but I didn't know what to do to rescue it.
So, I installed it again on the same virtual disk.

Upon fresh install, the VM was about 2G, which makes me happy.
However, I tried to install packages using sudo and found out that sudo wasn't installed.
So, I used su to install doas
because I heard that doas is smaller and simpler to use.
I began to understand why people just stick to Ubuntu.
Most people would not be able to handle this.
They would just go online
and type in whatever command they see in a guide to install something.
And, the guide would most certainly tell they to sudo.
I installed both clang and GCC and both of them are about 0.5G,
therefore the VM grew much bigger.
It was still much smaller than it could be if I were to install a desktop environment.
My previous VMs took around 5G to 7G even without the compilers.

I decided that I want to stick with the terminal for this VM.
So, the text editor choice would naturally be Neovim.

## Neovim

My main text editor is Code - Insiders at the moment.
The reason why I switched from VSCodium was
that the fantastic Pylance extension would only run on Microsoft's builds.
Also, the insider build is slightly faster in my experience.
I also tried Emacs, but ended up not using it.
That would be for another story.
Previously, I was using SpaceVim, which is a Vim distribution.
It has numerous plugins built-in and supports various languages out of the box.
The problem though, is that it is large and hard to install.
The installation depends on GitHub connection,
but my VM is not guaranteed to have that.
I decided to go vanilla on the VM.
But, at the same time,
I want to go full vanilla Neovim because that is how I can learn.

I went ahead and read the neovim-lua guide on GitHub,
and added the configurations I want to my pure-Lua config files.
To keep things small,
I found a theme on GitHub based on One Light and copied it to my repo.

After all that was done,
I was pretty happy about my Neovim setup on the VM.
But, I was less happy about my Neovim setup on my Mac.
I tried to port my configurations to the macOS side
but apparently those conflict with SpaceVim settings.
I finally decided to ditch SpaceVim,
which also meant that I would need to have my own plugin manager.
I landed on dein for its lazy-loading features for performance.
It took two days to fiddle my Neovim setup and learn Lua.
After using some language servers,
I concluded that Neovim cannot replace VSCode for me.
It is much more convenient to open up a file instantly from terminal with Neovim.
But, it lacks features like toggling comments on keyboard shortcuts.
Although one could probably configure Neovim to do all that,
it take quite a amount of time.
Also, the way VSCode is used is that you start it and let it stay,
therefore, you get much faster startup speed when you open another file.
But, you start and close Neovim frequently,
and each time, the language server or whatever extensions you have loads for a while.

### Lua

However, I am largely happy about how the configurations turned out.
I got to fiddle with Lua,
which is a different beast than the other scripting languages I used.
Lua's performance is simply fantastic while it sucks at not having arrays.
It also took me a while to learn Lua's custom Regex.
After gaining some familiarity with Lua,
I decided to write the yabai helper in Lua.
The helper takes the information about all of the windows in the current space
and calculates the next window to switch to.
In this way,
I managed to let yabai switch window in a circular fashion,
including the windows yabai does not manage.
