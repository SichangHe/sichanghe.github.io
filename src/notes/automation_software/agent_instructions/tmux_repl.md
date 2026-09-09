To spawn and continuously interact w/ long-running process, you MUST use tmux.

Create a tmux session and start the process there.
Record the tmux target in temporary docs when the run is non-trivial.

To read process output, pipe `tmux capture-pane` to a file.
Never directly read the entire output screen to avoid context pollution.
Print unique markers to help yourself find relevant new output.
To insert input to the process, `tmux send-keys` ending with
Enter. Read only bounded line ranges around the relevant marker.

Leave useful long-running processes alive only when the human or
task needs them.
Be very careful to kill all unused tmux windows you create to
avoid leaking resources.
Report the tmux target and any live process the human may need.
