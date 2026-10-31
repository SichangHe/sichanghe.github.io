# MobileAtlas: Geographically Decoupled Measurements in Cellular Networks for Security and Privacy Research
(authored by agents unless marked 🧑)
Tag: `gegenhuber2023mobileatlas`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/gegenhuber)

MobileAtlas is a controlled cellular-network measurement and testing platform. The abstract says: “This allows testing any subscriber with any operator at any modem location within minutes without moving parts.” (Abstract, p. 3493.)

## technique: geographically decouple SIM identity from modem location

Use this when testing many operator/roaming combinations would otherwise require physically moving or duplicating SIMs and devices. MobileAtlas tunnels the low-bandwidth SIM protocol over TCP from a SIM card at one site to a remotely controlled modem elsewhere. The modem behaves as if the subscriber were locally present. The design chooses off-the-shelf, globally licensed modems instead of SDRs because real networks impose radio-regulatory constraints (Sec. 5.1, pp. 3497–3498).

Steps: (1) attach cards to SIM providers, centrally or at distributed sites; (2) request a particular SIM by its IMSI and open a TCP connection to its provider; (3) forward Application Protocol Data Units (APDUs) between that card and the probe, which emulates the SIM interface for its modem; (4) connect the modem to the selected operator; (5) execute measurements and retain results, network captures, and APDU records (Sec. 5.1, p. 3498; Appendix A.2, pp. 3508–3509). Appendix B specifies: “The TCP tunnel between a SIM emulator process on the probe and the SIM provider forms a virtual circuit in which one SIM can be connected to precisely one modem at a time.” (p. 3509.)

Verus form. Inference: model the tunnel as a state machine with a spec predicate that every request receives exactly one ordered response, and prove framing and sequence invariants with `requires`, `ensures`, and loop `invariant`. The physical modem, SIM cryptography, TCP implementation, and operator network remain external assumptions. A Verus proof cannot establish that a remote operator applied the intended subscriber identity.

## technique: isolated, controlled measurement execution

Use this when background traffic or host activity could contaminate measurements. MobileAtlas uses Linux network namespaces: “Such a network namespace has a separate device configuration and separate routing tables.” (Sec. 5.2, p. 3498.) Only selected processes use the cellular connection; SIM tunneling and management use a separate connection. The probes are stationary in the reported implementation (Sec. 8, p. 3505).

Steps: (1) create a separate network namespace; (2) initialize the cellular connection within it using ModemManager and NetworkManager; (3) execute the measurement in that namespace; (4) store results and manager logs in JSON, capture network traffic with tcpdump, and store tunneled APDU traffic separately (Appendix A.2, pp. 3508–3509). The paper states: “Only the containers traffic is routed through the modem and recorded to a PCAP file.” (Sec. 6.1, p. 3499.) Inference: a Verus harness should treat the namespace boundary as an environmental precondition and log a run identifier, input trace, and returned bytes; the proof covers the harness's data handling, not the OS isolation mechanism.

## technique: systematic metering and free-riding experiments

Use this to test whether operators bill traffic consistently across domestic and roaming paths. For DNS billing, the authors report: “External DNS traffic was always billed by all providers in both scenarios (i.e., domestic and roaming).” Two of 14 providers billed internal DNS only when roaming (Sec. 7.1, pp. 3500–3501, Table 1; March 2022). For Snapchat zero-rating, they tested four providers; three allowed free-riding through spoofed HTTP Host or TLS SNI names, and one billed legitimate Snapchat traffic while roaming (Sec. 7.2, pp. 3501–3502, Table 2; May 2022). Separately, all 14 providers used carrier-grade NAT for IPv4, only two offered IPv6, and all tested intra-EU roaming connections were home-routed (Sec. 7.3, p. 3502).

DNS steps: (1) check the current quota; (2) send repeated queries to the provider's DHCP-configured DNS server or an external self-hosted resolver until a chosen traffic volume is reached; (3) wait for billing to update and recheck the quota; (4) repeat for each SIM, country, and DNS server; (5) compare domestic and roaming billing (Sec. 7.1, pp. 3500–3501). Free-riding steps: (1) validate Snapchat zero-rating using app.snapchat.com; (2) send the same request to a controlled AWS server accepting arbitrary Host and SNI names; (3) test HTTP and HTTPS domestically and while roaming; (4) analyze billed traffic (Sec. 7.2, p. 3501). Accounting delays matter: “With most network operators, billing is not a real-time service.” (Sec. 5.3, p. 3498.)

To measure multiple traffic classes before delayed accounting updates, Sec. 5.3 proposes volumes of one MB, two MB, four MB, and so on. The authors explain: “Hours later, when the CDRs are available, it is possible to separate these traffic classes.” (p. 3498.)

Network-configuration steps: reuse connection parameters from earlier measurements, then test incoming filtering using ping and a low-volume nmap scan against the researchers' own publicly addressed device (Sec. 7.3, pp. 3501–3502). The authors state: “For IPv6, however, both providers (P-AT-1, P-AT-2) use public IP ranges.” P-AT-1 blocked incoming connections by default and allowed customers to disable that protection; P-AT-2 was externally accessible and offered no such option (p. 3502).

Verus form. Inference: specify a metering ledger relation and prove conservation between emitted-byte counters and recorded counters for an abstract provider model. External billing records are observations; no Verus theorem can guarantee an operator's implementation.

## technique: low-level APDU and side-channel analysis

MobileAtlas stores APDU traffic and inspects binary SMS generated by SIMs. The method reuses recordings from the earlier use cases: “By default, MOBILEATLAS stores all APDU traffic in a database.” Two of 14 SIM cards proactively sent SMS containing identifiable IMSI, ICCID, and IMEI fields; the remaining unidentified fields were static across observed messages (Sec. 7.4, p. 3502). The authors report: “Two of the 14 SIM cards (P-AT-2, P-RO-1) sent SMS to the home operator without indicating this on the screen.” They also report charges for these messages outside the EU's free-roaming area. Inference: for verified Rust, this resembles tracing hidden side effects around an API and checking that only specified effects occur.

## technique: call-progress tone fingerprinting

Use this to infer a roaming network from audio features. The authors recorded three call setups from one base point to a roaming target, switched the target SIM to another roaming network, and repeated, adding calls when results were inconclusive. They used SIMs from three operators in one country to test nine countries through 19 roaming partners (Sec. 7.5, p. 3503). Their recording procedure states: “For tone analysis, we cut off recordings after 20 seconds to ignore the following voicemail greeting.” They analyzed setup times, on/off times, amplitude, and frequency composition, and listened manually. Repeated recordings supported stability of base frequency, overtones, on/off times, and amplitude, with exceptions discussed on p. 3504; setup time was less stable. Circuit-switched calls mostly used target-generated tones; VoLTE more often used origin-generated tones. Inference: a Verus analogue would prove deterministic feature extraction from a byte/audio sequence, but the inference from tone to country remains statistical and environmental.

## techniques for the catalog

- SIM/modem geographic decoupling — tunnel low-level SIM protocol so one subscriber can test many remote operators
- isolated cellular measurement — use namespaces, controlled traffic, stationary probes, and complete protocol traces
- metering differential experiment — compare known traffic with delayed billing across roaming and protocol variants
- APDU side-effect analysis — capture and decode hidden SIM messages and stable identity fields
- call-tone fingerprinting — extract repeated audio features to infer a roaming operator or country
