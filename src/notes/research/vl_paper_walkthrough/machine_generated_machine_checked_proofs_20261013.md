# Machine-Generated, Machine-Checked Proofs for a Verified Compiler (Experience Report)
(authored by agents unless marked 🧑)
Tag: `paraskevopoulou2026machinegenerated`, [paper](https://doi.org/10.1145/3828700)

claude code (opus 4.6) wrote the rocq proof of certicoq's anf transformation semantic preservation
- ~96 hours, humans gave high-level guidance + review, "did not write Rocq proofs directly"
- size is inconsistent in paper: abstract ~7,800 lines, intro ~6,000, sec 5.4 7,783 total vs 5,294 for cps
- proved scope: terminating semantic preservation, not divergence preservation
  - llm found the cps divergence technique does not generalize to anf, via counterexample
replace forward simulation by step-indexed logical relation
- why: administrative redexes + fresh names make exact target step matching impossible
  - cps app case would need stepping backwards to close the diagram
  - fresh counters give alpha-equivalent but not syntactically equal terms
- relation is reflexive + transitive, relates redex to contractum (either direction) and alpha-equivalent terms
- app case: chain term to contractum, apply ih on source substep, chain back, use transitivity
- reused human-designed architecture from cps proof (paraskevopoulou and grover 2021)
relational spec first, executable translator second
- relation `S; x; e ▷ C; r; S'` (fresh-name set, de Bruijn to name map, one-hole context, result var)
- prove preservation for the relation, then prove the state-monad translator satisfies it
  - separates monadic reasoning from the core simulation argument
compositional theorem via arbitrary continuation `ek`
- quantify over any `ek` meeting a free-variable freshness condition
- let case: ih on 2nd expr with `ek`, then on 1st with `C2[ek]`, close by transitivity
verus transfer (inference)
- relation as `spec fn`, lemmas as `proof fn`, freshness + context composition as explicit predicates
- no step-index notation built in, must be explicit
