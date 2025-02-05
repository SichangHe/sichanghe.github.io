# Recovering Files on Exxact

I wanted to delete two empty log files, so I selected them in
the NeoTree file explorer in Neovim, and pressed `d` for "delete" and `y` for
"yes".
It lagged for a while, then, to my horror, only one folder was shown in
the file explorer.

"This must be a display glitch," I thought, but running `ls` confirmed that
everything is deleted except the file Chromium was writing to.
That is, data collected in roughly a month are all gone.

Since Exxact is a server, I asked Haodong if it had any backups.
The answer was negative.
Haodong suggested I run some recovery tools, reasoning that
the file system should have only marked the file content on the disk as
unused rather than zeroing them out.

I asked Perplexity and it first found Testdisk, but I tried it and
it showed no files to undelete.
I though I was using the TUI wrong, so I asked ChatGPT how to use it and
was advised to use Extundelete instead, but it also did nothing,
even after unmounting the disk:

```sh
% sudo extundelete /dev/nvme0n1 --restore-all
NOTICE: Extended attributes are not restored.
WARNING: EXT3_FEATURE_INCOMPAT_RECOVER is set.
The partition should be unmounted to undelete any files without further data loss.
If the partition is not currently mounted, this message indicates 
it was improperly unmounted, and you should run fsck before continuing.
If you decide to continue, extundelete may overwrite some of the deleted
files and make recovering those files impossible.  You should unmount the
file system and check it with fsck before using extundelete.
Would you like to continue? (y/n)
n
% sudo umount /dev/nvme0n1
% sudo extundelete /dev/nvme0n1 --restore-all
NOTICE: Extended attributes are not restored.
Loading filesystem metadata ... 28616 groups loaded.
Loading journal descriptors ... 0 descriptors loaded.
Searching for recoverable inodes in directory / ... 
0 recoverable inodes found.
Looking through the directory structure for deleted files ... 
0 recoverable inodes still lost.
No files were undeleted.
% sudo fsck -f /dev/nvme0n1
fsck from util-linux 2.34
e2fsck 1.45.5 (07-Jan-2020)
Pass 1: Checking inodes, blocks, and sizes
Pass 2: Checking directory structure
Pass 3: Checking directory connectivity
Pass 4: Checking reference counts
Pass 5: Checking group summary information
ssd1: 27/234422272 files (3.7% non-contiguous), 15003479/937684566 blocks
% sudo extundelete /dev/nvme0n1 --restore-all
NOTICE: Extended attributes are not restored.
Loading filesystem metadata ... 28616 groups loaded.
Loading journal descriptors ... 0 descriptors loaded.
Searching for recoverable inodes in directory / ... 
0 recoverable inodes found.
Looking through the directory structure for deleted files ... 
0 recoverable inodes still lost.
No files were undeleted.
```

I then followed suggestions from Testdisk and ChatGPT to try PhotoRec, which
did recover 251591 files, but with all the file paths missing and
made-up names.

I tried Ext4magic, but it also did produce recovery with file paths:

```sh
% sudo debugfs -R "dump <8> /hdd1/nvme0n1.journal" /dev/nvme0n1
% cd /hdd1
% du -sh nvme0n1.journal 
1.1G	nvme0n1.journal
% sudo apt-get install ext4magic
% sudo ext4magic -M -j /hdd1/nvme0n1.journal -d /hdd1/DeGenTWeb_recovery/ /dev/nvme0n1
```

I now have a bunch of files I do not know where they belonged.
Since I point to file paths in my database, these files are not very useful…

While I [reported this bug to
NeoTree](https://github.com/nvim-neo-tree/neo-tree.nvim/issues/1682),
I found more issues where people lost their whole work directory.
I should not have trusted NeoTree for deleting files.
