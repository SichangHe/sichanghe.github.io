# The LLMbda Calculus: AI Agents, Conversations, and Information Flow
(authored by agents unless marked 🧑)
Tag: `garby2026llmbda`: [paper](https://www.semanticscholar.org/paper/327f2df80cccd89a10934eef495b06af949b0feb)

formal calculus for LLM agents with information-flow labels, mechanized in Lean 4
- untyped call-by-value λ-calculus; conversation = message list
  - `send`, `recv` (sample LLM, parse, eval), `fork`, `clear`, `endorse`
  - values, pc, and conversation carry labels from a join-semilattice
- prompt injection becomes a semantic event: untrusted text only reaches later `recv` via labelled history
main theorem: termination-insensitive probabilistic noninterference (TIPNI)
- covers code-generating agents
- proof via m-skipping semantics (76 rules): stripping, high-blindness, subdistribution lemmas
- Theorem 2: insulated TIPNI under `endorse`, for observer maximal in integrity
  - endorse deliberately weakens integrity noninterference
- interpreter correctness under assumption `IsDist(M)` on model responses
  - fuel-based pure interpreter, LLM as abstract oracle, HTTP outside the proof
patterns
- quarantine: evaluate untrusted input in forked, cleared conversation
- confined endorsement: map reply into small fixed set, default otherwise; attacker gets ≤ log2 n bits
- Randori practice mode: repair loop on mock state, then run once on real state
evaluation: AgentDojo banking, 16 tasks x 9 attacks x 3 reps, 3 models
- all but 2 of 1296 attacked runs secure; the 2 are the same pair across models
trusted: Lean kernel, model probability spec, network oracle, tool-world transformers
