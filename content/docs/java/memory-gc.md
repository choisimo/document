# Java 메모리와 GC

Java 메모리 관리는 “객체를 직접 free하지 않아도 된다”가 아니라 “객체가 어디에서 참조되고, 언제 더 이상 reachable하지 않은가”를 이해하는 일이다. 이 문서는 JVM memory area, reference reachability, garbage collection, leak 진단의 기본 기준을 정리한다.

## 1. 왜 필요한가? (Pain Point & Motivation)

Java 애플리케이션은 GC가 메모리를 회수하지만, 참조가 살아 있으면 객체는 회수되지 않는다. static collection, cache, thread-local, listener, executor queue가 객체를 계속 붙잡으면 heap은 가득 차고 결국 `OutOfMemoryError`가 발생한다.

GC 튜닝도 heap 크기만 키우는 문제가 아니다. allocation rate, live set, pause time, GC log, heap dump를 함께 봐야 원인을 구분할 수 있다.

## 2. 현재 나의 상태 (Baseline)

기존 문서는 객체 생성, lambda, GC, OOP/Spring 예제를 한 문서에 섞어 설명한다.

보완해야 할 점은 다음과 같다.

- Java GC는 reference counting이 아니라 reachability 기반이라는 점을 명확히 해야 한다.
- local reference, instance field, static field가 GC root와 어떻게 연결되는지 구분해야 한다.
- lambda의 effectively final local capture와 instance field 접근을 구분해야 한다.
- GC 최적화는 코드 스타일보다 관측 지표와 heap dump 분석이 먼저다.

## 3. 도달하고 싶은 목표 (Target State)

목표는 Java 메모리 문제를 다음 기준으로 분석하는 것이다.

- 객체가 heap에 있고 reference가 stack, heap field, static field 등에 저장된다는 점을 설명한다.
- 어떤 reference chain이 객체를 reachable하게 만드는지 추적한다.
- Young/Old generation과 GC pause의 의미를 이해한다.
- GC log, heap dump, thread dump를 수집할 수 있다.
- memory leak과 정상적인 높은 live set을 구분한다.

## 4. 시스템 번역 (Data Flow)

객체와 GC의 흐름은 다음과 같다.

```text
new object
  -> heap allocation
  -> reference stored in local, field, static, array, collection
  -> method execution
  -> reference removed or retained
  -> unreachable objects selected by GC
  -> memory reclaimed
```

GC는 “사용하지 않는 것처럼 보이는 객체”가 아니라 “GC roots에서 도달할 수 없는 객체”를 회수한다. 따라서 leak 분석은 reference chain 분석이다.

## 5. 핵심 구성요소 (Building Blocks)

Heap은 객체와 array가 할당되는 영역이다. 대부분의 application memory pressure는 heap에서 드러난다.

Thread stack은 method call frame과 local variable slot을 가진다. local variable이 객체를 참조하면 그 객체는 method 실행 중 reachable할 수 있다.

Static field는 class가 load된 동안 오래 살아남는 reference가 되기 쉽다. static collection은 leak의 흔한 원인이다.

Metaspace는 class metadata를 저장한다. classloader leak이 있으면 metaspace pressure가 생길 수 있다.

GC roots는 thread stack, static field, JNI reference, system class 등 reachability 분석의 시작점이다.

G1 GC는 JDK 9 이후 HotSpot의 기본 collector로 쓰인다. Oracle의 GC tuning guide는 일반적으로 G1 기본값을 사용하고 필요하면 pause-time goal과 maximum heap size를 조정하는 접근을 권장한다.

## 6. 상태 전이 (State Transition)

객체의 생명주기는 다음 상태로 볼 수 있다.

```text
allocated
  -> referenced
  -> reachable
  -> no longer referenced
  -> unreachable
  -> reclaimed by GC
```

memory leak은 객체가 논리적으로는 필요 없지만 reference chain 때문에 `reachable` 상태에 계속 남는 것이다.

GC 운영 상태는 다음처럼 관측한다.

```text
normal allocation
  -> young GC
  -> promotion to old
  -> old occupancy growth
  -> mixed/full GC
  -> stable recovery or OOM
```

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- GC는 reference count가 아니라 reachability를 기준으로 회수한다.
- static collection에 넣은 객체는 명시적으로 제거하지 않으면 오래 살아남을 수 있다.
- cache는 maximum size, eviction, TTL 중 하나 이상의 정책이 필요하다.
- `ThreadLocal`은 thread pool에서 사용 후 remove하지 않으면 leak 원인이 된다.
- lambda는 local variable을 capture할 때 final 또는 effectively final만 허용한다.
- heap 문제는 GC log와 heap dump 없이 추측으로 결론 내리지 않는다.
- `System.gc()` 호출을 운영 해결책으로 사용하지 않는다.

