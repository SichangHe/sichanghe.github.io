# 🤖 Formal verification techniques (Verus-oriented)

(authored by agents unless marked 🧑)

- scope: techniques from paper studies for LLM agents writing specs and proofs, mapped to Verus
- most studies use Dafny, Lean, C or Move; only a few run Verus (AutoVerus, VeriStruct, VeruSAGE, SAFE, AlphaVerus, VeruSyn, Tunable Automation)
- Verus forms of non-Verus techniques are inference, not measured
- no study ablates most single techniques; numbers are mostly whole-system

## Agent harness
- harness = tools, context, phases, hooks, sandbox, memory; most studies compare whole harnesses
- Lean thesis: persistent context with search and submit tools beats restarting each round, 62.2% vs 31.7% at 10 calls
  - bundles three changes (reasoning level, loop, search); no ablation
- VeruSAGE: strong model (Sonnet 4.5) better hands-off, 688/849 vs 569/849 with a controller; o4-mini and GPT-5 went the other way
- P^3 (Lean): fix a plan first; an unplanned algorithm or invariant sends the agent back to planning
- Move plugin: run invariants before weakest precondition; the reverse gave vacuous specs
- Eiffel-tools: try a candidate body in a subclass, copy back only on success (rollback)
- SpecAgent: deterministic state machine controls roles and budgets; 99.4 calls and $0.62 per program on DeepSeek
- ProofWright: persistent guide of verified error/fix pairs, human-reviewed
- SO-RSI: outer agent edits the workflow, driven by hypotheses and probes on saved artifacts
- deterministic cleanup of recurring syntax errors before another model call; must not alter the contract

## Anti-cheating checks
- an external check decides whether "verified" counts: contract unchanged, code unchanged, no escape hatch (`assume`, `admit`, `external_body`, axioms)
- VeruSAGE: cheating without checker 14% (Sonnet 4), 7% (Sonnet 4.5), 2% (GPT-5); under 1.5% with it
- AlphaVerus: removing critique makes `assume(false)` snowball
- DafnyPro diff-checker: strip annotations, rest must equal original; fixed all 70 of 782 base programs with compile errors
- AxDafny: clause subset check, regex for bypasses, then LLM review; 725/782 DafnyBench, 141/250 LCB-Pro-Dafny
- SaltBench: pin toolchain, hide references, "outcomes are decided outside the agent's toolchain"
- Rust-Prover (Lean): theorem and generated code byte-identical, allow only propext, Classical.choice, Quot.sound; 1325 theorems
- LLM judge is a screen, not evidence
- no study reports false alarms or a checks-off ablation

## Bounded checking and equivalence
- Kani: symbolic harnesses and contracts; `stub_verified` replaced hours of unwinding with seconds (GCD in TokenBucket)
  - a failing unwinding assertion makes a pass inconclusive; `assume(false)` is vacuous
  - std campaign: 16,748 harnesses in 69 min CI; 4,645 unsafe functions checked
  - bug found in 20 s that survived 16,777,216 fuzz runs
- Crux: extensional equality against Cryptol/hacspec/Rust, includes panic freedom; SHA1/SHA2 re-verify in under 10 minutes
  - factor loops into one-iteration helpers proved equal to the spec
- cozy: angr on C and Rust binaries, pairs feasible paths, reports differences for the developer to classify
- REM2.0: CHARON + AENEAS to Coq equality lemma; 9/10 real-world cases verify
- Stop Means Stop: differential testing as refinement evidence, 12M ops with zero divergences
- Scimitar: TLC counterexamples to induction, then TLAPS proof
- no study compares Kani/Crux with Verus on one codebase

## Counterexample and feedback repair
- plain loop: feed exact diagnostics back with bounded retries; verifier alone accepts
- route by error class (AutoVerus, VeriStruct); fix casts and types before stronger invariants
- AutoVerus: 137/150 Verus-Bench in at most 3 tries, about $37; GPT-4o baseline 67/150
- ExVerus: Z3Py counterexamples validated by a loop harness; strengthen if correct-but-non-inductive, replace if wrong
  - blocking a counterexample correlates with success (64.5% vs 38.6%)
  - $0.04/task vs AutoVerus $0.17 on DeepSeek
