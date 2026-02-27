# Networking Internals: Under the Hood

> Synthesized from: Forouzan *Data Communications and Networking* 4th ed, Comer *Computer Networks and Internets* 5th ed, Barrett & Silverman *SSH: The Definitive Guide*, Bourke *Server Load Balancing*, and supporting comp(24/28/37/38/344-355/467/496/501) references.

---

## 1. The Linux Network Stack — sk_buff Flow

Every packet in Linux travels through the kernel as a single heap object: `struct sk_buff`. Understanding its lifecycle reveals exactly where headers are added/stripped, checksums computed, and routing decisions made.

```c
struct sk_buff {
    struct sk_buff     *next, *prev;   // doubly-linked in queue
    struct sock        *sk;            // owning socket (NULL for forwarded)
    struct net_device  *dev;           // ingress/egress NIC
    unsigned char      *head;          // start of allocated buffer
    unsigned char      *data;          // start of current payload (moves as headers added/stripped)
    unsigned char      *tail;          // end of payload
    unsigned char      *end;           // end of allocated buffer
    __u32              len;            // total payload length
    __u16              protocol;       // ETH_P_IP, ETH_P_IPV6, ETH_P_ARP ...
    // ... transport header, network header, mac header pointers ...
};
```

### TX Path (userspace write → wire)

```mermaid
flowchart TD
    A["Application: write(fd, buf, len)"] --> B["sys_write → sock_write_iter"]
    B --> C["TCP: tcp_sendmsg()\ncopies data into send ring buffer\nsk_buff fragments allocated"]
    C --> D["tcp_push() → tcp_write_xmit()\nsliding window check\nCongestion window check"]
    D --> E["ip_queue_xmit()\nRoute lookup: fib_lookup()\nIP header stamped: src/dst/TTL/proto"]
    E --> F["__ip_local_out()\nnetfilter LOCAL_OUT hook\niptables OUTPUT chain traversal"]
    F --> G["ip_output() → ip_finish_output()\nMTU check → ip_fragment() if needed\nnetfilter POST_ROUTING hook"]
    G --> H["dev_queue_xmit()\nQdisc enqueue (pfifo/fq/tbf)"]
    H --> I["NIC driver: e1000_xmit_frame()\nDMA descriptor ring write\nHW checksum offload"]
    I --> J["Wire / PHY layer"]
```

### RX Path (wire → socket buffer)

```mermaid
flowchart TD
    A["NIC receives frame\nDMA write to ring buffer\nHardware IRQ fires"] --> B["NAPI poll: netif_receive_skb()\nsk_buff allocated from slab\nprotocol field decoded"]
    B --> C["netfilter PRE_ROUTING hook\niptables PREROUTING chain (DNAT here)"]
    C --> D{"Destination IP\n== local?"}
    D -->|Yes| E["ip_local_deliver()\nnetfilter LOCAL_IN hook\nprotocol demux: tcp_v4_rcv / udp_rcv"]
    D -->|No| F["ip_forward()\nTTL decrement\nnetfilter FORWARD hook\nrouting → POST_ROUTING → NIC egress"]
    E --> G["tcp_v4_rcv()\nSocket lookup: inet_hashtables\nsk_buff enqueued to sk_receive_queue"]
    G --> H["Application: read() → tcp_recvmsg()\ncopy sk_buff data to userspace"]
```

---

## 2. TCP State Machine and Congestion Control

### TCP Full State Machine

```mermaid
stateDiagram-v2
    [*] --> CLOSED
    CLOSED --> LISTEN: passive open (server bind+listen)
    CLOSED --> SYN_SENT: active open (connect)
    LISTEN --> SYN_RCVD: recv SYN / send SYN+ACK
    SYN_SENT --> SYN_RCVD: recv SYN / send SYN+ACK (simultaneous open)
    SYN_SENT --> ESTABLISHED: recv SYN+ACK / send ACK
    SYN_RCVD --> ESTABLISHED: recv ACK
    ESTABLISHED --> FIN_WAIT_1: app close / send FIN
    ESTABLISHED --> CLOSE_WAIT: recv FIN / send ACK
    FIN_WAIT_1 --> FIN_WAIT_2: recv ACK
    FIN_WAIT_1 --> CLOSING: recv FIN / send ACK
    FIN_WAIT_2 --> TIME_WAIT: recv FIN / send ACK
    CLOSING --> TIME_WAIT: recv ACK
    CLOSE_WAIT --> LAST_ACK: app close / send FIN
    LAST_ACK --> CLOSED: recv ACK
    TIME_WAIT --> CLOSED: 2×MSL timeout (120s)
```

