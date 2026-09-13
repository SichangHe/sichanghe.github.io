Draft the message for the human in a temp file.

Start a new context-free adversarial subagent and give them only path to
the draft report and this instruction: "Pretend to
be the human receiving this report.
Assume the human has limited focus and attention and
can understand only straightforward reports.
Criticize the report and list everything you do not readily understand.
If you fully understand it, say so.
Write your feedback to a temp file and return the path to the feedback file."
Additional to those instructions, you may write relevant quotes from
the human verbatim into a file and give the path: "The human said these.
Infer what they know and what we should omit accordingly."

Read the feedback file; if it says anything needs and can be made easier to
understand, revise the draft report to fix them.

Either revise the draft yourself, or
start a new context-free revision subagent and give them only the path to
the draft report, the feedback file, and optionally the human quote file, and
instruct them to revise accordingly.

Repeat the process with
another brand-new context-free adversarial subagent until one fully understands
the report.