## 8. 가장 작은 예제 (Minimal Viable Example)

local reference와 field reference를 구분한다.

```java
public final class MemoryExample {
    private Object fieldRef = new Object();

    public void run() {
        Object localRef = new Object();
        System.out.println(localRef);
    }
}
```

`localRef`가 가리키는 객체는 method 실행 중 stack frame을 통해 reachable하다. `fieldRef`가 가리키는 객체는 `MemoryExample` instance가 reachable한 동안 함께 reachable하다.

static collection leak 예시는 다음과 같다.

```java
public final class ReferenceLeak {
    private static final List<byte[]> LEAK = new ArrayList<>();

    public void allocate() {
        LEAK.add(new byte[10_000_000]);
    }
}
```

`LEAK`가 static field이므로 class가 살아 있는 동안 list와 내부 byte array가 계속 reachable하다.

lambda capture 규칙은 다음처럼 확인할 수 있다.

```java
public final class LambdaCapture {
    private int counter = 0;

    public Runnable create() {
        int local = 1;
        return () -> {
            counter++;
            System.out.println(local);
        };
    }
}
```

lambda는 instance field `counter`를 변경할 수 있지만, capture한 local variable `local`은 effectively final이어야 한다.

GC log를 켜고 실행한다.

```bash
java -Xms512m -Xmx512m -Xlog:gc*,safepoint:file=gc.log:time,uptime,level,tags -jar app.jar
```

운영 중 heap 상태를 본다.

```bash
jcmd <pid> GC.heap_info
jcmd <pid> VM.flags
jcmd <pid> Thread.print
```

heap dump는 장애 대응 절차에 맞춰 저장한다.

```bash
jcmd <pid> GC.heap_dump /tmp/app.hprof
```

## 9. 실패 사례 (What could go wrong?)

heap이 계속 증가한다고 모두 leak은 아니다. traffic 증가로 live set이 커졌거나 cache가 정상적으로 차오르는 중일 수 있다. old generation이 GC 후에도 계속 증가하는지 봐야 한다.

GC pause가 길다고 collector만 바꾸면 원인이 가려질 수 있다. allocation rate, object lifetime, heap size, CPU limit, container memory limit을 함께 확인한다.

`ThreadLocal`에 사용자 컨텍스트를 넣고 remove하지 않으면 thread pool의 worker thread가 그 객체를 계속 참조한다.

unbounded queue나 cache는 traffic spike를 heap pressure로 바꾼다. queue length와 cache size metric을 같이 봐야 한다.

heap dump에는 개인정보와 secret이 포함될 수 있다. 저장 위치, 접근 권한, 폐기 절차를 정해야 한다.

## 10. 뇌 확장하기 (Evolution & Variants)

G1은 대부분의 서버 애플리케이션에서 기본 출발점이다. low-latency 요구가 강하면 ZGC나 Shenandoah 같은 collector를 검토할 수 있지만, workload 검증 없이 collector만 바꾸면 안 된다.

Container 환경에서는 JVM이 cgroup memory limit을 인식하더라도 `-Xmx`, `MaxRAMPercentage`, request/limit, native memory를 함께 설계해야 한다.

Native memory, direct buffer, metaspace, thread stack은 heap dump만으로 보이지 않는다. `jcmd VM.native_memory` 같은 Native Memory Tracking은 별도 활성화가 필요하다.

## 11. 최종 체크리스트 (Definition of Done)

- [ ] heap, stack, metaspace의 역할을 구분한다.
- [ ] GC root와 reachability 개념을 설명할 수 있다.
- [ ] static collection, cache, ThreadLocal leak 패턴을 알고 있다.
- [ ] lambda의 effectively final capture 규칙을 이해한다.
- [ ] GC log를 켜고 pause와 heap 변화를 볼 수 있다.
- [ ] heap dump 수집 절차와 보안 영향을 알고 있다.
- [ ] OOM 대응 시 heap dump, GC log, thread dump를 함께 수집한다.
- [ ] collector 변경 전 workload와 지표를 먼저 검증한다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

Java GC는 “필요 없어 보이는 객체”가 아니라 GC roots에서 도달할 수 없는 객체를 회수한다. 메모리 문제는 heap 크기보다 reference chain, allocation rate, live set, GC log로 설명해야 한다.
