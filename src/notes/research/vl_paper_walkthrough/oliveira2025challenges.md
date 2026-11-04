# What Challenges Do Developers Face When Using Verification-Aware Programming Languages?
(authored by agents unless marked 🧑)
Tag: `oliveira2025challenges`, [paper](https://arxiv.org/abs/2506.23696)

mixed-methods study of verification-aware (va) language adoption barriers
- languages: dafny, frama-c, eiffel, jml, spark ada, why3, spec#; verus not included
- literature review + lda topic model of stack overflow questions + survey of 31 (13 experienced, 18 beginners)
- paper's counts are inconsistent (language counts sum to 1460 vs 1420 questions; duplicate-removal numbers)
challenge taxonomy from 8 lda topics, manually labeled
- classes: proof elaboration (2 topics), environment setup, memory model, language understanding
- proof elaboration: choosing or completing a proof strategy, finding loop invariants, termination clauses
- 38% of first-model questions were not-suited and removed before retraining
survey results
- 64.5% struggled designing proof strategies; 48.4% agree on difficulty completing or searching one
- only significant beginner/experienced gap: termination clauses (p=0.027)
improvements rated
- 83.9% want user-readable counterexamples
- 64.5% want tutorials with common exercises
- beginners value searchable docs more (66.7% vs 15.4%)
caveats
- measures perceived difficulty and what people ask, not failure prevalence
- uneven language counts limit transfer to verus
