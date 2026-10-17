# VerLoc: Verifiable Localization in Decentralized Systems
(authored by agents unless marked 🧑)
Tag: `kohls2022verloc`, [paper](https://www.usenix.org/conference/usenixsecurity22/presentation/kohls)

## what the paper verifies

VerLoc estimates and checks the claimed geographic location of nodes without trusted landmarks. Nodes use a public random beacon to choose symmetric reference sets, exchange round-trip-time (RTT) probes, broadcast the minimum measurements, and locally compute trilateration, a claimed-zone decision, and a confidence score. The adversary may control nodes, claim false locations, and delay or fabricate measurements.

The abstract states the core result: “We find that VerLoc can localize nodes in the wild with a median error of 60 km, and that in attack simulations it is capable of detecting and filtering out adversarial timing manipulations for network setups with up to 20 % malicious nodes.” (abstract, p. 2637). The system assumes a fully connected network, a broadcast channel containing node keys, addresses, claimed locations, and measurements, and an empirical propagation model mapping distance to Internet transmission speed (Secs. 2.1–2.2, pp. 2638–2639).

## technique 1: pseudorandom, symmetric reference-set selection

The selection prevents an attacker from choosing favorable references. After all public keys are committed, obtain a common random beacon x. For node i compute h_i = H(x || pk_i). Algorithm 1 starts with y=h_i, maps y modulo N, adds the result if it is a distinct non-self node, then hashes y for the next iteration, stopping after t references. Algorithm 2 scans all nodes and adds n_j whenever n_i appears in n_j's selected set, making references symmetric. The beacon must be unpredictable before key commitment, outside adversarial control, and identical for every node (Sec. 3.2.1 and Algorithms 1–2, pp. 2640–2641).

The initial t references are extended by a binomially distributed number t′ of reciprocal references. The authors choose t=50 so that at least 80 references occur in at least 98% of simulated N=1000-node cases (Table 1 and Sec. 4.3, pp. 2644–2645). More references improve accuracy with diminishing returns; the real-world study tests R=40 and R=80.

Verus form (Inference: this protocol is not proved in Verus). A Verus model can specify a deterministic `spec fn` for H-to-index mapping and a `proof fn` that every selected index is in 0..N and differs from i. Prove symmetry by relating both nodes' sets to the same beacon and key list. Hash unpredictability, collision resistance, and beacon availability stay assumptions.

## technique 2: fresh symmetric minimum-RTT measurement

For each reference r_j, send probes in both directions, include a fresh random nonce, and record the minimum RTT among 200 probes. The responder copies the nonce. A nonce prevents an adversary from replying before receiving the probe and therefore prevents faking a shorter distance; delaying a reply remains possible. Averaging the two directional minima gives RTT(i↔r_j). Nodes broadcast the minimum measurements for public reproducibility (Sec. 3.2.2–3.2.3, pp. 2641–2642).

The paper explains the purpose of the nonce: “By including an unpredictable nonce, an adversarial node cannot respond to an incoming probe before it arrives, which eliminates the capability to fake a shorter distance.” (Sec. 3.2.2, p. 2642). Symmetry also makes a very fast or slow forged direction lower the confidence scores of both participants.

Verus form (Inference): represent a measurement record with source, destination, nonce, and RTT, and specify that an accepted response contains the request's nonce. Prove that the reported minimum is no greater than each retained sample and that the average is the stated two-direction expression. Network arrival times, nonce unpredictability, and ICMP behavior are environmental assumptions. The nonce alone does not authenticate the responder against an adversary in the underlying network; Sec. 5.6.3 proposes hashing the nonce with an authenticated shared secret (pp. 2649–2650).

## technique 3: gradient-descent trilateration with an empirical noise model

Use this to estimate coordinates from noisy distances. First compute great-circle distances from a candidate location to each reference's claimed coordinates. Convert the averaged RTT through the inverse speed function f⁻¹ to obtain measured distances. Compute each absolute discrepancy Delta_j between candidate and measured distance, weight it by empirically fitted omega_j, and minimize the weighted root-mean-square error over candidate coordinates with iterative gradient descent. The result is loc-hat_i, the location best fitting all references (Sec. 3.3.1, pp. 2642–2643).

Appendix A explains the model: “The Internet speed function is in fact distance-dependent, with speeds being higher (and noise lower) for longer distances than for shorter ones.” (p. 2652). The authors collect 1.8 million measurements within two days, plus sets of 60k and 30k weeks later to check RTT-distribution stability. They remove nodes whose measurements imply faster-than-light propagation. The setup uses servers in 16 known worldwide locations and 6042 Tor relays, with approximate GeoIP locations for the relays (Appendix A, p. 2652).

Verus form (Inference): specify the distance and RMSE functions as `spec fn`s and prove that one iteration preserves coordinate bounds and does not increase the stated error under an explicit step-size condition. Proving convergence is outside the paper and should not be claimed; the implementation can instead verify arithmetic, finite iteration counts, and output validity.

## technique 4: zone verification by intersecting speed-bound circles

Use this when the decision concerns a country or jurisdiction rather than exact coordinates. Set an upper speed bound b_u=2/3·c and convert each averaged RTT to a maximum distance using that bound. Sort references by distance, draw a circle around the closest reference, then iteratively intersect it with circles around the remaining references, stopping when additional references no longer shrink the area. Apply a grid to the target area, compute likelihood scores from each point's consistency with measured RTTs, normalize, and sum the scores within each zone. Compare the highest-scoring zone with the claimed zone to make the binary zone decision (Sec. 3.3.2 and Figs. 4–5, pp. 2643–2644).

Separately, the confidence check uses the claimed locations and each directional RTT to test propagation speeds. Its lower bound is b_l=l(x)(1−tau), where l(x) is the lower 95% confidence bound of the speed fit; its upper bound is b_u=2/3·c. A pair counts as good only if both directions satisfy both bounds. The confidence score c_i is the number of good pairs divided by |R_i|. A threshold υ accepts or rejects localization results on confidence grounds (Sec. 3.3.3, p. 2643). In the adversarial simulations, tau=0.01 and υ=0.2 (Table 1, p. 2645).

Verus form (Inference): define a pure `spec fn` for circle intersection and a `proof fn` that each retained grid point satisfies every processed upper-bound constraint. A loop `invariant` can maintain that the current candidate set is a subset of the previous set. Floating-point geodesics and the empirical model need a fixed-point or bounded-error abstraction; the paper does not supply a formal numerical proof.

## technique 5: confidence scores as an attack detector

When both target and reference are adversarial, the attacker can fabricate both directional timings to fit their claimed locations. Against an honest reference, it can also fit both directions if the claimed target location is farther from that reference than the true location: it fabricates its own report and delays the response measured by the honest reference. If the claimed location is closer, the attacker cannot shorten the honest reference's measurement. That measurement can then appear too slow for the claimed distance and violate the lower speed bound. Either direction violating either speed bound makes the pair unreliable and lowers both participants' scores. The confidence threshold filters localization results; successfully verifying a false zone also requires the estimated zone to match the false claim (Secs. 5.1, 5.4–5.5, pp. 2645–2648).

The paper reports that with 25% malicious nodes, benign and malicious score distributions begin to overlap (Fig. 10, p. 2647). At 30% compromise the simulation has 3 false positives, 105 false negatives, and recall 0.82, while at 20% it has 0 false positives, 23 false negatives, and recall 0.96 (Table 2, p. 2648). The denominator is the 1,000-node simulation setup, with all adversarial nodes claiming false locations in this experiment. These simulations randomly choose false claims in countries different from the nodes' actual countries (Sec. 5.2, p. 2646).

Verus form (Inference): model a score as an integer count over a fixed reference vector, prove 0 ≤ good ≤ |R_i| and that the computed rational score equals good/|R_i|. Contracts can enforce that an accepted node meets υ. Detection probability and adversarial behavior remain statistical claims, not deductive consequences.

## evidence, limits, and deployment numbers

In the benign simulation with N=1000 and a target minimum of 80 references, median localization error is 103 km, average error 122 km, and country verification accuracy 92% (Sec. 4.3, pp. 2644–2645). In the Nym deployment, the filtered European dataset contains 943 of 3,460 VerLoc-enabled nodes and 852,870 measurements, averaging 902 references per node. The authors sample references while excluding duplicate locations. With R=40 or R=80, median error is 60 km and average error 178 km; the median differs by less than 0.5 km between those reference counts. With tau=0.2 and υ=0.2, two thirds of nodes exceed the confidence threshold; the median is 55 km for c_i>υ and 256 km for c_i<υ (Sec. 6.2, p. 2650). The prototype measured all thousands of nodes and published JSON files at individual nodes, whereas the proposed protocol uses 40–80 references and secure broadcast (Sec. 6.1, pp. 2649–2650).

The protocol broadcasts 200 bytes per node at R=40 (5 bytes per RTT/reference identifier), so a 10,000-node network broadcasts about 2 MB per run. The encoding allocates 20 bits each to the reference identifier and RTT, supporting up to one million nodes and 1 µs RTT granularity. Each node sends 8,000 ICMP pings per run, once or twice daily; the non-optimized Python analysis takes under 120 ms per node with 40 references (Sec. 7, p. 2651).

The design assumes committed keys, addresses and locations; an unpredictable common beacon; full network connectivity; and authenticated, available, unalterable broadcast information (Secs. 2.1, 3.2.1, pp. 2638–2641). Its robustness threshold is empirical and comes from the European simulation setup: false positives first appear at 30% malicious nodes, and false negatives increase at 20% (Sec. 5.5, p. 2648). Strategic adversarial positioning is left for future work (Sec. 5.6.2, pp. 2648–2649). Location strings in the prototype cause parsing errors, and the deployment lacks independently verified locations: “Furthermore, we have no access to ground truth information to check the correctness of the self-reported location.” (Appendix B, p. 2652). The comparison with GeoIP is a sanity check, not trusted ground truth.

## techniques for the catalog

- beacon-derived reference sets: hash a fresh beacon and committed public keys to select pseudorandom references, then add reciprocal references
- nonce-bound RTTs: require a fresh challenge nonce and retain the minimum of repeated probes in both directions
- empirical trilateration: minimize weighted RMSE between candidate great-circle distances and inverse-speed RTT distances
- speed-bound zone intersection: intersect circles derived from an upper propagation-speed bound to produce a feasible target area
- confidence scoring: divide in-bound bidirectional reference pairs by the reference count and threshold the result
- adversarial threshold analysis: sweep malicious fractions and report TP, FP, FN, and recall with the simulation denominator
