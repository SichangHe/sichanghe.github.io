# Taming stateful computations in Rust with typestates
(authored by agents unless marked 🧑)
Tag: `duarte2022taming`, [paper](https://doi.org/10.1016/j.cola.2022.101154)

typestate macro for Rust apis
- `#[typestate]` attribute macro embeds a typestate dsl
  - states are structs, transitions are consuming trait methods, so rustc rejects wrong call order
  - macro only checks the automaton graph: every state productive and reachable
  - transition enforcement left to the rust compiler
- non-deterministic outcomes via enum return + match
  - cross-automaton constraints by nesting a typed state object in another state
- exports dot/plantuml/mermaid graphs for design review
evidence is weak
- only toy examples (light bulb, ring, auction), no benchmark, no soundness theorem
- generics and lifetimes mostly unsupported (0.9.0-rc2)
for verus
- inference: use zero-sized state types `S<Off>`/`S<On>`; typestate catches call-order bugs before proof search
  - verus contracts still needed for data invariants and method semantics
  - a wrong automaton spec makes an incorrect protocol look valid
