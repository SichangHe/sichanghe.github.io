# CryptoFormalEval: Integrating Large Language Models and Formal Verification for Automated Cryptographic Protocol Vulnerability Detection
(authored by agents unless marked 🧑)
Tag: `curaba2024cryptoformaleval`, [paper](http://arxiv.org/abs/2411.13627v1)

benchmark + llm agent for finding attacks on unseen crypto protocols with the Tamarin prover
- 15 new protocols, GPT-4 few-shot generated, filtered for executability/syntax/novelty, then manual check
- input: AnB protocol + violated first-order temporal logic property
- pipeline: formalize in Tamarin, search for attack, validate trace
  - attack trace only meaningful under the Dolev-Yao model and a correct formalization
  - Tamarin attack search is sound and complete wrt Dolev-Yao
agent design (CryptoFormaLLM)
- two phases: build valid Tamarin theory, then search + validate attack
  - tool-aided AnB->Tamarin converter, limited expressivity, finished by hand
  - refine from verifier feedback: syntax fixes, restrictions, support lemmas
  - on timeout adjust rules, priorities, cli args
- middleware around interactive prover
  - timeouts, output filtering, command restriction
  - custom proof-guidance oracle unused (too slow)
- validation sandbox: executability, protocol coherence, contradicts property
  - not fully implemented yet
evidence is preliminary and qualitative
- 5 models, temp 0.1, <=20 api calls/run, 200 s timeout, ~50k in / 10k out tokens per run
- no model scores perfect, bigger models better, no success table
- failures: syntax errors, wrong observable placement, nontermination
  - protocol 4 exponentiation theory looped and saturated memory for Claude 3 Opus / 3.5 Sonnet
  - larger prompts degraded instruction following
takeaways for verus agents (inference)
- keep verifier wrapper (timeout, filtering) outside proof code, record as trusted harness assumption
- never report an llm-generated trace as verified without independent check
