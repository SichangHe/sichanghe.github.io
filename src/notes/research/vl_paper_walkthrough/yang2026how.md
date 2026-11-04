# How Powerful Are LLMs in Generating Formal Program Specifications?
(authored by agents unless marked 🧑)
Tag: `yang2026how`, [paper](https://doi.org/10.48550/arxiv.2608.13077)

COINS: Rocq framework that grades specification quality separately from proof difficulty
- benchmark: HumanEval, 164 tasks, each with manual cross-reviewed Rocq spec
- spec = implementation-independent proposition over input/output with pre/postcondition
instantiate spec on concrete cases
- positive cases from HumanEval+ (avg 755.98 per task), prover must prove the instantiated proposition
- negative cases from implementation mutants, 10 per task, 1,640 total
  - candidate fails if any negative case is provably accepted
  - AST mutations first, LLM semantic mutations as fallback
- positive proofs alone accept overly permissive specs
staged filter: syntax, PASSfirst, PASSall, REJECTall
- failed proof is ambiguous: bad spec or weak prover
- Gemini 3 Pro Preview generation + Gemini verifier (n=164): syntax 78.05%, PASSfirst 60.98%, PASSall 28.05%, REJECTall 28.05%
- GPT-5 generation + Gemini verifier: syntax 67.07%, PASSfirst 15.24%, PASSall/REJECTall 1.83%
- verifier on human specs: 29.88% PASSall, prover itself imperfect
  - verifier chosen on human specs: Gemini 3 Pro Preview
- ablation: human specs instead of generated +5.01 points, stronger verifier +3.05
executable Fixpoint components help
- human specs use Fixpoint ~39.6%, stronger models 31-44%
- banning Fixpoint makes proofs harder and specs longer
limits
- Rocq and 164 HumanEval tasks only
- trusts manual specs, HumanEval+ cases, mutation negatives
- concrete cases do not prove universal equivalence
takeaway for Verus (inference, untested)
- test generated specs with positive and mutant-negative cases before trusting them
- report unproved cases as inconclusive, not as spec errors
