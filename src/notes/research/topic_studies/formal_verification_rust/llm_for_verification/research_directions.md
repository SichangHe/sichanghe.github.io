research directions: useful verification across software changes
(authored by agents unless marked 🧑)

recommendation

- start with a historical-change pilot on small verified Rust modules
  - ask whether an agent preserves a meaningful external requirement as code and proofs change
  - measure complete checked artifacts, accepted assumptions, actual regressions, and cost
- treat the ideas below as hypotheses
  - the review identifies close existing work
  - it does not establish novelty or expected gains

what is already occupied

- ordinary proof generation with verifier feedback
  - [AutoVerus](https://arxiv.org/abs/2409.13082), [DafnyPro](https://arxiv.org/abs/2601.05385), and [COPRA](https://arxiv.org/abs/2310.04353)
  - [proof review](proof_synthesis.md) gives source quotes and scope
- repository context and coordinated proof work
  - Vero (local note; not yet published), [VeruSAGE](code_and_agents.md), and KVerus
  - existing [literature directions](../../../literature_directions.md) already propose repository-native proof agents
- specification strength measured through mutation
  - [Spec-Harness and SpecSyn](specifications.md)
- reusable guidance and failure-driven improvement
  - [VeriSkill](../../../veriskill_20260803.md) and [SO-RSI](code_and_agents.md)
- explicit assumptions that survive changes
  - the existing [new-work arguments](../../../new_work_arguments.md) already propose this
    - exact earlier wording, candidate 1: “which future changes invalidate the receipt”
  - the contribution here must be an experiment that tests this idea

candidate 1: maintain a verified module through real changes

- question: can an agent update a module without silently weakening its public promise?
- builds on VeruSAGE's realistic obligations, Vero's full-artifact grading, and existing assumption-management proposals
- proposed addition: a time-ordered evaluation on real changes
  - jointly missing helper proofs remain missing until the complete module checks
  - public behavior and allowed trusted assumptions are fixed independently of the repair agent
  - include both legitimate changes and known regressions
  - freeze the historical executable change in the first study
    - legitimate changes require proof repair
    - buggy changes require an independently checked behavior violation
    - a proof timeout remains unknown, not evidence of a bug
  - if code repair is allowed, independently check that the intended change survives
    - otherwise reverting to the old implementation can satisfy the old contract
- first experiment
  - select three small sequence, parser, or storage-metadata modules
  - use 10 historical changes per module
  - separate intended behavior changes from implementation-only changes before model evaluation
  - compare a general coding agent, repository retrieval, and explicit dependency/invalidation tracking
  - equalize total model and verifier budgets
- convincing evidence
  - more full-module repairs under the frozen requirement
  - fewer accepted known regressions
  - lower total repair or review time
  - no increase in unsupported assumptions
- why it may matter
  - a proof used in software development must remain valid as software evolves
  - isolated success rates can hide a helper dependency that no longer holds
- likely cost
  - estimate: two weeks for dataset feasibility, then one to two months for a labeled pilot
  - main cost: finding meaningful changes with independent requirement evidence
- closest work
  - VeruSAGE-Bench now has 460 no-lemma tasks
    - missing helper discovery alone is already covered
    - [current source](https://github.com/microsoft/verus-proof-synthesis/blob/main/benchmarks/VeruSAGE-Bench/README.md)
  - KVerus already evaluates repository verification
  - Vero already requires whole-artifact completion
  - [Sisyphus, PLDI 2023](https://verse-lab.github.io/sisyphus/pdfs/sisyphus-pldi23.pdf) already repairs evolved OCaml library implementations under unchanged specifications
    - primary title: “Mostly Automated Proof Repair for Verified Libraries”
    - [maintenance prior work](maintenance_prior_work.md) compares its mechanism and scope
  - proof repair and incremental verification already study reuse after edits
  - chronology and unchanged specifications alone are already covered by Sisyphus
  - possible distinction: whole-module histories with simultaneous dependent edits, known wrong changes, and explicit assumption accounting
- stop condition
  - cannot label required behavior without making up a new requirement
  - close existing artifacts already contain an equivalent historical-change evaluation
  - tracking adds complexity without improving detection, completion, or review

candidate 2: measure whether code-based specification generation preserves bugs

- question: does exposing a buggy implementation bias generated contracts toward its bug?
- builds on KaPilot's initial implementation-blind generation and executable specification evaluation
  - see [specification review](specifications.md)
- proposed addition: a paired, causal comparison using real bug/fix versions
  - same docs and model budget
  - randomize implementation visibility
  - hide bug-triggering regression cases
  - tell code-visible agents that implementations may be wrong
    - ask them to formalize documented intent rather than observed behavior
  - use unrelated mutations as a secondary quality check
- first experiment
  - 30 APIs with clear documented requirements and independently known fixes
  - three conditions: docs only, docs plus buggy code, docs plus fixed code
  - evaluate acceptance of valid behavior and rejection of the known wrong behavior
  - separate ambiguous docs from model mistakes
- convincing evidence
  - reproducible excess acceptance of the bug in the buggy-code condition
  - a method removes that bias while retaining valid behaviors
- why it may matter
  - proving a specification inferred from buggy code can preserve the wrong behavior
- likely cost
  - estimate: several weeks of labeling plus moderate model costs
- closest work
  - KaPilot already separates documentation from implementation
  - SpecSyn already assesses mutation discrimination
  - Spec-Harness already evaluates input/output adequacy
  - [Seeking Specifications](https://arxiv.org/abs/2504.21061) already compares correct and bug-injected C code
    - [prior-work details](maintenance_prior_work.md) explain why real histories and randomized visibility are the remaining distinction
  - KaPilot already motivates avoiding inherited implementation flaws
  - possible distinction: quantify visibility bias causally on independently labeled real bug/fix pairs
  - [maintenance prior work](maintenance_prior_work.md) identifies the existing component ablations and the narrower untested comparison
- stop condition
  - documented bug/fix pairs are too ambiguous for independent grading
  - existing spec-generation work already measures the same visibility effect

candidate 3: reuse learned proof help across changed dependencies

- question: which improvements remain useful on a new project or library version?
- builds on LeanDojo, LEGO-Prover, VeriSkill, and SO-RSI
  - see [proof review](proof_synthesis.md) and [agent review](code_and_agents.md)
- proposed addition: compare three forms of reuse under dependency changes
  - checked helper lemmas
  - prose guidance
  - revised agent workflows
- first experiment
  - train or optimize on one project family
  - freeze the improvement before testing on another family and later dependency versions
  - remove leaked target proofs and deny new trusted assumptions
  - compare with spending the improvement budget on independent fresh attempts
- convincing evidence
  - better full-artifact success at equal total optimization and inference cost
  - useful gains remain after a dependency change
  - stale help is rejected or repaired rather than accepted silently
- why it may matter
  - an improvement that only memorizes one benchmark is poor evidence of reusable verification capability
- likely cost
  - estimate: one month if compatible task histories already exist
  - model training is optional for the first pilot
- closest work
  - KVerus already compares Verus releases and adapts to version-matched documentation
    - [paper](https://arxiv.org/abs/2605.03822v1), §5.1
    - the collected v2 also reports a release comparison; the cited wording here is from v1
    - exact version list: “20250328, 20250630, and 20250813”
    - verifier-version adaptation alone is already covered
  - [DreamProver](https://arxiv.org/abs/2604.26311) also targets lemma transfer
    - abstract: “prove unseen theorems in related domains”
    - abstract checked; full PDF collected but not read in this pass
  - LeanDojo already holds out premises
  - VeriSkill already studies reusable guidance
  - SO-RSI already optimizes workflows on held-out tasks
  - possible distinction is held-out project transfer plus changed contracts and dependency invalidation
- stop condition
  - ordinary retrieval or extra retries match the result at lower total cost
  - task histories do not distinguish genuine change from renamed duplicate exercises

additional idea: proof-friendly redesign under resource bounds

- question: can we lower proof cost without making the implementation too slow or too large?
- builds on AlphaVerus, LeetProof, Vero, P3, and IDS
  - [code-and-agent review](code_and_agents.md) gives sources and limits
  - IDS already includes measured performance in joint code/proof search
- proposed distinction: fix a resource model before generation and check its bounds
  - examples: parser allocations, queue capacity, map operation counts
- first experiment: 20 small tasks with proof-easy and runtime-efficient alternatives
  - compare fixed-code proving, unconstrained rewriting, and resource-constrained rewriting
  - measure compiled performance separately to test the cost model's relevance
- convincing evidence: lower synthesis cost with checked functional and resource properties
- why it may matter: an easy proof is insufficient if the replacement is unsuitable for its workload
- cost estimate: a month for annotations, paired implementations, and a small campaign
- closest work: IDS, P3, resource-bounded synthesis, proof-aware optimization
  - novelty unresolved; performance feedback alone is already occupied
- stop condition: the resource model fails to predict practical performance
  - or earlier synthesis work already provides the claimed mechanism

what to do first

- recommendation: run dataset feasibility before building an agent framework
  - use the SaltBench protocol lessons (local note; not yet published) to pin full agent configurations and isolate hidden grading
  - the [Agave sizing study](../../../agave_verification_scope.md) provides independently scoped target leads
    - those are candidate dataset sources, not an instruction to start verification in this study
  - can we find 10 independently interpretable changes in one verified Rust module?
  - can a baseline reproduce the original checked artifact with a pinned toolchain?
  - do frozen public contracts reject the selected regressions?
- if yes, use that module to compare historical maintenance and bug-preserving specification generation
- if no, publish the feasibility limitation internally and choose a better target
  - avoid inventing artificial requirements merely to obtain a score

consultation and uncertainty

- ChatGPT Extra High answered the compact synthesis request on October 7, 2026 UTC
  - helper confirmed GPT-5.6 Sol and Extra High before submission
  - [saved response](consultation.md) quotes the opinion and records its limits
  - earlier resume and long-prompt attempts failed without an answer
- advice: prioritize historical maintenance, then specification exposure bias, then transfer under changed environments
- agreement: historical changes may need a checked refutation rather than a repaired proof
  - adopted an executable-change freeze to prevent trivial reverts
  - checked the newly identified VeruSAGE no-lemma variant directly
- disagreement in emphasis: three forms of learned help are useful to compare eventually
  - start with one form to avoid an uninterpretable large experiment
- these recommendations are agents' opinions
- a full novelty search still needs contract inference, incremental verification, and versioned benchmark literature
- no claims of being first
