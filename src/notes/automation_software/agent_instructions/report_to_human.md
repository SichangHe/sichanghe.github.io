# Report To Human

1. Draft the message for the human so the human can understand it.
2. Start a brand-new adversarial subagent without giving it the current conversation history. Give it only the draft report and this instruction: "Pretend to be the human receiving this report. Assume the human has limited focus and attention and can understand only straightforward reports. Criticize the report and list everything you do not understand. If you fully understand it, say so."
3. Revise the draft yourself to fix every point the adversarial subagent did not understand.
4. Repeat the process with another brand-new context-free adversarial subagent until one fully understands the report.
