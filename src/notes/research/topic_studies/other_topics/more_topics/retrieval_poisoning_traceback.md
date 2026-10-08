retrieval poisoning traceback
(authored by agents unless marked 🧑)

takeaway
- poisoned-source identification already has dedicated methods and a follow-up
- agent extension of the repository's [RAG note](../../../rag.md)
  - exact listed title: “Traceback of Poisoning Attacks to Retrieval-Augmented Generation”
  - source note has no authorship declaration; do not attribute it as confirmed human-authored interest
- complements [memory and retrieval](../ai_agents/memory_rag.md)
  - scope here is identifying which stored texts caused a reported wrong answer
  - source responsibility does not identify the attacker or prove malicious intent
- selected primary methods checked on 7 Oct 2026 UTC
  - no experiments or artifact reproduction

RAGForensics: narrowing and judgment
- Zhang et al, [WWW 2025 primary manuscript, §§3–5](https://arxiv.org/pdf/2504.21668v2)
  - authors: “cannot access their internal parameters but can query them directly”
  - owner can inspect the complete text database and query the retriever and language model
  - starts with reported queries and incorrect answers
  - retrieves relevant candidate texts, asks a language model whether each encourages the reported answer, removes flagged texts, and repeats
    - stops when the collected benign candidates reach the retrieval count
  - judge prompt disregards factual correctness and evaluates answer alignment
    - a judge's classification is not an independently demonstrated causal effect
  - evaluation selects 50 successful attack events for each attack/dataset pair
    - Natural Questions, MS-MARCO, and HotpotQA
    - PoisonedRAG variants and instruction injection; also selected adaptive attacks
    - this selection does not estimate accuracy over arbitrary production complaints
  - main identification premise: attack texts rank highly for the target query
    - unobserved queries and falsely cleared candidates can leave poison behind
  - implication: clearing the tested retrieval set does not certify the entire database
  - reading limit: selected full threat model, algorithm, judge prompt, evaluation setup, and adaptive-attack discussion inspected
    - appendices and artifact not independently replayed

RAGOrigin: stronger attribution signals
- Zhang et al, [Who Taught the Lie, September 2025 preprint, §§3–6](https://arxiv.org/pdf/2509.13772)
  - authors: “the number of clusters is set to 2”
  - broadens attribution beyond direct text/answer alignment
  - narrows ranked database texts by testing retrieved groups against the reported answer
  - scores each candidate using embedding similarity, question-token probability, and incorrect-answer token probability
    - probabilities come from a proxy model rather than hidden production-model parameters
  - standardizes the three signals and averages them
  - two-cluster grouping labels the higher-average-score group poisoned
    - assumes useful separation; two groups alone do not establish two true populations
  - main evaluation uses five QA datasets and nine attack methods
    - collects 100 successful attack events per attack/dataset setting
    - default user query equals the attack's target query
    - further sections test query paraphrases and broader settings
  - implication: ranking, semantic relevance, and answer influence are existing attribution features
    - single-text influence can differ from influence when several texts interact
  - reading limit: selected full assumptions, scoring, clustering, and main evaluation setup inspected
    - remaining extended evaluations and implementation unchecked

bounded research possibility: separate responsibility from maliciousness
- agent hypothesis: benign documents repeating the wrong answer cause false accusations even when removal changes the output
- compare RAGForensics, RAGOrigin, and controlled removal of candidate texts
  - removal baseline already follows existing attribution logic; do not claim it as a new mechanism
  - hold retriever, model, query, corpus size, and available candidate texts fixed
  - repeat generation to distinguish stochastic answer changes from document effects
- distinguish injected attack texts, benign quoted misinformation, outdated facts, and correct conflicting accounts
  - retain ground-truth insertion history separately from answer correctness
  - score harmful-source identification and malicious-source accusation separately
- include duplicate sources and jointly influential text groups
  - measure missed groups, false accusations, query cost, and correct answers lost after removal
  - compare equal candidate budgets before attributing benefits to scoring
- competing explanation: retrieval rank or judge phrasing accounts for apparent attribution accuracy
  - vary these independently from content provenance
- possible increment: calibrated refusal to accuse a source when responsibility and intent cannot be distinguished
  - originality unconfirmed; recover related source-attribution and abstention studies before implementation
- stop rule: existing methods already distinguish these cases at the same false-accusation and query budgets
  - retain only an unresolved replication or measurement question

remaining limits
- source note authorship unresolved; this page makes no human-authorship claim
- successful-attack benchmarks do not establish coverage of ordinary user reports
- access to the database and retriever differs from an end user seeing only an answer and citations
- no guarantee about attacker identity, intent, or absence of remaining poison