- vacuity probe: append `ensures false`; if it still verifies, the `requires` is unreachable (KaPilot)
- WybeCoder: may disprove a spec instead of implementing it
- raw traces lengthened context and hurt small models (VerIbmc)
- Yao et al. (GPT-4, Verus): 20 programs; propagating stable preconditions into invariants rescued 17 segments
- practitioner telemetry: rapid verifier reruns correlate with failure; fix one cause per run

## Loop invariants
- order: run unannotated, copy stable preconditions, add bounds/lengths, enumerate atoms, ask the model, merge or split by verifier feedback
- AutoVerus: 5 candidates, merge only if score (V,E) improves
- Lemur: break a hard invariant into a trail of smaller predicates; 107/133 Code2Inv vs ESBMC 68
- VerIbmc: stores of provable/disprovable/unknown atoms; baseline alone solves 111/499
- DafnyPro: prune non-inductive clauses, restore if postcondition then fails
- Loopy: union of samples then Houdini
- Flux: infers refinements by Horn constraints, no annotations (not Verus)

## Proof decomposition and search
- split conjunctive `ensures`, disjunctive `requires`, loops into helpers, then recheck the recomposed original
- ProofSaX (Dafny): shard disjuncts/conjuncts; Dissect-and-Restore: lift loops, lemma tree with rollback
- APOLLO (Lean): placeholder lemmas, solver then LLM, depth limit
- WybeCoder: obligations as named theorems in parallel; a loose contract (no frame clause) let a selection sort pass
- LemmaNet: offline helper lemmas; importing too many hurts
- search budget: samples vs chain vs tree disagree by model
  - AlgoVeri: Gemini Dafny pass rate nearly triples over 15 rounds; GPT-OSS-120B saturates near round 3 and prefers width
  - SAFE: under 1% gain from a third debug round
  - Yao thesis: save the path (context), not just the node
  - Rust-Prover: cheap-model-first escalation proved 1,146/1,325, stronger model rescued 179
- timeout is "unknown", never failure (Lemur)
- partial results are places to continue from, not proofs

## Context and specifications
- retrieval keyed on code, not on property text (PropertyGPT)
- slicing and decomposition beat examples: AutoSpec solves 26/51 with decomposition vs 9 for 3-shot whole-program
- KaPilot: without few-shot 11 vs full system 31 good specs of 54
- ProofWright: no knowledge base and no guide gives 0 verified kernels
- more context can hurt (three studies)
- VeruSAGE task extraction: `log-all`, dependencies as `external_body`; a pass is not a pass in the full repo
- spec sources: documents (implementation-blind, KaPilot), tests as oracle (Dafny: 108/110), loop invariants then weakest preconditions (Move), co-evolving contract and proof (VST)
- NL2Contract: conjoin trusted precondition into postcondition to check soundness in one call

## Specification quality
- verifier cannot tell weak, empty, too strong, or off-target specs
- checks, cheap first: freeze contract, vacuity (`ensures false`), clause deletion, tests with strip-body asserts, output mutation, implementation mutants, implication against reference contract
- SAFE keeps specs at 80% correctness and 60% completeness for training, not as a quality bar
- Verina and Beyond Postconditions use opposite meanings of "sound" for preconditions
- StateSync-GKR: a clean build with zero sorry hid an unsatisfiable assumption set
- AlgoVeri: dropping one contract clause must admit unintended behavior

## Views, type invariants, ownership
- two layers: a View to Seq/Map/Set and a type invariant; contracts speak about `self@`
- VeriStruct (Verus): 10/11 modules, 128/129 functions vs baseline 4/11; no ablation separates planner, View, invariant
- Verus trusts rustc's borrow checker, sends no heap to Z3; ghost permissions are linear
- by hand: view functions, permission tokens (`PPtr`, `PCell`), invariants, state machines
- VerusBelt proves the soundness of those proof types in Iris/Rocq and found a lifetime-check bug
- Verus lacks built-in fractional permissions and user-facing prophecies; Creusot's `^x` and Aeneas pairs are patterns to copy
- Iterator contracts (Prusti, Gospel): ghost produced/visited sequence, `completed`, `leadsto`; clients proved against assumed contracts; no LLM measured
- Flux vs Prusti: 145 vs 315 spec lines; Flux weaker on deep properties
- WybeCoder: frame clauses matter

