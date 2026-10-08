LLMs for formal verification
(authored by agents unless marked 🧑)

start here

- a checked proof establishes the written statement under its accepted assumptions
  - separate evidence must connect that statement to the required software behavior
- current work spans three different tasks
  - complete a proof for supplied code and contracts
  - generate code satisfying supplied contracts
  - generate the contracts themselves
- recommendation: study maintenance of useful verification across real code changes
  - existing work already covers proof generation, repository agents, reusable guidance, and specification mutation
  - research novelty needs a narrower question and direct comparisons

read by question
- [C code and operating-system proofs](c_and_systems_proofs.md)
  - agents generating C specifications, Isabelle proofs, Rocq proofs, and checked program cores
- [invariants and models](invariants_models_autoformalization.md)
  - candidate invariants, model checking, and requirements translated into formal descriptions

- [proof synthesis](proof_synthesis.md)
  - Lean, Rocq/Coq, Isabelle, Dafny, F*/Pulse
  - retrieval, proof search, helper lemmas, and learning from checked proofs
- [specification generation](specifications.md)
  - Verus-SpecGym, Coins, Spec-Harness, SpecSyn, SpecCoder
  - distinguish intended behavior from behavior copied out of an implementation
- [verified code and agents](code_and_agents.md)
  - Verus proof agents, implementation generation, repository context, and workflow improvement
- [benchmarks and evaluation](evaluation.md)
  - miniF2F, DafnyBench, VerusBench, VERINA, CLEVER, VeriContest, and newer tasks
  - weak contracts, trusted dependencies, translation, contamination, and resource accounting
- [maintenance prior work](maintenance_prior_work.md)
  - earlier proof repair and implementation-visibility studies constrain proposed novelty
- [ChatGPT consultation](consultation.md)
  - confirmed Extra High advice and independently checked competing work
- [research directions](research_directions.md)
  - proposed experiments, closest work, costs, and unresolved novelty

existing notes are the foundation

- [AutoVerus citation study](../../../autoverus_citations_20260801.md)
- [LeetProof](../../../leetproof_20260804.md) and [its evaluation](../../../leetproof_ase_evaluation_20260805.md)
- [CryptoProver](../../../cryptoprover_20260807.md) and [specification trust](../../../cryptoprover_leetproof_spec_clarification_20260808.md)
- [StarVerus](../../../starverus_20260809.md), [VeriSkill](../../../veriskill_20260803.md), [Vero](../../../vero_20260821.md), [Proofs Promptly](../../../proofs_promptly_20260821.md)
- [October 6 frontier](../../../verus_frontier_20261006.md)
- [earlier literature directions](../../../literature_directions.md) and [research arguments](../../../new_work_arguments.md)
  - the proposals here narrow existing repository and assumption-management ideas

reading the evidence

- checked on October 7, 2026 UTC
- author claims are reported results from the cited source
  - experiments were not rerun
- facts about methods describe the opened source or artifact
- inferences and recommendations are agents' judgments
  - proposed novelty is unconfirmed
- chapter authors used the available Codex model for delegated reading and review
  - the requested Opus and Fable models were unavailable in this runtime
- primary sources were retrieved directly when the web search tool failed
  - coverage is a focused review, not an exhaustive census
- new collected PDFs and extracted text are in `/hdd1/sichanghe/paper_collection`
- the requested Thursday deadline is October 8, 2026, 09:00 Los Angeles time
  - equivalent to October 8, 16:00 UTC
  - the delegation's October 9 parenthetical was inconsistent with Thursday
