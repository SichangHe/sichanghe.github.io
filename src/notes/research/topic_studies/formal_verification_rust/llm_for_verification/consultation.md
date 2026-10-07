ChatGPT consultation: which experiments are worth testing?
(authored by agents unless marked 🧑)

source and scope

- ChatGPT GPT-5.6 Sol, confirmed Extra High, compact synthesis request answered October 7, 2026 UTC
- input described existing work and three candidate designs
  - historical Rust module maintenance
  - specification generation with randomized implementation visibility
  - transfer of learned proof help across projects and changed dependencies
- exact response retained locally at `/tmp/cx_llm_compact_answer.md`
- helper diagnostic: `/tmp/cx_llm_compact.json`
- opinions below are advice
  - they are neither experiments nor novelty determinations

ranking

- exact response: “My ranking is 1 > 2 >> 3”
  - recommendation: historical maintenance first
  - recommendation: specification exposure as a smaller causal study
  - recommendation: narrow transfer to failures under changed environments
- exact response: “Corpus viability is the main risk”
  - agreement: first find real changes whose existing requirements expose the known bugs
  - avoid building a framework before confirming that dataset

useful design corrections

- exact response: “Then you are benchmarking Git revert”
  - context: allowing arbitrary implementation edits while keeping the old public requirement can reward reverting the intended change
  - adopted: freeze historical executable changes for proof repair versus refutation
  - alternative: independently check that an intended behavior or performance change survives
- exact response: “the implementation may be wrong and it must specify documented intent”
  - context: instructions for models shown code in the specification-exposure experiment
  - adopted: this instruction belongs in every code-visible arm
  - evaluate whether the effect survives this simple mitigation
- advice: begin transfer evaluation with one kind of learned help
  - agreement: compare prose skills first
  - inference: a later comparison of lemmas, skills, and workflow edits may still be useful
    - it needs enough tasks to isolate each mechanism

new leads checked independently

- [current VeruSAGE-Bench README](https://github.com/microsoft/verus-proof-synthesis/blob/main/benchmarks/VeruSAGE-Bench/README.md)
  - fact: lists 460 no-lemma tasks
  - exact README wording: “The agent must invent the helper lemmas”
  - implication: missing helper discovery alone cannot distinguish our proposal
  - [code-and-agent review](code_and_agents.md) separates this variant from the published 849-task scores
- [Seeking Specifications](https://arxiv.org/abs/2504.21061)
  - fact: compares correct and intentionally buggy versions of handcrafted C programs
  - [prior-work review](maintenance_prior_work.md) records the opened methods and limits
  - implication: comparing buggy and correct code is already covered
  - possible remaining distinction: randomized visibility with real histories and independent behavioral scoring
- [DreamProver](https://arxiv.org/abs/2604.26311) was suggested as a transferable-lemma competitor
  - primary abstract checked separately
  - [research directions](research_directions.md) retains transfer novelty as unresolved
- an ArcXiv skill-transfer lead was not verified as a primary research record
  - no factual claims from that lead were adopted

limits

- the original long request failed before returning an answer
- the successful compact request used source summaries
- each additional lead needs independent source verification
- the ranking is useful judgment, not evidence that any candidate is new
