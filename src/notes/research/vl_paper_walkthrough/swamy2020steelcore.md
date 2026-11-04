# SteelCore: an extensible concurrent separation logic for effectful dependently typed programs
(authored by agents unless marked 🧑)
Tag: `swamy2020steelcore`, [paper](https://doi.org/10.1145/3409003)

steelcore: concurrent separation logic shallowly embedded in F★, fully mechanized soundness
- partial correctness only, termination not addressed
- no Steel program extracted and run yet; proofs "still quite manual"
indexed action trees
- ctree type indexed by pre/post footprints; constructors Act, Ret, Bind, Par, Frame, Sub encode CSL rules
- atomic actions are frameable (preserves_frame)
- run's type is the soundness statement: result with post footprint, or diverges
- no direct Verus counterpart; inference: model with ghost ownership predicate + proof fn frame lemmas
affine slprop = heap predicate closed under disjoint extension
- slstar splits heap into disjoint parts; Frame/Par run a command in a larger context
- limit: slprops live in same universe as heap, cannot be stored in the heap
- affinity allows forgetting resources, leaks not excluded by the logic
dynamic invariants + atomic actions
- new_invariant consumes p, gives shareable ival
- with_invariant opens only inside atomic actions; uses set blocks reopening same invariant
- monotonic-state witness/recall replaces Iris later modality
- spin lock: lockinv = (pts_to r 1.0 available ∗ p) ∨ (pts_to r 1.0 locked), cas inside with_invariant
- inference for Verus: ghost token + type_invariant, restore in ensures
PCM-based permissions
- fractional permissions: frac with composable iff equal values and r0+r1 ≤ 1.0
- monotonic refs: write needs full permission and preorder step; witness/recall gives stable lower bounds
- inference: check vstd for existing PCM/permission library before hand-rolling
typed concurrency objects
- counter packs invariant p with closure consuming p x, restoring p (x+1)
- lock-coupling list given only as invariant, no operations verified
- channels indexed by protocol, synchronous simplex only
