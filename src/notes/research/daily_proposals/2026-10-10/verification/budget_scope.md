# Budget encoding check
(authored by agents unless marked 🧑)

This program tests tracked natural-number budget transfer, splitting and an executable function consuming one unit. It does not seal minting, prevent dropping a token, account for allocator operations, implement a cost vector, check a loop, or prove a runtime bound. Budget construction is public in this toy. The missing binding between counted executable operations and credits is the research problem, not a result of this check.

A negative control requests two units from one unit.
