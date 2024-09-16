# Advanced Computer Networking

40 paper + 20hr+ programming project + similar research project

flow: same src/dest

NABC for research: need, approach, benefit, competition

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
- IP was split from TCP—TCP was too specific and bad for latency
    - when designing, did not anticipate actual challenge
- protocol loose → realization determine what goes
- datagram is the basis of Internet flexibility

## *End-to-end arguments in system design*, J. H. Saltzer, D. P. Reed, D. D. Clark

- handling failure in middle do not void need to do so
    at end—no fundamental effect
- low level check help performance, but need not be perfect
- example: checksum, encryption, dedup, FIFO, transaction
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
- resource limit:
    congestion avoidance w/
    [AI/MD](../cs/networking.html#congestion-window-cwnd)
    - congestion detection: packet loss, ~~delay~~
    - congestion recovery

## *A Binary Feedback Scheme for Congestion Avoidance in Computer Networks*, Kadangode K. Ramakrishnan, Raj Jain, SIGCOMM 1988

- explicit congestion notification (ECN) router add congestion bit to packet,
    returned later in ack
- fair share
- avoid oscillation & congestion collapse
- math model & simulation for policy

## *BBR: Congestion-Based Congestion Control*, Neal Cardwell, Yuchung Cheng, C. Stephen Gunn, Soheil Hassas Yeganeh, Van Jacobson

- avoid timeout
- TCP need to measure ideal window size: bandwidth-delay product (BDP)
    = bottleneck RTT × bandwidth
- measure RTT: exponential weighted moving average
    (EWMA)—ACK time - sent time
- measure bandwidth: window size & packet loss & ACK rate
- TCP keep probing at equilibrium → oscillation

## *BGP Routing Policies in ISP Networks*, Matthew Caesar, Jennifer Rexford

- BPG not designed to do policy
- many hack for business relationship & traffic engineering: Pref, MED,
    community
- manual & unscalable configuration
- trick to enhance security, no systematic solution

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
