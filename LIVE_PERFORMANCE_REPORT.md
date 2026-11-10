# Live performance observations

10 November 2026. One audit location and one bounded session; these are observations, not capacity guarantees.

## Recorded measurements after recovery

| Request / resource | Observed result |
|---|---|
| `/api/config` | 245 ms; 276 decoded response bytes |
| `/api/products` | 192 ms; 342,586 decoded response bytes |
| `/api/coins` | 50 ms; 15,937 decoded response bytes |
| Product HTML documents | 107 samples including a missing-product path; median 44 ms; maximum 142 ms |
| Asset checks | 786 same-origin URLs; zero failed responses in the recovered scan |
| Deployed frontend build | Approximately 528.34 kB JavaScript / 161.43 kB build gzip estimate; CSS 85.44 kB / 17.05 kB build gzip estimate |
| Node resident memory | One process snapshot: 135,444 KiB (about 132 MiB); not peak RSS |
| Representative responsive views | 12 measurements across 390/768/1440 px; no horizontal document overflow |

HTTP durations include the audit client's connection and response-reading overhead. Build gzip estimates are not measured browser network transfer sizes. Asset HEAD success does not measure image decode/render speed. Earlier scan timings differ; do not average independent cold/warm phases into a fictitious benchmark.

## Bottlenecks and missing measurements

The entire published jewellery catalogue is returned to the client; pagination is in the browser. The restored legacy main bundle is larger than the newer local split build. Search retains an in-process cache, so freshness and multi-process behavior need target-environment checks. API/database latency under load, connection pool wait, memory growth, concurrent checkout/import contention and resilience remain unmeasured.

**No valid LCP, CLS, INP, Lighthouse score or Core Web Vitals field measurement was captured.** Browser DOM measurements and fast HTTP responses are not substitutes. No load test or availability SLA is claimed. Schedule a controlled browser/field performance run after deployment stabilizes, then compare representative mobile product/listing/checkout journeys.

Source checks found no recognized error-code matches in the sanitized log summary; the historical stderr file predated this audit. Only counts/timestamps were collected, not sensitive log bodies. This is not proof that every historical log entry or operational error was resolved.

## Recommendations tied to evidence

Deploy the reviewed chunking/error/loading changes only with their compatible backend. Add bounded server pagination if measured catalogue growth warrants it. Keep uploads persistent outside publication roots, retain prior hashed files for active browser sessions, serve correct MIME types, and give HTML conservative cache behavior. Measure p95 latency and memory at an agreed concurrency before changing worker counts or increasing database pools.
