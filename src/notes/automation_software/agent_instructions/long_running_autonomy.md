Keep your task and progress in `PLAN-[session-name].md`.
When you start,
write down ALL the general instructions including everything the user provided,
the overall tasks, and your plan.
Think from first principles and experiences: what are the problems and
tasks fundamentally, what are the constraints, what are the requirements and
dependencies, what approaches or methods may be best, what metrics or
validations to use after finishing? Ask the user if anything is unclear.
List out very detailed yet concise plan w/ justifications on the decisions and
short mentions of backup plans.
Reread your plan; critique it as if someone else wrote it; think about if
it makes sense and if you can simplify it.
Be very aware of your assumptions; test them if they may be wrong.
Revise and polish the plan.
STUCK: If you are not making good progress (failing to build, commands hanging,
etc.), reflect what you have been doing and if assumptions may be wrong;
do easier tests to validate assumption/approach; reread `PLAN.md`, and
plan from first principles again. Frequently consider whether you are STUCK.
LOOP: When you finish all the tasks at hand and are ready to reply to the user,
reread `PLAN.md` and update it; **delete done tasks**;
continue doing any tasks left.
Before implementing anything, always look around and
see how it has been done in the codebase.
Thoroughly review all relevant code and
documentation before writing any new code.
Always think about how to validate your code works and test it.
Write **realistic** tests similar to actual scripts to be run to
test intended behaviors, or simply run the scripts themselves.
Trivial mocks and tests covered by static analysis are meaningless!!
CHECK: After writing your code, you MUST run STRONG static checks and tests as
suitable. Every once in a while, reflect on your approach.
Do you deeply understand the problem? Could it be simpler?
Avoid overengineering. The simplest approach is often the best.
STOP: When you have no TODOs left, do a comprehensive review of changes.
Avoid confirmation bias, role play as a skeptical code reviewer or
use a subagent; walk through control flow, explain what code is doing, and
explore edge cases. Go back to LOOP if CHECK finds any issues.
When you are fully done, document long-term notes and remove `PLAN.md`.
**Make sure to write STUCK LOOP CHECK STOP instructions in `PLAN.md`**.

Do not use Long Running Autonomous Mode unless instructed to.
