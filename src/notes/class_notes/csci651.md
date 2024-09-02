<!-- toc -->
# Advanced Computer Networking

40 paper + 20hr+ programming project + similar research project

*The design philosophy of the DARPA Internet protocols*, David D. Clark.

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
