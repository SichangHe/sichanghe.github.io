ALWAYS pass in a noninteractive script as `EDITOR` for Git commands that
may open an editor to avoid getting stuck, e.g. Git-TODO or commit.
Before editing, use a script that: copies the file content to a temp file and
empties the editor file to abort Git; then read that temp file.
For actual edit, use a script that writes the exact intended content.
Existing commit messages are acceptable by default and
can be reused without asking the human.
For each conflict, figure out yourself what each side is doing, and
combine the changes in a way that preserves both functionalities.
Run focused checks after conflict resolution.
