# Advanced Computer Networking

## Misc

flow: same source&destination (IP&port) & protocol

- important: most traffic point-to-point
- concrete & fine-grained

NABC for research: (hook), need, approach, benefit, competition

dynamic host configuration protocol (DHCP): automatic IP address assignment

multiprotocol label switching (MPLS): show up on BGP

## *Some Reflections on Innovation and Invention*, George H. Heilmeier

- think about where field is going, not where it is
- involve researcher throughout deployment & business
- technology transfer: focus on what people "care about", what help people,
    not mathematical beauty
    - overcome existing benefit haver; marketing
    - everything need to work, or else fail
- catechism for DARPA funding/ startup: goal, existing solution,
    improvement & novelty, expected outcome, cost estimate

## *An Evaluation of The Ninth SOSP Submissions or How (and How Not) to Write A Good Systems Paper*, Roy Levin, David D. Redell

- paper category: implementation, theory, idea, measurement, survey,
    simulation
- know related work: old & new, peer-reviewed
- not readily solved by existing approach (or w/ tweak)

## *The design philosophy of the DARPA Internet protocols*, David D. Clark

- Internet: multiplexed utilization of existing interconnected networks
- Internet was for military
    - anticipate failure
        - fate-sharing: endpoint deal with failure.
            guarantee and easy but inefficient
    - protocol do not tell participant what fail
    - accountability, host attachment, cost efficiency are lowest priority
- to connect existing network, bar is low
    - adopt packet switching; gateway: packet switch
- distributed management was lower goal → the BGP mess
- UDP/TCP/IP was split from network control protocol
    (NCP)—NCP was too specific and bad for latency
    - goal to support different application
    - when designing, did not anticipate actual challenge
- protocol loose → realization determine what goes
- datagram is the basis of Internet flexibility
    - high utilization: statistical multiplexing
    - drawback: no guarantee, header overhead, difficult to
        manage & troubleshoot

## *On the Naming and Binding of Network Destinations*, Jerome H. Saltzer

- type of name
    - name: the thing
    - address: where
    - binding: mapping name to address
    - route/path: how to get there
- movable; mnemonic; identity

## *End-to-end arguments in system design*, J. H. Saltzer, D. P. Reed, D. D. Clark

- handling failure in middle do not void need to do so
    at end—no fundamental effect
    - cost of duplication
- low level check help performance, but need not be perfect
- example: checksum, encryption, dedup, FIFO, transaction, RISC
- what end mean depend on application

## *Tussle in Cyberspace: Defining Tomorrow's Internet*, David D. Clark, John Wroclawski, Karen R. Sollins, Robert Braden

- tussle: conflict of interest among party
- need to allow various outcome for place w/ tussle
- should modularize design to separate tussle
- design for choice

## *Congestion Avoidance and Control*, Van Jacobson, Michael J. Karels, SIGCOMM 1988

- obvious window-based transport protocol implementation cause 100x slowdown
- need to get to connection equilibrium → slow start
- preserve equilibrium → round trip timing consider variance
    - goal: keep bottleneck full
    - self-clocking: packet spacing follow ACK → follow bottleneck
    - avoid retransmission too soon