### TCP Three-Way Handshake — Kernel Memory Allocation Timeline

```mermaid
sequenceDiagram
    participant Client
    participant Server_inet_csk
    participant Accept_Queue

    Client->>Server_inet_csk: SYN (seq=x)
    Note over Server_inet_csk: Half-open entry in syn_table<br/>SYN cookie generated (no full socket yet)
    Server_inet_csk-->>Client: SYN-ACK (seq=y, ack=x+1)
    Client->>Server_inet_csk: ACK (ack=y+1)
    Note over Server_inet_csk: Full struct sock allocated<br/>tcp_sock, receive_buffer, send_buffer
    Server_inet_csk->>Accept_Queue: sock enqueued
    Note over Accept_Queue: accept() dequeues → fd returned to app
```

### Congestion Control — CUBIC Window Evolution

```mermaid
flowchart LR
    A["Slow Start\ncwnd += 1 per ACK\n(exponential growth)"] -->|cwnd >= ssthresh| B["Congestion Avoidance\nCUBIC: W(t) = C·(t-K)³ + Wmax\nK = ³√(Wmax·β/C)"]
    B -->|packet loss (3 dup ACKs)| C["Fast Recovery\nssthresh = cwnd × β(0.7)\nEnter CUBIC recovery probe"]
    C -->|new ACK| B
    B -->|RTO timeout| D["Slow Start\ncwnd = 1 MSS\nssthresh = cwnd/2"]
    D --> A

    style A fill:#2d4a22,color:#fff
    style B fill:#1a3a5c,color:#fff
    style C fill:#5c2d1a,color:#fff
    style D fill:#4a1a1a,color:#fff
```

