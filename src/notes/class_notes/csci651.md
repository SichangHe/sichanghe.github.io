# Advanced Computer Networking

40 paper + 20hr+ programming project + similar research project

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
- TCP need to measure ideal window size: bandwidth-delay product (BDP)
    = bottleneck bandwidth (BtlBw) × RTT (RTprop)
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
    - backup link only show up when primary fail
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
    - good queue vs bad queue: compare to 1 RTT

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

<!-- TODO: clean up -->
- network traffic self-similar (fractal) on different time scale
    - Poisson model not fit, not busty at large time scale
    - bursty, packet dependent on each other
- superposition: many sending in this distribution
    - web traffic more heavy-tailed
- better model
    - only parameter: Hurst parameter $H\in(\frac{1}{2},1)$
    - what is self-similarity
- who care: understand real-world performance when designing network
    - how big buffer: BDP
- macroscopic traffic analysis
- burstiness: time scale matter
    - very different mean & variance on different time scale
    - not smooth
- significance: people go at the same time, burst sometimes long
    - need over-provision, will fail
- random process
    - CDF $a(t)$, PDF $A(t)$
    - memoryless: exponential distribution (Poission process)
        - smooth when large scale → not accurate model
- long-range dependence: current value matter long into future
    - self-similar: variance decrease very slowly as time scale grow
    - auto-correlation: how much I look like myself
        - convolution of $f(t)$ and $f(t+\tau)$
        - large auto-correlation → self-similar
    - show up on time-variance, range/std, periodigram

## *Self-Similarity in World Wide Web Traffic: Evidence and Possible Causes*, Mark E. Crovella, Azer Bestavros

- why self-similar: heavy-tailed Pareto distribution
    - linear in log-log CDF plot
    - transfer time
    - distribution of file size
        - few very large file
