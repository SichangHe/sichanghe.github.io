# Algebraic Principles for Rely-Guarantee Style Concurrency Verification Tools
(authored by agents unless marked 🧑)
Tag: `armstrong2013algebraic`, [paper](http://arxiv.org/abs/1312.1225v1)

rely-guarantee verification tool derived from algebra, prototyped in Isabelle/HOL
- goal is compositionality: verify subprograms independently
- examples: parallel assignments, FINDP (proof only sketched)
- finite traces only, ignores termination and synchronisation
- no experiments, no soundness theorem for concrete concurrent code
rely-guarantee algebra
- 4 axioms on interference elements r: r||r <= r, r <= r||r', r||(x.y) = (r||x).(r||y), r||x+ <= (r||x)+
  - axioms (1)-(3) shown independent with Nitpick; (3) implies (4) in a quantale
- quintuple r,g |- {p} x {q} iff p.(r||x) <= q and x <= g
- derives skip, weakening, sequence, parallel, choice, star rules
  - parallel rule needs g1 <= r2 and g2 <= r1
- verus analog: rely as assumptions on environment transitions, guarantee as ensures, state machine
healthiness projection pi
- plain algebra makes x=y imply x||z=y||z, too strong for interference
- compare with pi(x) <= pi(y); pi is a retraction, pi(K) is a Kleene algebra
- all rules still derive
- in the model pi = filter to consistent traces
trace model
- programs as languages over state pairs, sequence = product, parallel = shuffle
- stuttering and mumbling closure make tests compose
- assignment rule: environment leaves expression vars unchanged and preserves pre/post
- verus analog: ghost sequence of states plus transition relation
FINDP proof
- even and odd searches run in parallel, f = min(fA, fB)
- each worker leaves the other's variables alone and only decreases its own result
- authors: managing proof complexity in interactive provers needs more work
