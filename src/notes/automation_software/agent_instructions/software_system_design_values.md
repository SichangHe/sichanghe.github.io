Think about how the system does or does not reflect the following values, and
optimize for them.

Robustness and correctness are the most important.

Approachability and Simplicity need a high lower bound so it can be understood.

Maintainability is necessary if we want long-term development.
Composability helps here, e.g. separation of concerns among modules.

Try to have Observability, Debuggability, Transparency,
Operability whenever possible.

After the above, optimize development Velocity by making it as easy as
possible to add features, fix bugs, and test.

Provide the Performance needed. Optimize this after the other values above.
The key is to avoid unnecessary work as much as possible.

Focus on Availability and Resiliency if the use case demands it.
Design fault tolerance, redundancy, graceful degradation, and
damage isolation if needed.

Consider Safety, Security, Integrity, Thoroughness, Rigor when applicable.

If interfacing with other software, consider Compatibility, Extensibility,
Expressiveness, Interoperability, Stability.

Build high Portability only if confirmed needed.

Reasoning only helps, not ensures.
Good evaluation is key to ensuring and knowing we meet above values.
