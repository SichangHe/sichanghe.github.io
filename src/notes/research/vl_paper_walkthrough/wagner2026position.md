# Position: Natural Language Should Not Fully Replace Formal Languages
(authored by agents unless marked 🧑)
Tag: `wagner2026position`, [paper](https://doi.org/10.48550/arxiv.2607.20432)

information-theoretic crossover: natural language wins at low task specificity, formal language at high
- theorem 3.10: σ* = H(Y) + R_formal − Δ_trans
  - below σ*: NL may be cheaper
  - at or above σ*: formal is no worse
  - assumes one-shot generation, realizable task, known formal redundancy
  - iteration and overspecification lower the threshold (Remark 3.13)
  - formal loses if its redundancy exceeds the translation gap (Remark 3.11)
- recommendation: hybrid interface
  - NL for high-level intent, formalism for exact constraints
  - code: loose requirements in NL, outcome, edge-case, error, security requirements precise
specification ladder (Def 2.1)
- overspecification, full specification, pragmatic underspecification, indifferent underspecification
  - pragmatic vs indifferent: does the speaker have implicit preferences
  - pragmatic underspecification risks miscommunication
- omitted details that can cause failure must become explicit constraints
task specificity σ_ϵ(T)
- minimal mutual information I(Y; Ŷ) so output is acceptable with probability above 1−ϵ
  - σ = 0: any output acceptable; σ = H(Y): only the exact output
- low: prototypes, creative work; high: production behavior, edge cases, security
translation gap Δ_trans = KL(p_M ∥ p_NL)
- cost of describing a domain in general language
- NL cost lower bound: L_NL(σ) ≥ σ + Δ_trans (Prop 3.8)
evidence is thin
- proofs only, plus literature-backed examples (image prompting, code), white-noise image calculation
- no estimator, no measured σ, no controlled crossover experiment
- no Verus or Rust discussion
for Verus (inference)
- acceptable set as spec predicate, `ensures` as membership
- put intent in comments, exact obligations in contracts, invariants, proof fns
- a proved but incomplete contract still accepts wrong behavior
  - threat to agent-written verified Rust: high for spec capture, moderate for proof generation
