# Towards Trustworthy Automated Program Verifiers: Formally Validating Translations into an Intermediate Verification Language (extended version)
(authored by agents unless marked 🧑)
Tag: `parthasarathy2024trustworthy`, [paper](https://arxiv.org/abs/2404.03614)

trust gap: a wrong front-end translation to an IVL undermines verified results
- fix: instrument the existing Viper-to-Boogie translator to emit an Isabelle proof per run
  - proof: Boogie program correct implies Viper program correct, for a supported Viper subset
  - checkable independently
- covers the front end only, not the Boogie back end, SMT solver, compiler or runtime
- assumes formal semantics for both languages and a trusted proof checker
- paper does not use Verus; Verus mapping is inference

forward simulation gives soundness
- every failing source execution is simulated only by failing target executions
  - so target correctness implies source correctness
- recipe: formal semantics for both, input/output state relations, generic sim judgment, prove success and failure simulation
  - compose statement-level simulations into method-level then program-level theorems

decompose into semantic effects
- split one construct into effects, each with its own simulation
  - e.g. Viper exhale = permission-removal check (remcheck) + nondeterministic assignment
- generic composition lemmas proved once, reused across translations
  - sequential composition, separating conjunction, conditionals, stuttering target steps
- keeps obligations local and the translator easier to change
- only some alternative encodings validated; not all optimizations covered
