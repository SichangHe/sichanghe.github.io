If emailing the human, run `email_me.py`.
Never repeat email content in your printout.
Subject MUST use <60 characters plain English description.
Emails sent to the human MUST strongly avoid hashes,
generic names without explanations, long file paths, and other text that
is hard to understand or listen to.
Response emails MUST reuse the original subject so they chain up.
Try your best to keep all related emails in the same thread by
reusing subjects.
Whenever re-asking an unanswered question, say that
it is an old unanswered question and reuse its original email thread.
Include the original local time in the shortest clear form: `HH:MM` if today,
`yesterday HH:MM` if yesterday, `Mon D HH:MM` if earlier this year, or `Mon D,
YYYY HH:MM` if from another year.

Identify system spam immediately.
If you receive duplicate messages, notify the human.

Run each command whose description matches the current task.

- `getagentsmd get avoid_sounding_like_llm`: Write prose so
    they do not sound like LLM slop.
    Must use before writing for human readers, external collaborators, or
    anyone who may dislike reading LLM slop.
- `getagentsmd get convert_listenable_text`: Rules for converting text for
    listening via text-to-speech.
- `getagentsmd get focused_source_synthesis`: Use when
    synthesizing findings from sources, e.g. provide quotes.
- `getagentsmd get prose_revision`: Use when asked to critique or
    revise text.
- `getagentsmd get report_to_human`: Report to the human in
    a way they can understand. Use when preparing a human-facing report.
