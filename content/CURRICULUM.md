# Curriculum — Swift & iOS, basic to advanced

3 terms per day, one phase at a time. Topics below are **hints for choosing terms**, not
the terms themselves. The source of truth for "already used" is `content/terms.json`
(checked by `node scripts/day.mjs check`). Never reuse a term, even under another
spelling (`async/await` and `async await` count as the same term).

Rules for a day: 3 terms that belong together (one theme), ordered easy → hard,
one-line definition, one realistic team-chat example sentence, 3 quizzes
(different order than the terms, each term correct once, question never names its answer).

| Phase | Days (approx.) | Focus | Topic hints |
|---|---|---|---|
| 1. Swift basics | 1–40 | The language core | constants/variables, types, optionals, control flow, functions, closures, collections, enums, structs vs classes, protocols, extensions, generics, error handling |
| 2. Swift in depth | 41–80 | Language features | value vs reference semantics, ARC, property wrappers, result builders, opaque types, copy-on-write, key paths, Codable, access control |
| 3. iOS foundations | 81–130 | UIKit/app model | app lifecycle, view controllers, Auto Layout, table/collection views, navigation, Info.plist, entitlements, bundles, permissions |
| 4. SwiftUI | 131–190 | Declarative UI | View, State, Binding, Observable, environment, layout, lists, navigation stack, animations, previews |
| 5. App architecture & data | 191–250 | Structure | MVVM, dependency injection, Core Data, SwiftData, networking, URLSession, Keychain, persistence |
| 6. Concurrency | 251–300 | Async code | GCD, async/await, actors, Sendable, structured concurrency, Task, MainActor |
| 7. Tooling, shipping, quality | 301–370 | Delivery | SPM, XCFramework, code signing, TestFlight, App Store review, CI, Instruments, XCTest, Swift Testing |
| 8. Advanced | 371+ | Deep topics | Combine, memory layout, ABI stability, macros, Metal, performance tuning, Swift 6 strict concurrency |

> Day 371 in the original series covered `Package.resolved`, `Binary Target`, `XCFramework`.
> This channel restarts at Day 1, so those terms are still free here until used.