**CUBIC formula breakdown**:
- `C` = 0.4 (scaling factor)
- `Wmax` = window size at last congestion event
- `K = ³√(Wmax · β / C)` — time to reach Wmax from trough
- At `t=K`, window equals Wmax; beyond K it grows super-linearly
- `β` = 0.7 (multiplicative decrease factor, less aggressive than Reno's 0.5)

**BBR (Bottleneck Bandwidth and RTT)** — probes bandwidth directly:
```
BtlBw = max delivery rate over RTprop window
pacing_rate = BtlBw × pacing_gain
cwnd = BtlBw × RTprop × cwnd_gain
```
BBR maintains separate PROBE_BW/PROBE_RTT/STARTUP/DRAIN state machine, never reacting to loss directly.

---

## 3. IP Layer — Header Processing and Routing

### IPv4 Header Memory Layout

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version|  IHL  |    DSCP   |ECN|         Total Length          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Identification        |Flags|      Fragment Offset    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Time to Live |    Protocol   |         Header Checksum       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Source Address                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Destination Address                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

- **IHL** (Internet Header Length): 4-bit field × 4 = header size in bytes (min 20, max 60)
- **DSCP/ECN**: Differentiated services — IP_TOS maps to queue priority; ECN bits signal congestion without drop
- **Identification + Flags + Fragment Offset**: Fragmentation reassembly — kernel tracks fragments in `ipq` hash table; reassembly timer fires after 30s

### FIB (Forwarding Information Base) Trie Lookup

Linux stores routing table as **LC-trie** (Level Compressed trie) for O(log₂W) LPM:

```mermaid
flowchart TD
    A["ip_route_input_slow()\ndst_addr = packet.dst_ip"] --> B["fib_lookup(net, flowi4, res)\nwalk main routing table trie"]
    B --> C{"LPM match found?"}
    C -->|Yes| D["fib_result: nexthop, interface, scope"]
    C -->|No| E["EHOSTUNREACH → ICMP unreachable"]
    D --> F["dst_entry created/cached\n__rtable with dst.output fn ptr"]
    F --> G["Subsequent packets: dst_cache hit\nskip trie walk entirely"]
```

### IPv6 Extension Header Chain

```mermaid
flowchart LR
    A["IPv6 Fixed Header\n40 bytes\nNext Header = 43"] --> B["Routing Header\nNext Header = 60"]
    B --> C["Destination Options\nNext Header = 58"]
    C --> D["ICMPv6 Payload"]
    
    style A fill:#1a3a5c,color:#fff
    style B fill:#2d4a22,color:#fff
    style C fill:#4a3a1a,color:#fff
    style D fill:#3a1a4a,color:#fff
```

IPv6 eliminates fragmentation at intermediate routers — only source fragments (Path MTU Discovery mandatory). No header checksum (delegated to transport layer). Neighbor Discovery Protocol (NDP) replaces ARP using ICMPv6 type 135/136.

---

## 4. ARP Resolution — Memory Structures

```mermaid
sequenceDiagram
    participant Kernel
    participant ARP_Cache
    participant Wire

    Kernel->>ARP_Cache: lookup dst IP in neigh_table
    alt Cache HIT (state REACHABLE)
        ARP_Cache-->>Kernel: return MAC addr → frame sent immediately
    else Cache MISS or STALE
        Kernel->>Wire: ARP Request broadcast\n(Who has 192.168.1.1? Tell 192.168.1.10)
        Wire-->>Kernel: ARP Reply unicast\n(192.168.1.1 is at aa:bb:cc:dd:ee:ff)
        Kernel->>ARP_Cache: insert/update neigh entry\nstate → REACHABLE\nreachable_time = 30s
        Note over ARP_Cache: Pending skb queue flushed
    end
```

`struct neighbour` in kernel:
```c
struct neighbour {
    __u8            primary_key[4];  // IP address
    u8              ha[ALIGN(MAX_ADDR_LEN, sizeof(unsigned long))]; // MAC
    unsigned long   confirmed;        // jiffies of last confirmation
    atomic_t        refcnt;
    struct neigh_ops *ops;            // ops->output fn: arp_send or direct
    // NUD state machine: INCOMPLETE→REACHABLE→STALE→DELAY→PROBE→FAILED
};
```

---

## 5. DNS Resolution Chain

```mermaid
sequenceDiagram
    participant App
    participant glibc_resolver
    participant Local_Cache
    participant Recursive_Resolver
    participant Root_NS
    participant TLD_NS
    participant Auth_NS

    App->>glibc_resolver: getaddrinfo("api.example.com")
    glibc_resolver->>Local_Cache: check /etc/hosts + nscd/systemd-resolved cache
    alt Cache hit
        Local_Cache-->>App: return IP immediately
    else Cache miss
        glibc_resolver->>Recursive_Resolver: UDP query port 53\nQTYPE=A, QCLASS=IN
        Recursive_Resolver->>Root_NS: query "com." NS records
        Root_NS-->>Recursive_Resolver: NS: a.gtld-servers.net (referral)
        Recursive_Resolver->>TLD_NS: query "example.com." NS
        TLD_NS-->>Recursive_Resolver: NS: ns1.example.com (referral)
        Recursive_Resolver->>Auth_NS: query "api.example.com." A
        Auth_NS-->>Recursive_Resolver: A: 203.0.113.42 TTL=300
        Recursive_Resolver-->>glibc_resolver: A: 203.0.113.42
        glibc_resolver-->>App: struct addrinfo with sin_addr
    end
```

DNS message wire format (RFC 1035):
```
Header (12 bytes): ID(16) | QR|Opcode|AA|TC|RD|RA|Z|RCODE | QDCOUNT | ANCOUNT | NSCOUNT | ARCOUNT
Question: QNAME (labels) | QTYPE (2) | QCLASS (2)
Answer RR: NAME | TYPE | CLASS | TTL(32) | RDLENGTH | RDATA
```

DNSSEC adds **RRSIG** (signature over RRset), **DNSKEY** (zone signing key), **DS** (delegation signer hash), and **NSEC/NSEC3** (authenticated denial of existence). Validation chain: root KSK → TLD ZSK → authoritative zone ZSK → RRset signature.

---

## 6. Netfilter / iptables Hook Architecture

```mermaid
flowchart TD
    Wire["NIC RX"] --> PRE["PREROUTING\n(raw→mangle→nat)\nDNAT happens here"]
    PRE --> Route{Route\nDecision}
    Route -->|local| IN["INPUT\n(mangle→filter→security)\nFirewall for local process"]
    Route -->|forward| FWD["FORWARD\n(mangle→filter→security)\nPacket forwarding rules"]
    IN --> App["Local Process"]
    App --> OUT["OUTPUT\n(raw→mangle→nat→filter)\nSNAT/masquerade here"]
    FWD --> POST["POSTROUTING\n(mangle→nat)\nSNAT/masquerade"]
    OUT --> POST
    POST --> Wire2["NIC TX"]
```

**Connection tracking (conntrack)** — each TCP/UDP flow stored in hash table:
```
nf_conntrack_tuple: {src_ip, src_port, dst_ip, dst_port, proto, netns}
State: NEW → ESTABLISHED → RELATED → INVALID
```
NAT rewrites packets by modifying sk_buff IP/TCP headers + recalculating checksums incrementally (RFC 1624 one's complement incremental update).

**nftables** replaces iptables using a register-based VM:
```
rule → list of expressions → each expression operates on registers r0..r15
verdict: accept / drop / jump / goto / return / continue
```

---

## 7. SSH Protocol Internals — Crypto Handshake

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Client->>Server: TCP SYN → ESTABLISHED
    Client->>Server: SSH-2.0-OpenSSH_8.9 (version banner)
    Server->>Client: SSH-2.0-OpenSSH_8.9 (version banner)

    Note over Client,Server: SSH_MSG_KEXINIT exchange
    Client->>Server: SSH_MSG_KEXINIT\n{kex_algorithms, host_key_types,\nenc_algos, mac_algos, comp_algos}
    Server->>Client: SSH_MSG_KEXINIT (server's lists)

    Note over Client,Server: Key Exchange (Curve25519 ECDH example)
    Client->>Server: SSH_MSG_KEX_ECDH_INIT\n{ephemeral_pub_key_C}
    Server->>Client: SSH_MSG_KEX_ECDH_REPLY\n{host_pub_key, ephemeral_pub_key_S,\nsignature(H)}

    Note over Client: Verify host_pub_key against known_hosts\nCompute shared_secret K = DH(priv_C, pub_S)\nHash H = SHA-256(V_C || V_S || I_C || I_S || K_S || Q_C || Q_S || K)
    Note over Server: Same computation for K and H

    Client->>Server: SSH_MSG_NEWKEYS
    Server->>Client: SSH_MSG_NEWKEYS

    Note over Client,Server: Session keys derived from K and H\niv_c2s = hash(K || H || "A" || session_id)\niv_s2c = hash(K || H || "B" || session_id)\nkey_c2s = hash(K || H || "C" || session_id)\nkey_s2c = hash(K || H || "D" || session_id)

    Client->>Server: SSH_MSG_SERVICE_REQUEST: ssh-userauth
    Server->>Client: SSH_MSG_SERVICE_ACCEPT
    Client->>Server: SSH_MSG_USERAUTH_REQUEST\n(method: publickey)\nsignature(session_id || auth_data)
    Server->>Client: SSH_MSG_USERAUTH_SUCCESS
    Client->>Server: SSH_MSG_CHANNEL_OPEN (session)
    Server->>Client: SSH_MSG_CHANNEL_OPEN_CONFIRMATION
```

### SSH Packet Wire Format (after NEWKEYS)

```
uint32 packet_length       // length of (padding_length + payload + random_padding)
byte   padding_length      // random padding to align to cipher block size
byte[n] payload            // SSH message (compressed if negotiated)
byte[m] random_padding     // random bytes
byte[mac_len] MAC          // HMAC-SHA2-256(sequence_number || unencrypted_packet)
```

All fields after `packet_length` are encrypted with AES-256-CTR or ChaCha20-Poly1305. The MAC is computed over the **plaintext** (Encrypt-then-MAC or AEAD Poly1305 covers everything).

---

## 8. TLS 1.3 Handshake Internals

```mermaid
sequenceDiagram
    participant Client
    participant Server

    Client->>Server: ClientHello\n{TLS 1.3, cipher_suites,\nkey_share[X25519: pub_key_C],\nsupported_groups, psk_modes}
    Server->>Client: ServerHello\n{key_share[X25519: pub_key_S],\nchosen_cipher}

    Note over Client,Server: Shared secret computed immediately\nHS = HKDF-Extract(0, ECDH(priv_S, pub_C))\nhandshake_traffic_secret derived\nAll subsequent messages ENCRYPTED

    Server->>Client: EncryptedExtensions\n{ALPN, server_name, max_fragment}
    Server->>Client: Certificate\n{cert chain, DER encoded}
    Server->>Client: CertificateVerify\n{signature over transcript hash}
    Server->>Client: Finished\n{HMAC over entire handshake transcript}

    Note over Client: Verify cert chain against trust store\nVerify CertificateVerify signature\nVerify Finished HMAC

    Client->>Server: Finished\n{HMAC over transcript}

    Note over Client,Server: Application traffic keys derived\nAPP_SECRET = HKDF-Expand(master_secret, "traffic")\nKey = HKDF-Expand(APP_SECRET, "key", keylen)\nIV  = HKDF-Expand(APP_SECRET, "iv", 12)
```

**0-RTT resumption**: Client stores PSK and ticket_age_add from previous session. On reconnect, sends early_data encrypted with resumption_master_secret before server responds. Server must accept or reject — replay vulnerability mitigated by anti-replay cache.

---

## 9. Load Balancing Algorithms — Internal Decision Paths

```mermaid
flowchart TD
    A["Incoming Connection\nsrc: 10.0.0.5:44321\ndst: 203.0.113.100:443"] --> B["L4/L7 Load Balancer"]

    B --> C{Algorithm}

    C -->|Round Robin| D["next_server = (last_server + 1) % N\nO(1) state: single atomic counter"]
    C -->|Weighted Round Robin| E["Virtual server list expanded\n[S1,S1,S1,S2,S2,S3] rotated\nO(sum_weights) memory"]
    C -->|Least Connections| F["min-heap of (active_conns, server_id)\nO(log N) per request\nRequires conn tracking per backend"]
    C -->|IP Hash| G["hash(src_ip) % N\nDeterministic: same client → same backend\nSession affinity without cookie"]
    C -->|Consistent Hash| H["Ketama ring: 150 vnodes/server\nMD5(server:i) placed on 0..2³²-1 ring\nClock-wise walk to nearest vnode\nO(log N) binary search"]

    D --> I["Backend selected → connection forwarded"]
    E --> I
    F --> I
    G --> I
    H --> I

    I --> J["Health check state machine\nHTTP GET /health every 5s\nFAIL_THRESHOLD=3 → mark DOWN\nSUCCESS_THRESHOLD=2 → mark UP"]
```

### DSR (Direct Server Return) vs NAT Mode

```mermaid
flowchart LR
    subgraph NAT_Mode
        C1["Client"] -->|dst=VIP:443| LB1["Load Balancer\nDNAT: dst→RIP\nSNAT: src→LB_IP"]
        LB1 -->|dst=RIP:443\nsrc=LB_IP| S1["Backend Server"]
        S1 -->|response| LB1
        LB1 -->|undo NAT\ndst=Client| C1
    end
    subgraph DSR_Mode
        C2["Client"] -->|dst=VIP:443| LB2["Load Balancer\nL2 rewrite: dst_MAC→server_MAC\nIP dst stays = VIP"]
        LB2 --> S2["Backend Server\nLoopback: 127.0.0.1 → VIP\nAccepts packet, responds directly"]
        S2 -->|src=VIP, dst=Client\nBypasses LB| C2
    end
```

DSR eliminates return path bottleneck — LB only handles ingress. Requires all backends in same L2 domain and VIP configured on loopback (not ARP'd).

---

## 10. Linux Network Namespace Internals

```mermaid
flowchart TD
    subgraph Host_Netns
        H_eth0["eth0\n192.168.1.1"] 
        H_bridge["docker0 bridge\n172.17.0.1/16"]
        H_iptables["iptables MASQUERADE\nfor 172.17.0.0/16"]
    end
    subgraph Container_Netns
        C_eth0["veth0\n172.17.0.2/16\n(veth pair endpoint)"]
        C_lo["lo 127.0.0.1"]
    end
    H_bridge <-->|"veth pair\nveth0 ↔ vethXXXXXX"| C_eth0
    H_eth0 --> H_iptables
    H_iptables --> H_bridge
```

`struct net` (network namespace) contains its own:
- Routing table (`net->ipv4.fib_main`)
- ARP table (`net->ipv4.neigh_table`)
- Socket table (`net->ipv4.tcp_death_row`)
- iptables/nftables rulesets
- Network devices list (`net->dev_base_head`)

`ip netns add foo` → `clone(CLONE_NEWNET)` → new `struct net` allocated → `/proc/self/ns/net` symlink created. `unshare(CLONE_NEWNET)` in container runtime moves process into new namespace.

---

## 11. Wireless Network Internals (802.11)

```mermaid
sequenceDiagram
    participant STA as Station (Client)
    participant AP as Access Point

    STA->>AP: Probe Request (broadcast)\n{SSID, supported_rates, capabilities}
    AP->>STA: Probe Response\n{SSID, BSSID, beacon_interval=100TU,\ncapabilities, rates, RSN IE}

    STA->>AP: Authentication Request\n{Open System auth seq=1}
    AP->>STA: Authentication Response\n{seq=2, status=0}

    STA->>AP: Association Request\n{SSID, rates, HT/VHT capabilities}
    AP->>STA: Association Response\n{AID=1, status=0}

    Note over STA,AP: 802.11i (WPA2/3) 4-Way Handshake
    AP->>STA: EAPOL-Key [ANonce]
    STA->>AP: EAPOL-Key [SNonce, MIC, RSN IE]
    Note over STA,AP: Both derive PTK = PRF(PMK || ANonce || SNonce || MACs)
    AP->>STA: EAPOL-Key [GTK encrypted, MIC]
    STA->>AP: EAPOL-Key [ACK, MIC]
    Note over STA,AP: PTK installed → data frames encrypted with AES-CCMP
```

**OFDM channel encoding** (802.11n/ac/ax):
- Data split into subcarriers (e.g., 52 data + 4 pilot for 20MHz 802.11n)
- Each subcarrier BPSK/QPSK/16-QAM/64-QAM/256-QAM/1024-QAM modulated
- IFFT converts frequency domain to time domain → cyclic prefix added → RF
- MCS index encodes: modulation × coding_rate × spatial_streams → throughput

---

## 12. BGP Path Selection Internals

```mermaid
flowchart TD
    A["Multiple paths to prefix 198.51.100.0/24\nreceived from peers"] --> B["Step 1: Highest LOCAL_PREF\n(ibgp policy weight, default 100)"]
    B --> C["Step 2: Shortest AS_PATH length\n(fewest AS hops)"]
    C --> D["Step 3: Lowest ORIGIN\nIGP(0) < EGP(1) < Incomplete(2)"]
    D --> E["Step 4: Lowest MED\n(Multi-Exit Discriminator from neighbor AS)"]
    E --> F["Step 5: Prefer eBGP over iBGP\n(external routes preferred)"]
    F --> G["Step 6: Lowest IGP metric\nto BGP next-hop"]
    G --> H["Step 7: Lowest Router ID\n(tiebreaker)"]
    H --> I["Best path installed in RIB\nRedistributed to FIB"]
```

BGP UPDATE message carries:
- **WITHDRAWN ROUTES**: prefixes no longer reachable
- **PATH ATTRIBUTES**: ORIGIN, AS_PATH, NEXT_HOP, MED, LOCAL_PREF, COMMUNITY, LARGE_COMMUNITY
- **NLRI**: Network Layer Reachability Information (prefixes)

BGP session state machine: `IDLE → CONNECT → ACTIVE → OPENSENT → OPENCONFIRM → ESTABLISHED`. Keepalive timer (60s default) maintains session; Hold Time (180s) expiry tears it down.

---

## 13. TCP/UDP Checksum Computation

```mermaid
flowchart LR
    A["Pseudo Header\n{src_ip, dst_ip,\nzero, protocol,\ntcp_length}"] --> C["One's Complement Sum\nall 16-bit words\nwrap carry bits"]
    B["TCP Header + Data\nchecksum field = 0\nduring computation"] --> C
    C --> D["Invert bits\n= checksum field value\nin TCP header"]
    D --> E["On receive:\nsum all words incl. checksum\nresult must = 0xFFFF"]
```

Hardware checksum offload (`NETIF_F_IP_CSUM`): NIC computes TCP/UDP checksum in hardware. Kernel sets `skb->ip_summed = CHECKSUM_PARTIAL` and writes partial pseudo-header checksum; NIC completes it over the payload using dedicated hardware logic, freeing CPU cycles.

---

## 14. HTTP/2 Frame Multiplexing Internals

```mermaid
flowchart TD
    subgraph Single_TCP_Connection
        direction LR
        A["Stream 1\nGET /api/user"] --> M["HTTP/2 Framing Layer\nFrame header: 3B length\n1B type | 1B flags\n4B stream_id"]
        B["Stream 3\nGET /api/orders"] --> M
        C["Stream 5\nPOST /api/events\nDATA frames"] --> M
        M --> D["TLS 1.3 encryption\nof frame stream"]
        D --> E["Single TCP bytestream\nto server"]
    end
```

**HPACK header compression**:
- Static table: 61 predefined header name/value pairs (e.g., index 2 = `:method: GET`)
- Dynamic table: LRU cache of recently seen headers, max size negotiated via SETTINGS
- Huffman encoding applied to literal strings
- Result: headers like `Content-Type: application/json` → 1-2 bytes if previously seen

**Flow control**: Per-stream AND per-connection window. `WINDOW_UPDATE` frame adds to receive window. Each DATA frame deducted from both. Prevents slow stream from blocking fast ones.

---

## Network Stack Performance Numbers

| Operation | Typical Latency | Notes |
|-----------|-----------------|-------|
| L1 ARP cache hit → TX | ~5 µs | NIC DMA + driver path |
| TCP loopback (same host) | ~10-30 µs | kernel bypass via unix sockets ~1µs |
| LAN round-trip (GbE) | ~100-200 µs | includes switching fabric |
| WAN RTT (cross-continent) | ~60-150 ms | speed-of-light limited |
| DNS lookup (recursive, cold) | 20-200 ms | resolver chain traversal |
| TLS 1.3 handshake (warm) | 1 RTT + crypto | ~1-3 ms LAN |
| iptables rule (linear scan) | O(N) rules | 10k rules = ~100µs overhead |
| nftables rule (hash/map) | O(1) typical | set-based matching |
| TCP connection setup | 1.5 RTT | SYN + SYN-ACK + ACK + data |

---

## Summary — Key Internal Mappings

```mermaid
block-beta
    columns 3
    block:L7["L7 Application"]:1
        A1["HTTP/2 frames\nHPACK headers\ngRPC protobuf"]
    end
    block:L45["L4/L5 Transport+Session"]:1
        B1["TCP sk_buff\ncwnd/ssthresh\nconntrack tuples"]
    end
    block:L3["L3 Network"]:1
        C1["IP FIB trie\nnetfilter hooks\nARP neigh table"]
    end
    block:L2["L2 Data Link"]:1
        D1["net_device\nNIC DMA rings\nQdisc queues"]
    end
    block:SEC["Security Overlay"]:1
        E1["SSH: ECDH+AES-CTR\nTLS 1.3: HKDF keys\n802.11: AES-CCMP PTK"]
    end
    block:LB["Load Balancing"]:1
        F1["Ketama consistent hash\nDSR vs NAT modes\nHealth check FSM"]
    end
```

Every byte traverses: application buffer → socket send queue → TCP segmentation → IP header stamping → netfilter hooks → QDisc → NIC DMA ring → wire. On the receive side, the exact reverse path: DMA → NAPI poll → protocol demux → sk_receive_queue → userspace copy. Understanding this full sk_buff lifecycle — where it lives in memory, which kernel functions mutate it, and which hooks intercept it — is the foundation of all Linux network performance analysis and troubleshooting.
