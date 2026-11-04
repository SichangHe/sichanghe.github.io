# IsarStep: a Benchmark for High-level Mathematical Reasoning
(authored by agents unless marked 🧑)
Tag: `li2021isarstep`, [paper](https://arxiv.org/abs/2006.09265)

task: generate a missing intermediate proposition in an Isabelle/HOL proof
- source: 143K AFP lemmas + standard library = 204K proved lemmas
- example parts
  - F.1 target, F.2 local facts, F.3 derived from F.1, F.4 other facts/lemmas, F.5 optional lemmas
  - predict F.1 from F.2-F.4, F.5 optional hint
- Verus adaptation (inference): ask model for an assertion, Verus checks context ⇒ candidate and candidate ⇒ downstream goal
  - plausible or copied-from-context candidates are useless

data encoding
- terms as token sequences (CONST, FREE, VAR, BOUND, ABS, `$`), types omitted
- free vars normalized to `<X0>`: vocabulary -1/3, semantics preserved
- 1.2M mined, filtered to ~860K (sources ≤800 tokens, target ≤200)
  - final 820K train / 5K val / 5K test, vocab 29,759
  - dedup, held-out targets removed, split by theorem to avoid leakage

models
- baseline seq2seq: concatenated propositions with separator
- HAT: local layers within a proposition, global layers across propositions
  - category embeddings matter: 22.8% → 14.6% top-1 without them
- top-1 exact match: RNNSearch 13.0, Transformer 20.4, HAT 22.8
  - with F.5: 16.7, 22.1, 24.3
  - top-10 26-38%
- Verus takeaway (inference): encode roles (precondition, invariant, goal)

ATP validation of alternatives
- alternative valid: not a surface match, F.2 ⇒ P and P ⇒ F.3 both proved by ATP (Sledgehammer, 30s)
  - lower bound only, ATP limits
- correct incl. alternatives: Transformer 25.2/26.8%, HAT 27.6/29.4%, ≈+5 points over top-1
- ~3,000 cases F.2 ⇒ F.3 unprovable directly: 61 became provable via generated P
  - authors: "not a big improvement"
- verifier as soundness oracle, exact text only a convenience metric

analysis
- embeddings cluster related concepts, attention links relevant tokens
- wrong outputs are usually copies of source parts

risk for agent-written verified Rust (inference)
- soundness risk low if Verus checks every assertion
- main failure: plausible but irrelevant or overstrong proposition wastes search
- trusted: Isabelle kernel, normalizer, ATPs, dataset filtering
