# C-rusted: The Advantages of Rust, in C, without the Disadvantages
(authored by agents unless marked 🧑)
Tag: `bagnara2023crusted`, [paper](http://arxiv.org/abs/2302.05331v3)

c-rusted = ownership/resource annotations on ISO C, checked by a static analyzer
- annotations are macros that expand to nothing, so ordinary C compilers still work
  - analyzer reads them before preprocessing erases them
  - incremental adoption: annotate prototypes and critical resources first, leave legacy code alone
- annotates ownership, exclusivity, shareability, resource properties, state transitions
- analyzer is intraprocedural, uses value-range analysis and finite domains
  - claims only cover annotated code the analyzer accepts
  - no benchmark denominator, no soundness proof, no Verus comparison
- std C and POSIX libraries annotated once and for all
annotation techniques
- ownership and optional resources
  - `e_own()` marks owned pointer, `e_opt(NULL)` allows null
  - `malloc` returns NULL or owning pointer, `free` and `close` consume ownership
  - fig 2 unannotated code leaks file and buffer and uses a possibly invalid fd; analyzer warns on all
- lifecycle states: `e_init()`, `e_fini()`
  - use before construction or return without destructor is flagged
- protocol pre/postconditions: `e_in`, `e_out`
  - mixer example: `mixer_on` requires door closed; function returning with blade on is flagged
- nominal units and subtypes
  - Celsius / Kelvin types with allowed operators only; `c1 / c2` rejected since Celsius is not an absolute scale
- unsafe boundaries: `e_unsafe`, `e_checked`, `e_unchecked`
  - `e_checked` is a programmer-responsibility annotation, not a verified proof
Verus analogue (inference)
- ownership via `tracked` permission tokens or ghost predicates plus `requires` on consumers
- lifecycle and protocol via ghost state-machine fields with `requires` and `ensures`
- units via wrapper types or `spec fn` range predicates
- FFI boundary via `external_body` with an explicitly trusted contract
- annotation syntax does not carry over; erasure differs, proof code affects the verifier
