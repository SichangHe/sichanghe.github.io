research choices across the Rust study
(authored by agents unless marked 🧑)

decision, agent recommendation
- first test whether one real verified module has usable change histories and independent requirements
  - this supports a maintenance experiment and a specification-quality experiment
  - choose one question after that feasibility check
- a cross-tool contract theorem is a stronger theory project
  - begin only after identifying a semantic case the existing hybrid proof does not cover
- cancellation and runtime-boundary testing are alternatives when proof histories are unsuitable
- these are proposed studies
  - no pilot has been run
  - novelty is provisional
  - costs below are planning estimates

1. one maintenance study, rather than four overlapping proposals
- question: after a required software change, can an agent restore proofs without undoing the change, weakening requirements, or adding assumptions?
- builds on
  - [Sisyphus, PLDI 2023](https://verse-lab.github.io/sisyphus/pdfs/sisyphus-pldi23.pdf)
    - authors already repair evolved implementations “whose specifications remained unchanged”
  - [PRISM, ITP 2023](https://drops.dagstuhl.de/opus/volltexte/2023/18401/pdf/LIPIcs-ITP-2023-26.pdf)
    - historical proof-pair extraction already exists
  - [ExVerus, 2026](https://arxiv.org/abs/2603.25810), [Aria, 2026](https://arxiv.org/abs/2607.06341), and current agent repair methods
  - [closest-work review](llm_for_verification/maintenance_prior_work.md)
- proposed difference
  - whole-module histories with dependent changes and known invalid revisions
  - independently preserve required executable changes and public behavior
  - count repaired proofs, valid refutations, and unresolved attempts separately
- first experiment
  - find ten interpretable historical changes in one verified Rust module
  - reproduce its original proof with pinned tools
  - freeze the executable change during proof repair
  - pin the requirements and their dependencies: referenced predicates, preconditions, models, trait implementations, extraction settings, and target
    - unchanged theorem text can acquire a different meaning when those dependencies change
  - compare existing diagnostics, an ordinary code agent, and dependency-guided repair
  - include full build cost and expert review time
- why it may matter
  - a maintained proof must describe the software teams actually ship
- reject if
  - independently required behavior cannot be reconstructed
  - Sisyphus or an existing historical benchmark already covers the same failures
  - gains disappear after charging for task reconstruction and review
- estimated cost
  - two weeks for corpus feasibility
  - one to two months for a labelled pilot if usable histories exist
- detailed variants
  - [Rust source evolution](rust_verifiers/research_directions.md)
  - [systems upgrade cost](practical_fv/research_directions.md)
  - [agent maintenance](llm_for_verification/research_directions.md)
  - treat these as variants of one study, not three independent novelty claims

2. specifications that preserve intended behavior rather than implementation mistakes
- question: does seeing buggy source change what an agent writes as the program's formal promise?
- builds on
  - [KaPilot, 2026](https://arxiv.org/abs/2607.21957)
    - authors already motivate avoiding specifications “prone to inheriting implementation flaws”
  - [Seeking Specifications, 2025](https://arxiv.org/abs/2504.21061)
    - correct and bug-injected C versions are already compared
  - [AutoACSL, 2026](https://arxiv.org/abs/2606.20969) and independently scored specification methods
  - [source comparison](llm_for_verification/maintenance_prior_work.md)
- proposed difference
  - real bug/fix histories, unchanged documentation, randomized source visibility, and hidden regression behavior
  - distinguish missed bugs from exclusions of valid callers
- first experiment
  - ten APIs with documented requirements and independently reproduced bugs
  - compare documentation only, documentation plus buggy code, and documentation plus patched code
  - tell every code-visible agent that the implementation may be wrong
  - use equal budgets and the same independent grading
  - grade accepted inputs and permitted outcomes separately
  - report initial contracts separately from contracts revised after verifier feedback
    - counterexamples can reveal implementation behavior to a condition intended to hide it
- why it may matter
  - proving a generated statement does not establish that it expresses the requirement
- reject if
  - requirements are ambiguous or grading depends on the generating model
  - existing implementation-visibility studies already perform the same experiment
  - a simple instruction to follow intent removes the effect
- estimated cost
  - several weeks of labeling and moderate model costs
- overlap
  - [LLM specification experiment](llm_for_verification/research_directions.md)
  - [C follow-up](llm_for_verification/c_and_systems_proofs.md)
  - [joint code/specification changes](practical_fv/research_directions.md)
  - blockchain exploit tests are an additional population, not a new mechanism

3. a proof that one unsafe-library promise supports its safe caller
- question: when one tool proves an unsafe library and another proves its safe callers, does the caller establish the library requirements, and does the library establish the caller assumptions?
- builds on
  - [Creusot/Gillian-Rust hybrid verification, PLDI 2025](https://doi.org/10.1145/3729289)
  - [Forte, 2026](https://arxiv.org/abs/2609.30254)
  - [standard-library verification, NFM 2026](https://arxiv.org/abs/2606.17374)
- proposed difference
  - a machine-checked implication between the two interpretations for a restricted contract fragment
    - equality is stronger than composition needs
  - include ownership, lifetimes, integer overflow, returned contents, and failure outcomes
- first experiment
  - inspect the hybrid paper's conversion argument before writing a translator
  - select one uncovered semantic case in a vector or ring-buffer API
  - candidate client: borrow element i mutably, replace it, end the borrow, and recover a sequence changed only at i
    - inspect the current artifact before treating any published unfinished proof as still open
  - deliberately corrupt the conversion and require the checker to reject it
- why it may matter
  - a correct caller proof cannot repair a differently interpreted library promise
- reject if
  - the existing conversion theorem already covers the proposed fragment
  - the prototype checks only syntax or arithmetic while trusting ownership meaning
- estimated cost
  - months; the exact uncovered semantic obligation determines feasibility
- [detailed design](rust_verifiers/research_directions.md)

alternatives and deferrals
- [cancellation across service effects](rust_language/research_directions.md)
  - promising if a historical failure escapes both schedule testing and existing cancellation-safe adapters
  - local memory safety is not a proof of acknowledged remote work
- [proof-boundary regression tests](practical_fv/research_directions.md)
  - compare with PK, existing conformance testing, and fault injection at equal effort
  - merely recording assumptions repeats the human's earlier direction
- [weak-memory checking](rust_verifiers/concurrency_async_verification.md)
  - a comparison must distinguish unsupported orderings from accepted proof abstractions
  - a new relaxed-memory verifier extension needs a separate soundness argument
- allocator-to-hardware composition, general compiler proofs, and broad verifier construction
  - defer until a concrete missing boundary and reusable existing artifacts are identified
- Rust compile-speed engineering and TLA+-to-Rust experiments
  - remain separate owned efforts
  - this study supplies literature and proposed questions only

consultation and review status
- older folder-specific ChatGPT advice is retained in the [LLM consultation](llm_for_verification/consultation.md) and [Rust-language consultation](rust_language/consultation.md)
- a new four-folder Extra High request failed before submission with `picker_effort_not_verified`
  - the tooling owner supplied an explicit saved-background route
  - one GPT-6.1 Sol / Extra High consultation was submitted through that route
  - the tooling owner confirmed the final answer from ChatGPT's conversation record at 10:10 PDT
  - the stale page did not display completion
  - the exact answer was checked against the incorporated [advice and assessment](consultation_assessment.md)
- a fresh Codex reviewer checked the whole tree against the original literature-and-proposal goal
  - reviewer conclusion: “No remaining material findings”
  - scope and novelty limitations remain explicit
  - the recovered advice has been assessed and incorporated
  - no consultation requirement remains outstanding
- recommendations are agents' opinions, including after review
