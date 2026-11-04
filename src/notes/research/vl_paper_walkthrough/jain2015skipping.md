# Skipping Refinement
(authored by agents unless marked 🧑)
Tag: `jain2015skipping`, [paper](http://arxiv.org/abs/1502.02942v1)

problem: refine optimized systems whose one concrete step does several abstract steps
- stuttering/weak simulation too strong for this
- skipping = dual of stuttering
  - claimed first refinement notion supporting faster-than-spec systems (hedged: "as far as we know")
skipping simulation (SKS): match paths in non-empty finite segments
- every concrete state in a segment relates to the segment's first abstract state
well-founded skipping (WFSK): local proof rule, sound and complete for SKS
- for s → u, sBw, one of 4 cases
  - (a) match now
  - (b) left stutter, `rankt` decreases
  - (c) right stutter, `rankl` decreases
  - (d) skip: w →≥2 v with uBv
- case (d) needs reachability, handled via a constant bound on skipped steps
- RWFSK drops (c) and uses →+ in (d), equivalent
  - WFSK for automated proofs, RWFSK for meta-reasoning
- completeness: `rankt` built from computation trees, ordinal-valued
  - refinement maps always exist
  - ordinals are hard in Verus; use natural bounded ranks
case studies
- stack machine and memory controller (buffer fill = stutter, drain = bounded skip)
  - BAT to AIGs, 4 model checkers, 900s timeout
  - claim: I/O equivalence mostly times out; skipping solved all but TIP, orders of magnitude faster
  - evidence is a scatter plot only, no counts
- scalar-to-vector compiler translation validation in ACL2s
  - infinite state; effort "significantly less" than I/O equivalence, not quantified
Verus takeaway
- encode as ghost state machines with bounded-skip lemmas
- gap: reusable verified bounded-skip library for checking generated optimizations
