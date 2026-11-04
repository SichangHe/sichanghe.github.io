# Automatic Function Annotations for Hoare Logic
(authored by agents unless marked 🧑)
Tag: `matichuk2012automatic`, [paper](https://doi.org/10.4204/EPTCS.102.6)

problem: intermediate facts proved for one property are lost, so later properties on the same function redo them
- fix: store intermediate assertions as a function annotation, derived from an existing Hoare proof
  - Isabelle/HOL, monadic Hoare logic, tested on experimental seL4 branch
- annotation = assertions at each step + failure flag, no change to executable semantics
annotated triples
- `kPk F kQk`: for states satisfying P where F doesn't fail, outcomes satisfy Q
- later proofs assume F's intermediate assertions instead of reproving them
  - example: valid-free-except i during new-tcb init supports the valid-queues proof
- soundness rule turns an annotated triple back into an ordinary one, given adherence `{|P|} f {|Q|} ⟨F⟩`
merging
- `F ⊲⊳ G`: one computation, failure flags OR'd, so assertions conjoin
- needs combined precondition P ∧ Q
automatic collection
- weakest-precondition VCG split rule saves each computed precondition as an annotation
- start from schematic `?L`, Isabelle instantiates it after the proof
evidence: one seL4 function (invoke-untyped), line counts only
- 300-line proof, ~5 lines to reformulate precondition, 40 lines of manual annotation edits
- integrity/authority 192 → 56 lines, confidentiality 215 → 39, total 407 → 95
- still needs manual effort, recursion and inductive maps left as future work
inference for Verus
- pass proved lemmas as requires to later proof fns, no implicit annotation state
