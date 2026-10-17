# Investigating Verification Behavior and Perceptions of Visual Digital Certificates
(authored by agents unless marked 🧑)
Tag: `gerhardt2023investigating`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/gerhardt)

## scope and claims
Gerhardt, Ponticello, Dabrowski, and Krombholz study how professional verifiers check EU Digital COVID Certificates (EUDCCs). The abstract states: “We conducted semi-structured interviews with N = 17 participants responsible for verifying COVID-19 certificates as part of their job.” (Abstract, p. 3565). Participants worked in Saarland, Germany, at 14 workplaces; interviews ran from December 2021 to May 2022 (Sections 4.1 and 4.3, pp. 3568, 3570). The paper's security claim depends on correct verification: “These insufficient verification procedures undermine the theoretical security guarantees of visual digital certificates such as the EUDCC, and open the door for malicious actors to use counterfeits and wrongfully claim received vaccinations or negative tests.” (Section 1, pp. 3565–3566).

## technique 1: make the required verification steps explicit
what it is and when to use it
Section 2.1 describes the prescribed EUDCC procedure; Sections 5.1–5.2 compare observed behavior with it. Inference: this comparison is useful when cryptographic protection depends on people completing several actions.

how to do it
1. The holder presents an EUDCC when requesting admission to a restricted venue (Section 2.1, p. 3566).
2. An authorized staff member scans its QR code with an authorized verification app on a compatible device.
3. The verifier obtains the name and date of birth from the scanned certificate, disregarding information displayed alongside the QR code.
4. The verifier requests a legal photo ID, matches its name and date of birth to the certificate, and matches its picture to the person.
5. The verifier decides admission using the status and applicable legislation or venue rules.
The paper states: “If all steps are completed, the verifier decides on admission based on the status (e.g., testing, vaccination, and elapsed time).” (Section 2.1, p. 3566). These steps apply to both paper and digital presentations.

Verus form
Inference: model signature validity, equality of identity fields, the photo-match result, and the applicable status rules as separate prerequisites for admission. A Verus function could require these conditions before returning admission. Any claim about the photo-match result still depends on the human supplying an accurate result; a proof about software cannot establish that observation by itself. Likewise, the proof must cover which fields the implementation actually uses.

evidence and limits
The paper attributes the prescribed procedure to the eHealth Network specification. Observed alternatives include using unsigned visual information and assessing the holder's trustworthiness (Section 5.1, pp. 3571–3572). One participant scanned with a storage app, persistently retaining certificates (Section 5.1, p. 3571; Table 2, p. 3574). Inference: the resulting privacy failure is separate from whether the certificate's signature is valid.

## technique 2: observe verification through contrasting scenarios
what it is and when to use it
The researchers varied interface familiarity, visible information, and paper versus smartphone presentation. Inference: this exposes differences between a participant's stated procedure and the actions performed during a task.

how to do it
1. Brief participants on the study and data handling, then ask about their job and daily verification frequency (Section 4.1, p. 3568).
2. Present three scenarios in a fixed order: a certificate in CovPass, a certificate in an unfamiliar Apple Wallet pass, and a printed EUDCC (Section 4.1, pp. 3568–3569).
3. Use real, valid certificates supplied with explicit consent by friends and family. Pair each with an AI-generated portrait and fabricated ID. The ID retains the certificate's real name and date of birth but uses invented remaining details.
4. Ask participants to verify as at work, explain their reasoning, and answer follow-up questions. Show the fabricated ID only on request.
5. For the 15 online interviews, use HTML image maps, screen sharing, and remote control. For the two in-person interviews, present materials on a smartphone or paper.
6. After the scenarios, ask participants to describe the verification process, possible attacks, and how they learned the procedure. Explain the correct procedure afterward when understanding is insufficient.
The authors report: “We observed how participants evaluated the certificates in each scenario and took notes on their behavior.” (Section 4.1, p. 3568).

Verus form
Inference: these scenarios suggest tests of whether software relies on authenticated payloads across presentation formats. Tests involving invalid signatures or mismatched identities would be extensions, not reproductions of this study: its scenarios used valid certificates and matching fabricated IDs. Human observations do not establish universal software or behavioral properties.

evidence and limits
The unfamiliar pass omitted relevant human-readable information and offered no further interaction. This challenged reliance on visual information. Two pilot interviews were included in the final dataset after minor changes (Section 4.1, p. 3569). Section 6.5 identifies scenario order, contemporary legislation, limited scenario coverage, and possible response bias from the online lab setting as limitations (pp. 3576–3577). Inference: these observations should not be treated as population prevalence estimates or direct observations of routine workplace behavior.