- resource limit: congestion avoidance w/
    [additive increase (AI)](../cs/networking.html#congestion-window-cwnd)
    - congestion detection: packet loss, ~~delay~~
    - congestion recovery: multiplicative decrease (MD)
- measure RTT: exponential weighted moving average
    (EWMA)—ACK time - sent time
- retransmission timeout (RTO)
    - TCP fast retransmit: retransmit when 3 duplicate ACK (TCP Reno)
    - TCP fast recovery: half `cwnd` instead of slow start
    - selective ACK (SACK): for missing packet

## *A Binary Feedback Scheme for Congestion Avoidance in Computer Networks*, Kadangode K. Ramakrishnan, Raj Jain, SIGCOMM 1988

- explicit congestion notification (ECN) router add congestion bit to packet,
    returned later in ACK
    - DEC bit/congestion indication (CI)
    - router: use average queue length over regeneration cycle
        (turns out not good)
- power: throughput${}^\alpha$ / delay
- efficiency: not retransmit unnecessarily
    - (throughput / knee throughput) / (delay / knee delay)
- fair share per flow
    - Jain fairness $\frac{(∑x_i)^2}{n∑x_i^2}$ where
        $x_i=\frac{A_i}{D}$ is allocation (bit rate) by demand per flow
    - can cheat by opening many flow
- avoid oscillation & congestion collapse
    - performance knee vs cliff, hysteresis
    - change slowly: per RTT
    - feedback filter & averaging: more consistent
    - no choke/ source quench: avoid more work
- math model & simulation for policy
- congestion control challenge: hard to predict, changing, delay in control

## *BBR: Congestion-Based Congestion Control*, Neal Cardwell, Yuchung Cheng, C. Stephen Gunn, Soheil Hassas Yeganeh, Van Jacobson

- better for WAN, cellular, large bandwidth+delay link
    - adapt to larger queue routers have now
    - avoid timeout & retransmission
    - CUBIC struggle to keep many packet in flight because of
        long feedback loop
    - BBR try to run at performance knee not cliff
- model ideal window size: bandwidth-delay product (BDP)
    = bottleneck bandwidth (BtlBw) × RTprop
    - BtlBw = delivered / time taken
    - assume RTT = RTprop + queuing delay $\eta$
- measure bandwidth periodically: window size & packet loss & ACK rate
    - pacing: additional to ACK self-clocking
    - try-faster (ProbeBW state, 98%): send 5/4 pace to
        probe bandwidth (multiplicative increase), then send 3/4 to drain queue
        - CUBIC keep probing at equilibrium → oscillation
        - BBR more aggressive ⇒ dominate bandwidth when sharing
    - try-slower (ProbeRTT state): send few packet to clear queue;
        probe RTprop by taking minimum
- startup state (slow start)
    - exit startup when BtlBw stay same for 3 RTT
    - drain mode to clear queue
- converge to fair share

## *BGP Routing Policies in ISP Networks*, Matthew Caesar, Jennifer Rexford

- BGP not designed to do business policy
    - many hack for business relationship & traffic engineering: Pref, MED,
        community
    - BGP not designed to do real-time load balancing
- manual & unscalable configuration
- trick to enhance security, no systematic solution
- when can avoid BGP: connect to single network, default routing
- BGP multihoming goal: reachability, cost, performance, latency,
    reliability, load balancing
- interior gateway protocol (IGP, e.g., OSPF)
    vs external gateway protocol (EGP)
    - internal BGP (iBGP): share BGP policy among an AS's router
- peering: link between router in 2 AS
    (any relationship)/ exchange traffic w/o money (peer-to-peer)
- no-valley rule (valley-free routing)
- internet exchange point (IXP): physical place where ISP swap traffic
    - e.g., AMS-IX (Amsterdam), One Wilshire (LA), LINX (London),
        DE-IX (Frankfurt)
    - network access point (NAP)
    - point of presence (POP)
- private network interconnect (PNI): 2 AS connect directly
    - may be fast/cheap/secure
- routing information base (RIB): BGP routing table
- BGP UPDATE message: announce/withdraw route
    - route = address prefix + next-hop router IP + AS path + policy
    - BGP attribute: LocalPref, multi-exit discriminator (MED),
        community string
    - selection:
        filter → highest LocalPref → shortest AS path → lowest origin ID →
        lowest MED → lowest IGP ID → lowest ID
    - AS path purpose: avoid loop (originally); assume fewer AS hop faster
        - AS path prepending (duplicate AS) → traffic engineering
    - equal cost multi-path (ECMP): load balancing
        - primitive alternative: manually split prefix

## *How the Great Firewall of China detects and blocks fully encrypted traffic*, Wu, Mingshi, Jackson Sippe, Danesh Sivakumar, Jack Burg, Peter Anderson, Xiaokang Wang, Kevin Bock, Amir Houmansadr, Dave Levin, Eric Wustrow

- censorship circumvention traffic type
    - steganograpic: look like allowed → mimicking: flawed
    - polymorphic: not look like forbidden → tunneling: need to
        align fingerprint w/ popular implementation
- GFW active probing: send carefully-crafted packet to server & see if
    it let me use as proxy → block residually for 180s. solved
- fully encrypted traffic look like random
    - research method: send random packet to detect censorship
- GFW passive detection
    - allow if average #set bit in each byte (popcount) is at least 0.6
        (30% of 8) from 4: random enough
    - allow if enough printable ASCII (`[0x20,0x7e]`): in first 6 byte of
        packet, or > 50%, or > 20
    - allow if match fingerprint of TLS/HTTP
- GFW blocking characteristics
    - limit #residual block: more blocked connection → shorter blocking
    - only block client immediately, ignore server
    - only examine first packet in TCP connection
    - only check packet to specific PI range (popular VPS provider AS, but
        not CDN)
    - only check packet w/ probability \~26%.
        know because #successful successive sending fit geometric distribution.
        → reduce false positive
- 0.6% false positive rate from empirical real traffic
- circumvention:
    - trivial: prepend exempt start byte
    - sophisticated and extensible: pad popcount & shuffle

## *Routing Stability in Congested Networks: Experimentation and Analysis*, Aman Shaikh, Anujan Varma, Lampros Kalampoukas, Rohit Dube

- simulate & Markov model OSPF & BGP up-to-down (U2D) & down-to-up (D2U)
    timing when overload
- OSPF: only overload factor matter, not packet size
- BGP: helped&screwed by TCP reliability (slower U2D & D2U)
- routing can fail because, in IP, they go through same link as data
- queuing theory & Markov chain
- both detect failure by periodically sending hello (OSPF)/ keepalive (BGP)

## *Why Is It Taking So Long to Secure Internet Routing?*, Sharon Goldberg

- BGP is easy to attack
    - prefix hijack: bogus BGP announcement; subprefix hijack:
        announce more specific prefix
    - route leak: announce route to too many
    - blackhole: route to nowhere
    - interception: route through eavesdropper
- defense
    - prefix filtering
        - problem: no incentive P2P or P2C or Tier-1
    - Resource Public Key Infrastructure (RPKI): sign prefix ownership
        - sign route origin authorization (ROA); put in
            regional internet registry (RIR)
        - prevent hijack → incentive, but not leak
        - PKI can be attacked; failing check break routing
    - Border Gateway Protocol Security (BGPsec): sign BGP announcement
        - need online crypto → need new router
        - little useful unless all adopt

## *In Search of the Elusive Ground Truth: The Internet’s AS-level Connectivity Structure*, Ricardo Oliveira, Dan Pei, Walter Willinger, Beichuan Zhang, Lixia Zhang

- AS topology graph: node = AS, edge = BGP session
    - essential for understanding connectivity/routing for, e.g., simulation
    - reveal business dispute, policy/sanction (de-peering)
- business relationship: customer-provider (C2P), peer-to-peer (P2P),
    sibling (same organization)
- invisible link: never show up
    - P2P link never show up unless either peer has vantage point
    - Internet flattening:
        eyeball ISP & hypergiant & content provider peer everywhere via IXP
- hidden link: show up gradually
    - backup link only show up when primary fail (~100 day)
    - C2P link show up eventually in routing table
    - hard to see on lower hierarchy; good measurement on
        Tier-1 after a while
- measure routing ground truth
    - BGP table & BGP update from RouteViews, RIPE RIS → reliable
    - topology from R&E network (research & education)
    - private router config & syslog from Tier-1
    - traceroute problematic: map IP to AS
    - AS topology is never complete

## *Trinocular: Understanding Internet Reliability Through Adaptive Probing*, Lin Quan, John Heidemann, Yuri Pradkin

- detect Internet outage: reachability to /24 block
    - parsimonious: adaptive probing by Bayesian inference
        - minimize unsolicited traffic (background radiation) to < 1% by
            sending only when necessary
        - use block history to bootstrap
        - belief: increase a lot when probe success, decrease a bit when fail
            - go outside threshold → conclude
        - availability (priori of #IP that always replied): $A(E(b))$
            - need to probe more to be confident if low availability
    - send at regular interval (11min) for freshness
        - predictable: probability for correct conclusion for
            outage is proportional outage duration when shorter than interval
    - internet control message protocol (ICMP) echo request (ping)
        - positive reply
        - error reply: unreachable
        - no reply: firewall, routing/transmission failure (outage),
            IP not used any more, computer sleep
        - probe whole block to distinguish outage
    - combine multiple vantage point (VP) → avoid interference from
        failure near VP
- internet outage
    - cause: cable cut (shark/backhoe), routing/DDoS attack,
        configuration error, power outage

## *How the Internet reacted to Covid-19 – A perspective from Facebook’s Edge Network*, Timm Böttger, Ghida Ibrahim, Ben Vallis

- when lockdown hit, Internet usage grew a lot but did well
- broadband traffic increased much more than mobile
- massive effort to get capacity, i.e., build more broadband
- bad session rate: indicate congestion
    - India more affected: less infrastructure, more population
- traffic overflow: go through transit provider instead of peer (PNI, IXP)

## *Analysis and Simulation of a Fair Queueing Algorithm*, Alan Demers, Srinivasan Keshavt, Scott Shenker

- queueing algorithm do not control congestion, but fairness
- allocating bandwidth & promptness & buffer space separately
- need to work w/ different source flow control & routing
- difficulty: distributed, different RTT, per-flow state
- first-come-first-serve (FCFS): source determine bandwidth
    - why not: cannot assume everyone cooperate
- round-robin (Nagle): fair, but not efficient
    - source over-sending cause long queue for them
    - ignore packet size
- prerequisite for fair queueing
    - protection against ill-behaved source
    - continuous wrt packet arrival time, on average
- fair queueing (FQ): max-min fairness
    - per source-destination pair (conversation)
    - emulate bit-by-bit round-robin (surely fair)
        - bit-by-bit impossible: packet size differ
    - bidding: lower delay for link using less bandwidth
    - preempt: stop sending current packet to send newly arrived short packet

## *Controlling Queue Delay*, Kathleen Nichols, Van Jacobson

- problem: competition among user of network; router want high bandwidth but
    user want low delay
- bufferbloat: large standing queue → high delay
    - e.g., in router before bottleneck, when
        sending rate match bottleneck rate, may have a standing queue
    - cause: lots of cheap memory, sustained & large traffic
- active queue management (AQM) in router
- random early detection (RED)
    - impossibly hard to configure
    - low utilization when high delay
    - cannot adapt different bit rate
- CoDel: new AQM to succeed RED
    - easy to deploy
    - track minimum queue size over 1 RTT
        - to see if queue drain
            (queue size < maximum transmission unit (MTU))
        - MTU: determined by hardware
        - RTT: just use maximum RTT on Earth (300ms)
- packet-sojourn time: how long packet stay
    - drop packet/ set ECN early to slow sender down
    - good queue: at least 1 packet sojourn time on target in 1 RTT

## *Congestion Control for High Bandwidth-Delay Product Networks*, Dina Katabi, Mark Handley, Charlie Rohrsy

- design transport protocol & router from scratch
- explicit feedback: router tell transport layer what to do
    - router give positive/negative feedback ($T_p,T_n$) when sender want to
        send more than router can handle
    - receiver copy congestion header and send to sender
- necessary: future link will have high BDP
- separate efficiency controller (EC) & fairness controller (FC)
    - do not want per-flow state in router
        - packet tell router sender's `cwnd` & RTT
        - $\xi_n$, etc.
    - add EC and FC result together for feedback
- FC: AIMD for fairness
    - shuffle to avoid stuck in unfair steady state
- very good performance in simulation
    - few drop
    - high throughput, fast convergence
        - TCP probe slowly, expensive drop
    - low delay
- cannot deploy: firewall, modify router & kernel
- use case: (between) data center, satellite, CDN/WAN
    - doable in software-defined network (SDN)

## *Directed Diffusion: A Scalable and Robust Communication Paradigm for Sensor Networks*, Chalermek Intanagonwiwat, Ramesh Govindan, Deborah Estrin

- wireless/mobile network tricky
    - device move
    - bit rate & bandwidth change
    - less capacity
    - difficult security, jamming
    - different MAC protocol
    - power constraint
- sensor network: cheap & numerous—how to communicate
- protocol for sensor network
    - peer-to-peer: no IP address, use attribute/ named data
    - where to send: interest, gradient → flood/multicast
        - respond w/ data if we have
        - reinforcement: become faster by sending via low-delay path
        - negative reinforcement: shut down slow path if have multiple path
    - process in the network to reduce traffic
        - constrain flooding (expensive) by location
        - reinforce single path
        - duplicate suppression respond w/ cache
        - → save energy (battery)
        - do better than omniscient multicast (idealized)
        - lose advantage if listening is more expensive than sending
            (802.11 radio vs TDMA-MAC)
            - need scheduled listen MAC, e.g., S-MAC
- compared to in-network processing in Internet
    - different from BGP: smaller scale, more dynamic, on-demand
        (not ahead of time)
    - firewall
    - 5G edge computing
    - not much, bc not collaborative
- naming in sensor net: attribute-based, key-value pair
    - not IP bc dynamic—do not know who to talk to
    - application level info (location, sensor type) in network to optimize
    - not end-to-end bc trust participant, care only about data

## *An In-depth Study of LTE: Effect of Network Protocol and Application Behavior on Performance*, Junxian Huang, Feng Qian, Yihua Guo, Yuanyuan Zhou, Subhabrata Sen, Qiang Xu, Z. Morley Mao, Oliver Spatscheck

- inefficient 4G application
    - video streaming: periodic short request burst, lose throughput
        - battery inefficient: turn off and on radio
- protocol inefficiency
    - high BDP: TCP receive window too small
        - low bandwidth utilization
    - HTTP keep TCP connection alive: waste battery
        - need to wake up radio when closing connection
- LTE different from wired: radio sleep, battery
    - 400ms delay when radio wake up
- performance enhancing proxy (PEP): compression, caching,
    split TCP connection into 2
- long lingering flow: last payload byte to flow end similar to
    TCP flow duration
    - many longer than LTE tail time (radio sleep timeout)
- main latency source: wired part of network
    - cause: big queue (buffer bloat)
    - passive bandwidth estimation in middle of network

## *A Variegated Look at 5G in the Wild: Performance, Power, and QoE Implications*, Arvind Narayanan, Xumiao Zhang, Ruiyang Zhu, Ahmad Hassan, Shuowei Jin, Xiao Zhu, Xiaoxuan Zhang, Denis Rybkin, Zhengxuan Yang, Z. Morley Mao, Feng Qian, Zhi-Li Zhang

- 5G vs 4G
    - millimeter wave (mmWave) frequency: many bandwidth, high throughput
        - shorter range, more interference
    - new radio transition state
    - edge computing
- deployment: stand alone (SA) vs non-stand alone (NSA)
    - use 4G signaling & control plane vs use 5G
- challenges: interference from Internet measurement, difference in device
    - complex & proprietary infrastructure
- latency: linear to device-server distance
    - mmWave slightly better than low-band & 4G
    - NSA worse than SA
- throughput: drop by distance if single connection bc CUBIC
    - stay fast if multiple connection
    - NSA worse than SA
    - uplink much slower than downlink (2x or 10x)
- handoff: switch radio while driving
    - vertical vs horizontal: different technology vs same
    - many handoff, many vertical
- idle transition: latency spike when radio sleep
    - mmWave high energy cost
- quality of experience (QoE)
    - video streaming: more stall & less throughput on 5G
    - web browsing: lower latency on 5G, but cost more energy
        - not worth it for battery if not need higher speed

## *On the Self-Similar Nature of Ethernet Traffic*, Will E. Leland, Murad S. Taqqu, Walter Willinger, Daniel V. Wilson

- network traffic self-similar (fractal) on different time scale
    - bursty, packet dependent on each other
    - time scale matter
        - very different mean & variance on different time scale
        - not smooth
- Poisson process model not fit, not bursty at large time scale
    - memoryless → smooth when large scale
- better model
    - only parameter: Hurst parameter $H\in(\frac{1}{2},1)$
    - measure self-similarity: evaluate R/S over different time scale
        - R/S: range/standard deviation; $H$ is slope
    - spectral density power law near origin
    - generate from fractional Gaussian noise
- who care: understand real-world performance when designing network
    - how big buffer: BDP
    - macroscopic traffic analysis
- significance: people go at the same time, burst sometimes long
    - need over-provision, will fail
- long-range dependence: current value matter long into future
    - self-similar: variance decrease very slowly as time scale grow
    - auto-correlation: how much I look like myself
        - convolution of $f(t)$ and $f(t+\tau)$
        - large auto-correlation → self-similar
    - show up on time-variance, range/std, periodigram

## *Self-Similarity in World Wide Web Traffic: Evidence and Possible Causes*, Mark E. Crovella, Azer Bestavros

- why self-similar: heavy-tailed Pareto distribution
    - superposition: many sending in this distribution
        - web traffic heavy-tailed
    - linear in log-log CCDF plot
    - infinite variance when $\beta<2$, infinite mean when $\beta<1$
    - transfer time
    - distribution of file size
        - few very large file
- web active/inactive regime (on/off): two separate power law
    - disagreed and modeled w/ Poisson

## *Internet Inter-Domain Traffic*, Craig Labovitz, Scott Iekel-Johnson, Danny McPherson, Jon Oberheide, Farnam Jahanian

- flattened Internet: more CDN, hypergiant, eyeball ISP, P2P reduce
    - data centralization: cloud, big player dominate
        - lots of content
    - Google shifted to own data center & bought YouTube
    - Comcast merged w/ other & started CDN
    - P2P: direct downloading easier & got better at hiding bc legal
- consolidation to few AS
    - big get bigger; migration to cloud
- data: security appliance in ISP
    - many big ISP
    - cannot share proprietary

## *MapReduce: Simplified Data Processing on Large Clusters*, Jeffrey Dean, Sanjay Ghemawat

- fault tolerance: task as intermediate abstraction
    - re-execute failed task; redundant task; straggler elimination
- Hadoop, Dryad, Spark, Zookeeper, Hive, Pig, HBase

## *The Tail at Scale*, JeffRey Dean, Luiz André Barroso

- tail matter: worst get remembered; parallel computing
- countermeasure: micro-partitioning, partial result
    - hedged queries: send task to multiple server, cancel slow

## *Rethinking Enterprise Network Control*, Mart ́ın Casado, Michael J. Freedman, Justin Pettit, Jianying Luo, Natasha Gude, Nick McKeown, Scott Shenker

- Ethane: SDN to control switch centrally for enterprise
    - evaluate flow → accept/drop/waypoint
    - cheaper than layer 2 for security change
- goal: survivability, multiple link layer, multiple app, accountability,
    manageability
    - support enterprise security, authentication, law enforcement, logging
- smart controller, dumb switch
    - switch send first flow to controller, get policy
    - centralize: easy to manage, but latency & single point of failure
    - switch watch for per-package cost; controller per-flow
- flow security language (FSL): define name-based flow policy
    - dynamic group
    - compile to C++
- commercialized as OpenFlow & Nicira

## *P4: Programming Protocol-Independent Packet Processors*, Pat Bosshart, Dan Daly, Glen Gibb, Martin Izzard, Nick McKeown, Jennifer Rexford, Cole Schlesinger, Dan Talayco, Amin Vahdat, George Varghese, David Walker

- protocol-independent language (P4): generalize forwarding plane policy
    - OpenFlow getting more and more header field
- run on switch w/ ASIC/NPU at line rate
- header, parser, table, action

## *VL2: A Scalable and Flexible Data Center Network*, Albert Greenberg, Srikanth Kandula, David A. Maltz, James R. Hamilton, Changhoon Kim, Parveen Patel, Navendu Jain, Parantap Lahiri, Sudipta Sengupta

- build data center for cloud provider
- goal for future
    - agile: run any app on any server ⇒ high utilization
    - performance isolation:
        no CPU/network interference between app (virtualization, VLAN);
        QoS ⇒ security, keep abstraction in service level agreement (SLA)
    - flat addressing (LAN, layer-2 semantics): address isolation,
        migrate w/o changing IP, cheap switch w/ small table
        - layer-2.5 shim
    - hardware: cheap, commodity
- topology: valiant load balancing (VLB), equal cost multi-path (ECMP),
    - high utilization in core network even when router fail
    - Clos: full bisection bandwidth
- network switch: top-of-rack (ToR), aggregating switch
    (join different rack), core switch
- power, cooling
- provide abstraction: infinite compute capacity, isolated resource,
    flat network (LAN)
- traffic analysis
    - most flow small; most byte in big flow
    - somewhat random by design

## *Engineering Egress with Edge Fabric Steering Oceans of Content to the World*, Brandon Schlinker, Hyojeong Kim, Timothy Cui, Ethan Katz-Bassett, Harsha V. Madhyastha, Italo Cunha, James Quinn, Saif Hasan, Petr Lapukhov, Hongyi Zeng

- BGP not ideal for large content provider:
    not capacity-aware/performance-aware
- Facebook want high QoE, low cost
- Edge Fabric solution: forecast how much traffic will go through each link
    - look at latency
    - run in each point of presence (PoP)
- components: aggregation switch (ASW), peer router (PR, core router)
- capacity-aware
    - goal: shift traffic from overloaded peering
    - algorithm: compute alternative path for overloaded
    - output: override BGP route w/ LocalPref&MED to detour traffic
- performance-aware
    - goal: shift traffic to low-latency path
    - input: traffic w/ differentiated service code point (DSCP) to
        indicate QoS expectation
    - algorithm: reroute if alternative path has lower latency
        - split some traffic to A/B test
    - use tunneling to reroute
- central load balancer: use DNS to map user to PoP

## *B4: Experience with a Globally-Deployed Software Defined WAN*, Sushant Jain, Alok Kumar, Subhasree Mandal, Joon Ong, Leon Poutievski, Arjun Singh, Subbaiah Venkata, Jim Wanderer, Junlan Zhou, Min Zhu, Jonathan Zolla, Urs Hölzle, Stephen Stuart, Amin Vahdat

- goal: avoid over-provisioning WAN (30%), high utilization (90%)
    - avoid loss/congestion; handle link failure
    - high priority user traffic
    - low cost: commodity switch & router
    - support traffic growth
- solution: SDN (OpenFlow)
    - traffic engineering (TE)
    - replicated centralized controller: efficient, optimal
    - per datacenter OpenFlow controller (OFC) & redundant routing (Quagga)
        - fault tolerance
        - app control
- why Google can do
    - control everything: traffic generation, access router, backbone
    - classify source: low priority for
        latency-insensitive large data transfer
- assumption:
    - elastic bandwidth (different priority), app control
    - few dozen data center: limited scale
- custom per-site software
    - customer OFC: replicated, synchronized w/ Paxos
    - custom routing w/ Quagga & BGP/ISIS
- group app into flow group (FG): better QoS
- TE map FG to tunnel group (TG): reduce #group for scalability
    - max-min priority of FG into TG
    - rate limit incoming traffic to router bandwidth: avoid drop in
        backbone; predictable traffic
- TE fail open: still can send traffic
- multiple path for each tunnel for link fault tolerance
- no drop for high priority traffic; drop low priority
- failure if many thing go wrong

## *Networking Named Content*, Van Jacobson, Diana K. Smetters, James D. Thornton, Michael Plass, Nick Briggs, Rebecca Braynard

- content-centric network (CCN): content as primitive, not identity, host,
    etc.
    - protocol: request w/ interest, respond w/ data
    - support multicast by default
    - hierarchical, variable-length name instead of IP address
- content-based security: SHA256 checksum on content, not host
    - pertinence: answer to what question; in the name
    - provenance: who say it; by public key signature
- efficiency: get from nearest router cache
    - larger header for interest → 20% overhead;
        higher performance w/ more packet in flight
    - fast handover
- reliability: multiple source; data provenance/origination/integrity from
    security
    - receiver responsible to clarify
- stability: interest/data ACK-clock
- new waist in network stack above IP
- CCN naming: no location, say what content is
    - hash, signed, maybe human-readable (meaningful)
- is routing protocol: send interest around; interest data 1:1
    - window of interest; pipelining
- DDoS protection: caching; aggregation; block those w/ random interest
- policy & filtering (content firewall): signature-based
- low throughput & high latency bc large header ⇒ need pipelining
- automatic failover: fault tolerant

## *Fundamental Design Issues for the Future Internet*, Scott Shenker

- revisit Internet architecture in 1995
- can we do QoS? yes
    - app do not have real QoS
    - QoS give guarantee of performance
- how to do QoS
- goal of Internet is user satisfaction: utility & efficacy
    - utility: often step function: linear, fixed-rate, elastic,
        semi-adaptive
- best effort: maybe do not want guarantee; avoid high cost
- inelastic traffic, all or nothing: maybe QoS
    - admission control: block some flow when congestion
        - make sense if utility convex near origin
- solution choice; service model: what app ask from network
    - overprovisioning: way enough bandwidth so no worry, but waste money
    - integrated service (IntServ), QoS: reserve bandwidth, but
        expensive router
    - differentiated service: prioritize
    - user adapt
    - parallel network (e.g., cellular + WiFi): fault tolerance,
        optimize each, but double cost
- service model may have QoE, but may be abused, depended; app need to
    know what it want
- network neutrality: should ISP have special deal w/ content provider to
    prioritize
    - "zero rating": content provider pay for user data

## *Click Trajectories: End-to-End Analysis of the Spam Value Chain*, Kirill Levchenko, Andreas Pitsillidis, Neha Chachra, Brandon Enright, Mark Felegyhazi, Chris Grier, Tristan Halvorson, Chris Kanich, Christian Kreibich, He Liu, Damon McCoy, Nicholas Weaver, Vern Paxson, Geoffrey M. Voelker, Stefan Savage

- characterize spam
    - domain: sell similar product
    - ordering product, where from, how paid
- motivation: spam bad, shady product, high cost anti-spam
- bottleneck in spam
- observation: global, big business, speciality
- spam franchise:
    1. send many "attractive" message, (botnet)
    1. bulletproof hosting service
    1. payment
    1. deliver product
- data collection: parse spam, crawl website, cluster & tag content,
    buy product
- most spamming service use only a few DNS server/registrar/AS, but hard to
    take down all
- 95% service use a few bank: good target bc bank slow

## *Investigating Large Scale HTTPS Interception in Kazakhstan*, Ram Sundara Raman, Leonid Evdokimov, Eric Wurstrow, J. Alex Halderman, Roya Ensafi

- nation-state man-in-the-middle intercept encrypted HTTPS
- can intercept TLS a.l.a.
    let people use your key by controlling certificate authority (CA)
- measure: visit sensitive website from VP within Kazakhstan
    - probe from outside: visit forbidden website at HTTPS server in
        Kazakhstan; work bc Kazakhstan not care direction
- interception trigger: targeted domain in TLS Server Name Indication (SNI)
    header
- countermeasure: TLS 1.3 encrypt SNI, server or
    browser reject government certificate

## *The Menlo Report: Ethical Principles Guiding Information and Communication Technology Research*, David Dittrich, Erin Kenneally

- information and communications technology research (ICTR)
    - Belmont principles: respect for person (informed consent),
        beneficence (min harm max benefit), justice (unbiased subject)
    - respect law & public interest
- current institutional review board (IRB) should apply to ICTR
- respect for person hard bc networking is indirect & large-scale
- beneficence hard bc hard to predict outcome
- justice hard bc lack control of demography

## *Tor: The Second-Generation Onion Router*, Roger Dingledine, Nick Mathewson, Paul Syverson

- deployable low-latency anonymous web browsing
    - circuit: amortize setup cost, reduce latency, avoid congestion
    - easy to use
    - relatively simple
    - want anonymity among crowd
    - TCP-only bc mainly for web browsing
- non-goal: peer-to-peer, end-to-end attack security, sender anonymity from
    receiver, conceal user identity (steganographic)
- anonymity: receiver & proxy do not know who sender is
    - proxy only know previous & next hop
    - perfect forward secrecy: nested encryption so that
        each hop can only decode enough for next hop
    - backward anonymity: remap IP
- threat: proxy compromised, traffic visible, timing (not addressed)
- onion proxy (OP): first hop, know sender & see content
- onion router (OR): middle hop
- exit node (EN): last hop, know sender & see content
- circuit: path through OR
- incremental circuit building: establish encrypted tunnel to next hop from
    public key encryption, one by one
- application-level anonymity: need separate proxy (e.g., Privoxy)
- rendezvous point of location-hidden service
    - directory of server for Tor path to server
