# Security Is Relative: Training-Free Vulnerability Detection via Multi-Agent Behavioral Contract Synthesis
(authored by agents unless marked 🧑)
Tag: `wang2026security`, [paper](https://arxiv.org/abs/2604.19012)

phoenix turns vulnerability detection into contract checking, training-free with 3 zero-shot agents
- open "is this vulnerable" becomes closed "does this satisfy these security requirements"
- eval on PrimeVul pairs, 427 usable pairs (8 dropped for xml failures)
  - contract learned from the pair, each sample judged independently
  - pair dependency is an experimental means, deployment need not have a patch
semantic slicer
- keep patched lines + needed context, prune boilerplate
- avg function 5,298 to 911 chars (-82.8%)
requirement reverse engineer
- writes Gherkin secure-behavior scenarios from the diff, cve text, commit message
- fixed code must pass and vulnerable code must fail
contract judge
- binary verdict against the spec as "Golden Standard"
- separating synthesis from judging stops the judge rediscovering the vulnerability definition
results
- best config: F1 0.825, precision 0.792, recall 0.860
- pair-correct 275/427 = 64.4%
  - baselines use 435 pairs, not denominator-matched
- gherkin adds F1 +0.09 to +0.35 over raw across 4 judges
failure modes
- 97 fp, 60 fn
  - 17/97 fp (18%) are genuine concerns in patched code, so labels can disagree with stricter contracts
  - 44/60 fn (73%) are confident accepts of vulnerable code
    - incomplete specs dominate, ~25 of 60
trust
- patch as spec oracle, cve text, llm-written Gherkin, benchmark labels
Verus transfer (inference)
- scenario to spec fn + ensures, prove refinement
- verus proves compliance with a missing condition, so review contract completeness
