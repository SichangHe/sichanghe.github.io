# Development and Verification of a Flight Stack for a High-Altitude Glider in Ada/SPARK 2014
(authored by agents unless marked 🧑)
Tag: `becker2017development`, [paper](http://arxiv.org/abs/1707.00945v1)

result: flight stack of 55,422 lines verified with SPARK 2014 (GNATprove)
- 3,981 VCs, 88.8% proven in 19 min (timeout 120 s)
- application 88.1% of 3,214 VCs; hal/rts SPARK coverage much lower
- not all properties proven in the 3-month project; integration tests still needed
co-verification: run the prover continuously so proofs steer design
- callee postconditions summarize effects; callee preconditions become caller obligations
- split long expressions to discharge more VCs; limit float ranges
- avoid saturation: it masked boundary cases, i.e. missing requirements
proof soundness hazards
- suppressing a false positive can make a later real failure look unreachable
- an inconsistent postcondition is an inconsistent axiom, so anything proves
- wrong runtime model: rts claimed no subnormals but the fpu had them, fpe despite proven AoRTE
- keep failures visible, read the assumptions report
cost accounting by vc type
- floating-point overflow: 21% of VCs, 65% of analysis time
- missing dimensioned generics left >70% of failed float VCs
- report proof fraction per component, not one global percentage
verus takeaways (inference)
- treat `assume`, `external_body`, hardware models as trusted; audit that `ensures` are consistent
