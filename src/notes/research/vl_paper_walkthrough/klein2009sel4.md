# seL4: Formal verification of an OS kernel
(authored by agents unless marked 🧑)
Tag: `klein2009sel4`, [paper](https://doi.org/10.1145/1629575.1629596)

machine-checked refinement proof: abstract spec -> executable spec -> C of seL4 (8,700 C + 600 asm lines)
- proves functional correctness incl. safety, over all user behaviors (fully nondeterministic user model)
- trusted: compiler, assembly, boot code, caches, hardware
  - ARMv6 only, ~1.2 kLOC boot code unproved
  - access-control model proved separately, not linked to refinement
  - proof does not show the spec matches what the user expects
- verus: must state assumptions on asm, compiler, hardware, boot explicitly
prototype-led layering
- haskell prototype between design and proof
  - runs on hardware simulator, translated to Isabelle/HOL as executable spec, C written by hand
  - translator need not be trusted: assurance targets generated defs and C
- cost: 1st refinement 8 person-years, 2nd <3
  - authors: haskell detour was "a significant net cost saver"
- verus form: executable rust, `spec fn` model, proof fns tying them
forward-simulation refinement
- every concrete transition has an abstract transition preserving relation R
  - layers compose by transitivity
- abstract spec uses controlled nondeterminism, e.g. scheduler picks any runnable thread
  - executable layer determinizes it (priority queues, round robin)
- verus form: `spec fn` relation, transition lemmas with `ensures`, existential postconditions for choice
invariants carry the proof
- >150 invariants proved, ~80% of properties are invariant preservation
  - 4 kinds: memory, typing, data structure, algorithmic
  - refinement statements ≤20% of effort per stage
- temporarily broken invariants restored before syscall return or interrupt point
- verus form: rust ownership discharges aliasing only, semantic invariants stay explicit predicates
verification-friendly concurrency
- event-based kernel, single stack, interrupts mostly off, polling at set points
  - avoids verifying yield
- preemptible destruction stores progress in a zombie capability