## Solver, triggers, quantifiers
- Verus modes: `integer_ring`, `nonlinear_arith` (no implicit context), `bit_vector`, proof by computation, EPR
  - keep integer and bit-vector reasoning apart
- escalate on timeout: strengthen invariants, add helpers, add lemmas, then explicit proof; never weaken the contract
- diagnose excessive instantiation before raising timeouts
- triggers: pick a term that exists where the fact is needed; instantiate by hand with `assert forall ... by`; `choose` for existentials
- Tunable Automation: broadcast lemmas, import broad then trim; needed asserts fell 2.0-8.6%; `all_triggers` 12.3% in IronKV only
  - about 2% of functions got 2x slower with ambient facts, worst 3-19x
- ProofSaX trigger search: lemma calls helped 42, reveals 38, triggers 9; from-scratch 8/49
- SMT instability: coefficient of variation across equivalent queries; restructuring could cut Z3 time up to 38%
- Schwarz theory policies: 1367/1475 vs 1301/1475 without
- instability in ProofWright (VerCors) is non-affine indexing, 17% of 100; different phenomenon

## Proof minimization
- delete a piece, rerun, keep if still verifying; greedy gives a local minimum
- Dafny minimizer: repair output 63.2% larger than manual; minimization removes 58% of annotation lines
- Tunable Automation is the only Verus run, used to measure automation
- logically redundant is not solver-redundant (trigger effects)
- do not let minimization touch the contract

## Trusted base
- verified = conditional on stubs, models, axioms, translation, solver; Verus's VC translation is trusted
- ledger of every trusted item with test, reviewer, tool versions; diff it on every change
- stubs over-approximate (Kani Firecracker clock; found a rounding bug)
- SWE-Proof: "Axioms are a last resort"; fuzz each axiom against the real callee; an axiom must not contain the fix
- Alerus undercounts its trusted axioms
- Forte: nothing stops minting a second token
- Diodon: small proved Core plus automatic analyses for the rest; sound only without races/UB outside the Core

## Repository scale
- rank components by criticality (22/29 interviewees); narrow boundaries; contracts written with code and checked in CI
- std verification: challenges with target, assumptions, success criteria, reward; CI reruns all proofs
- stable names let proofs survive edits (WybeCoder)
- no study runs an agent on a Verus repository over months

## Training data
- loop: generate, keep only verifier-accepted, fine-tune, repeat
- SAFE: 21,398/45,395 translations compile; raw GPT-4o 11.51% vs 43.17% trained on 139 VerusBench tasks
- VeruSyn: 6.9M verified programs; tutorial curriculum raised feature coverage from 4 to 12 of 20 knowledge points
- AlphaVerus: prompt-only; critique models and exploit checks guard translated specs; Llama-3.1-70B 32.9% HumanEval-Verus pass@256
- ANCORA: Verus binary reward, mean-normalized GRPO; direct RL from base collapses
- Formal Disco: keep top third by feature rarity; pass@1 43.0% vs SAFE comparison 40.9%
- SEQ/SINQ: Liquid Haskell checks equivalence proofs (not Verus)

## Evaluation
- fix task isolation, contract, referee, outcome classes, budget; report passed/attempted for each number
- CLEVER (Claude Opus 4.6): 65/80, 70/80, 154/161 are different denominators
- DafnyBench: no-LLM baseline is 26.9%
- Mainstream-programming study (Verus, 55 tasks): fill annotations 25, all from natural language 8
- VerifyThisBench: best end-to-end 9.37%
- VERINA: o3 72.6% code, 52.3% spec, 4.9% proof
- VCoT-Bench: Sonnet 4.5 71.58% with 10% removed, 17.22% with all removed
- VeruSAGE tasks average 947 lines vs 32 for VerusBench; success falls with task size
- cost: LeetProof $5/problem, 28/50 Velvet vs 17/50 direct Lean

## Garbage
- Premise Order Matters in Reasoning with Large Language Models
- PolyQEnt
- PoC-Gym
- PatchOptic
- NeuroCodeBench
- Neural Interactive Proofs
- Multilingual Mathematical Autoformalization
- More Claims, Less Evidence