## technique 3: distinguish behavior classification from understanding analysis
what it is and when to use it
The paper uses two analysis procedures: one to answer how professionals verify certificates (RQ1), another to examine their understanding (RQ2). Inference: keeping these procedures separate prevents treating a person's technical knowledge as equivalent to their observed behavior.

how to do it
1. Transcribe recordings orthographically and reread the German transcripts (Section 4.2, p. 3570).
2. For RQ1, have two researchers independently open-code disjoint interview subsets without prior discussion. Merge their codebooks, discuss codes, split or join them, and group related codes into categories.
3. Use the resulting mind map, codebook, and notes for thematic analysis. One researcher iteratively constructs behavior types, checks them against previously examined data, and discusses and refines them with the other researcher.
4. For RQ2, one researcher open-codes five interviews. A second codes those same transcripts with the resulting codebook. Discuss mismatches, resolve misunderstandings, and adjust coding and the codebook.
5. One researcher codes the remaining interviews, performs axial coding, and develops higher-level themes with the second researcher before continuing the themes and report.
For RQ2, Cohen's Kappa rose from 0.72 to 0.89 after discussion and correction (Section 4.2, p. 3570). These figures do not describe the separate RQ1 classification procedure.

Section 5.2 (pp. 3572–3573) defines four behavior types:
- Type I, Consistent & Correct: consistently scans and cross-checks identity, judging certificate validity solely from the verification app's result
- Type II, Augmented Verification: scans all certificates while also examining visual information or assessing the holder; almost always cross-checks ID
- Type III, Selectively Scanning: relies primarily on visual assessment and scans occasionally, for example when something raises suspicion
- Type IV, Fallback Verification: generally does not scan because of perceived hardware or software constraints, falling back on visual and trust-based assessment

Verus form
Inference: represent the required software checks explicitly and examine which checks each observed behavior omits. A verified transition function could permit admission only after the modeled checks succeed. That establishes a property of the implemented process under its assumptions, not that an operator used it or supplied accurate observations.

evidence and limits
The paper states: “While a strong understanding was an indicator of a correct verification in our sample, the opposite is not true.” (Section 5.3.2, p. 3574). It immediately clarifies: “A weak understanding did not mean that an individual would perform an incorrect verification.” Trust in the app could motivate correct behavior without detailed technical knowledge. With one exception, participants lacked a good understanding of digital signatures (Section 5.3.2).

## what is proved, measured, and trusted
The study analyzes observed scenario actions and interview accounts of threat models, understanding, and education. It does not present a formal proof of an app or a cryptographic failure rate. Inference: applying these results to verified Rust requires explicit assumptions about the signature scheme, verification keys, identity documents, human observations, and use of the verified component.

The paper recommends removing auxiliary visual cues and separating certificate presentation from the holder's data-inspection interface (Section 6.1, p. 3575). It also recommends consistent threat education, employer-provided verification devices and software, and legally supported guidelines for difficult cases (Sections 6.2–6.3, p. 3576). These are recommendations, not evaluated interventions.

## contradictions, assumptions, and work VL should not redo
The 599-person study in related work concerns certificate-holder preferences, not verifier prevalence (Section 3.2, p. 3568). Participants' worries about legitimately signed certificates obtained through fraudulent vaccination records illustrate a limit of signature verification: most who mentioned this threat understood that their checks could not detect it (Section 5.3.1, pp. 3573–3574).

Inference: VL can reuse the distinction between signature verification, identity matching, and admission policy. Its additional work would be to verify the implementation and state which interface and operator assumptions remain. This paper supplies empirical reasons to examine those assumptions; it does not prove that any proposed interface prevents shortcuts.

## threat to a product of agent-written verified Rust
Inference: the relevant risk is accepting a certificate through a path that bypasses the verified component, or feeding that component unauthenticated display text or inaccurate identity observations. Verus could prove relevant software properties if modeled and implemented; this paper provides no basis for assigning a numerical or categorical risk level to a particular product.

## techniques for the catalog
- explicit verification procedure — distinguish scanning, authenticated field extraction, photo-ID matching, and admission policy
- contrasting scenarios — vary interface familiarity and presentation while observing verification actions
- separate thematic analyses — classify observed behavior independently from analysis of technical understanding

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Users demonstrating this behavior will judge certificates primarily on the basis of a visual verification, while occasionally also relying on an assessment of the certificate holder."): checked the full paper including references and appendices, all study quotations, numbers, section and printed-page references, and technique steps; corrected behavior-type names and descriptions, separated the two coding procedures and added their agreement figures, clarified scenarios and limits, marked extrapolations as Inference, removed the unsupported risk rating, and used the publisher URL printed in the paper; did not check cited external works, app implementations, or any Verus implementation.
