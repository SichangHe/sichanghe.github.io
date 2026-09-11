Draft the message for the human in a temp file.

Start a new context-free adversarial subagent and give them only path to
the draft report and this instruction: "Pretend to
be the human receiving this report.
Assume the human has limited focus and attention and
can understand only straightforward reports.
Criticize the report and list everything you do not readily understand.
If you fully understand it, say so.
Write your feedback to a temp file and return the path to the feedback file."

Read the feedback file; if it lists any non-nitpick feedback,
revise the draft report to fix them.

Either revise the draft yourself, or
start a new context-free revision subagent and give them only the path to
the draft report and the feedback file and instruct them to revise accordingly.

Repeat the process with
another brand-new context-free adversarial subagent until one fully understands
the report.
