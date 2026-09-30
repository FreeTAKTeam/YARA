# JavaScript / TypeScript frontend engineering principles

## Timeless constraints, not a checklist

Minimize expected lifetime cost in THIS codebase: implementation, review,
operation, debugging, compatibility, and future change. Correctness, security,
data integrity, accessibility, and explicit product contracts constrain that
choice. Preserve the repository's stack, visual conventions, and Git workflow.
These are design constraints, not permission for an unrelated rewrite.

Scope: browser UIs, WebViews, renderers, UI stores, hooks, composables, and their
client adapters. Server-side JavaScript/TypeScript and native runtimes are not
presentation code merely because they share a repository or language. Assign
responsibilities by execution boundary and authority, not file extension.

## Refactor first when the structure obstructs the change

Read the affected code, callers, tests, and applicable AGENTS.md first. Identify
which layer owns the requested behavior. Protect relevant behavior with tests;
then make the smallest behavior-preserving extraction needed to enable the
change. Verify the extraction separately before altering behavior.

Do not append another unrelated responsibility to a large component or store.
Do not move the same mixed responsibilities into one giant hook, composable,
service, base class, or utilities file and call that a refactor. Extraction must
reduce coupling and provide an independently understandable, testable boundary.

A small correction that needs no extraction requires none. An urgent fix may
precede structural work when that is safer; record the remaining problem. Moving
a rule across an API/native boundary can change errors, timing, persistence, or
atomicity: treat that as a behavior/contract change, not merely moving code.

## 1. Keep domain authority outside presentation

Apply Separation of Concerns, Single Responsibility, and high cohesion/loose
coupling. Group code by the knowledge it owns and the reasons it changes.

| Responsibility | Correct owner |
| --- | --- |
| Rendering, layout, focus, selection, formatting, visible-list filtering, form drafts, immediate input feedback | Components and small presentation helpers |
| UI interaction sequencing, loading/error states, draft lifecycle, query coordination | Feature-level hooks, composables, controllers, or stores |
| HTTP, WebSocket, IPC, native calls, response decoding, API-to-view mapping | Explicit client/platform adapters |
| Authorization, domain invariants, semantic inference, authoritative scoring, business workflow transitions, transactions, replication/conflict policy, protocol encoding and delivery rules | The designated backend, daemon, or native domain/runtime service |

Stores, hooks, composables, and frontend `services/` are NOT alternative homes
for business rules. They may request an operation and reflect its result; they
must not decide the authoritative outcome. A domain-specific calculation remains
a business rule even when it is pure, short, or easy to unit-test. Conversely,
layout arithmetic, display formatting, and client-side input checks belong in
the client; do not move ordinary presentation behavior to a server.

Client-side validation is feedback, not enforcement. The authoritative service
must validate again. Display-only permission hints must not confer permission.
A missing backend operation is a contract gap: implement it in the right owner
when authorized, or report the gap. Do not fabricate success or add a second
rule engine, truth store, or client-orchestrated substitute for an atomic use case.

Offline is not an exception to ownership. Use the existing local native/domain
runtime when it is the designated authority. Otherwise retain a clearly marked
pending draft/request until that authority accepts it; do not invent an offline
business engine in a store. Preserve the product's actual local-first behavior.

## 2. Encapsulate state and expose narrow interfaces

Apply Information Hiding and Interface Segregation. Give components the values
and operations they need, not the entire application store, global event bus,
HTTP client, or native plugin. Keep feature-private state behind its owner.
Use explicit props/events and purpose-specific operations; avoid flag-heavy
universal components, shared mutable objects, and deep imports into other features.

Keep related view, interaction, mapping, and test code together where practical.
Reuse existing shared visual primitives. Do not scatter a feature across dozens
of generic folders or create one-line forwarding modules solely for symmetry.

## 3. Depend on contracts at actual boundaries

Apply Dependency Inversion. Presentation depends on UI-facing capabilities;
adapters implement them using the existing transport or platform. Assemble
these dependencies at the application/feature boundary, not inside every widget.
Plain functions, parameters, or small objects are often sufficient; a dependency
injection container, class hierarchy, or interface for every function is not required.

Keep raw business-endpoint calls and payload construction out of view components.
Use a cohesive adapter rather than a universal API manager. Protocol primitives,
credentials, IPC channel names, and retry policy must not spread across screens.
Low-level transport should not import a page or feature store; supply connection
settings, credentials, and callbacks through its boundary instead. Do not add
new cycles, including cycles hidden by barrel exports or path aliases. Improve
existing couplings in the touched area without inventing a second client stack.

## 4. Require behavioral substitutability

Apply Liskov Substitution to client adapters, hooks, injected functions, and fakes.
Matching TypeScript shapes or JavaScript method names does not establish matching
behavior. Preserve documented errors, ordering, cancellation, subscription
cleanup, identity, and persistence semantics across implementations.

An HTTP success or accepted/queued response is not proof of durable commit,
message delivery, or remote acknowledgment. A fake must not claim guarantees it
does not implement. Unsupported operations need explicit capability/error results,
not empty success. Use shared contract tests when multiple adapters exist.

## 5. Keep one authority for each piece of knowledge

Apply DRY to rules, schemas, identities, units, and protocol meanings, not merely
similar lines. Consume the versioned authoritative API/native contract. Where
code generation exists, regenerate types and decoders from its source rather
than editing outputs or maintaining parallel handwritten wire definitions.

Keep wire types separate from view models when their purposes differ, with
explicit mappings. Do not reinterpret domain values, guess required fields,
shorten persistent identities, or convert missing values into meaningful defaults.
Schema-driven form constraints may be reused for feedback without becoming a
second authority. Caches and projections need ownership, freshness, invalidation,
and connection/workspace identity. Do not copy server state into several stores
and synchronize the copies with effects or watchers.

## 6. Keep modules small through cohesive design

Apply KISS, YAGNI, and disciplined Open/Closed. Prefer the fewest interacting
concepts, not the fewest lines. Reuse stable extension points for demonstrated
variation; do not add speculative plugin systems, universal schemas, managers,
or inheritance hierarchies. A second occurrence is evidence, not a numeric law.

For hand-maintained frontend code, aim for a component/module that can be read as
one responsibility, commonly around 150-300 lines. Above roughly 400 lines,
review its responsibilities before extending it. A 1,000+ line component, store,
or orchestration module requires an explicit decomposition assessment; do not
add unrelated behavior to it. These are review triggers, not universal numeric
limits. Existing repository size gates remain binding and must not be weakened.

Count Vue/Svelte script, template, and styles separately when explaining a large
file. Distinguish executable code from generated clients, static catalogues,
fixtures, and vendored assets. Do not count third-party bundles as first-party
engineering defects. Do not game limits by minifying, deleting explanatory text,
compressing functions, or splitting into coupled fragments with shared globals.

## 7. Use composition, SOLID, and researched patterns

For a non-trivial design/refactor, inspect existing implementations and tests;
research applicable language/library idioms and design patterns using primary
sources. Check the installed versions. Compare the proposed pattern with the
existing design and a simpler alternative. Record the problem it solves and its
cost in the existing task notes; routine edits need no research ceremony.

SOLID applies to modules, functions, components, and adapters, not just classes:
SRP groups reasons for change; OCP protects stable consumers; LSP preserves
behavior; ISP keeps consumer contracts small; DIP protects dependency direction.

| Pattern | Appropriate use | Misuse to reject |
| --- | --- | --- |
| Presentation Model / small feature controller | Separate screen state and interaction behavior from rendering. | A second domain model or one giant useEverything hook. |
| Adapter / Facade | Hide transport, native, and vendor details behind needed capabilities. | A universal client/store or one wrapper per line. |
| Reducer / explicit state machine | Model draft, loading, connection, and request lifecycles. | Reimplementing authoritative business transitions. |
| Command as data | Carry a user's intent to the authority and associate its response. | Executing approval, persistence, or domain transactions in the renderer. |
| Strategy through a function/object | Select a genuinely variable display or interaction algorithm. | A plugin hierarchy for one algorithm, or a client business-policy engine. |
| Observer / subscription | Consume typed events with a clear owner and cleanup. | An unrestricted global bus carrying hidden workflow logic. |

Compose with functions, small objects, props/events, hooks, or composables.
Follow the existing React/Vue style; do not convert an entire app to a different
component API, state library, or language just to apply these principles.

## 8. Make types, UI states, and errors explicit

In TypeScript, preserve strictness and narrow `unknown` data at boundaries.
Interfaces, type assertions, `satisfies`, and generic request signatures do not
validate runtime payloads. Use the existing runtime schemas/decoders or focused
validated parsers. Avoid `any`, double casts, and non-null assertions used to
silence an unresolved mismatch. Distinguish absent, null, empty, zero, and false.

In JavaScript, use small modules, documented contracts/JSDoc, runtime validation,
and focused tests. Adopt checked JavaScript where the existing tooling supports
it; do not require a whole-repository TypeScript conversion. Preserve the owning
package's ESM/CommonJS setup. Prefer tagged states/discriminated unions to
combinations of booleans that admit impossible states.

Keep loading, empty, unavailable, stale, rejected, cancelled, and failed states
distinct. Preserve actionable errors. Do not catch failures and return `[]`, `{}`,
zero, or mock data as successful results. Optional absence may have a documented
fallback; an incompatible contract must remain visible.

## 9. Own effects, subscriptions, and privileged resources

Use React effects/Vue watchers for synchronization with external systems, not
for duplicating derived state or triggering hidden business workflows. Compute
presentation values with pure functions/selectors/computed values. Reuse existing
query/subscription facilities before writing another lifecycle mechanism.

Assign one owner to each subscription, timer, socket, observer, object URL,
media stream, and native listener. Clean it up on disposal and when identity or
connection changes. Bound queues, retries, payloads, and concurrency. Account for
mobile pause/resume and daemon restarts. Ignore stale responses or cancel the
request as supported; transport cancellation does not undo a committed mutation.
Do not retry writes blindly: use the authoritative idempotency contract or expose
an uncertain result. Preserve drafts across failures and reconcile optimistic
pending state against authoritative results rather than claiming completion.

Keep Electron main/preload/renderer and Tauri/Capacitor native boundaries intact.
Expose narrow operations and validate inputs in the privileged handler; a typed
bridge is not a security control by itself. Keep privileged secrets and unrestricted
filesystem/shell access out of renderers. Treat model output, messages, and remote
markup as untrusted data; use safe rendering and existing reviewed sanitization.
A privileged process is not a reason to duplicate the product's domain service.

## 10. Verify boundaries and behavior, then report the evidence

Protect existing behavior before extraction. Test presentation transforms without
mounting an entire app, interaction controllers with explicit dependencies, and
adapters against the real contract. Add component tests for input/error states
and focused integration/E2E tests for the affected user flow. Verify cleanup,
reconnection, stale responses, rejection, and uncertain writes when relevant.
A browser mock does not prove native behavior, delivery, or interoperability.

Use installed, locked local tools and the correct workspace/package manager.
For code changes, run applicable type/lint checks, focused tests, and builds;
for UI changes, inspect the real output, keyboard/focus behavior, and useful
window sizes. A typecheck is not a visual test. Documentation-only changes need
policy/link/diff checks, not an application build or device test.

Use existing import-boundary, contract-generation, and size checks where present.
When implementing a substantive boundary change, add a focused regression using
existing test/lint facilities where practical. Do not introduce a new architecture
checker or broad lint rollout as incidental policy work. Never suppress rules,
relax size limits, loosen types, or rewrite snapshots merely to pass checks.
Remove superseded paths safely; report exactly what was tested and not tested.

## Research basis

This is project-specific policy, not a quotation or a claim that the sources
prescribe these thresholds. Primary references checked on 30 September 2026:

- SOLID: Robert C. Martin, *Solid Relevance*:
  `https://blog.cleancoder.com/uncle-bob/2020/10/18/Solid-Relevance.html`
- Presentation Model: Martin Fowler:
  `https://martinfowler.com/eaaDev/PresentationModel.html`
- React, effects and derived state:
  `https://react.dev/learn/you-might-not-need-an-effect`
- Vue, composable ownership and cleanup:
  `https://vuejs.org/guide/reusability/composables.html`
- TypeScript, assertions and runtime behavior:
  `https://www.typescriptlang.org/docs/handbook/2/everyday-types.html`
- OWASP, client-side versus authoritative input validation:
  `https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html`
- Electron, privileged boundaries and IPC:
  `https://www.electronjs.org/docs/latest/tutorial/security`
- Tauri, native/WebView security boundaries:
  `https://v2.tauri.app/security/`

## Repository application: YARA

Reviewed default branch `main` at
`e06e53e311ad3fab5250445614310440e5793935` on 30 September 2026.
This is a targeted source/policy review, not proof of live interoperability.

### Observed starting points

- `src/frontend/components/messages/ConversationViewer.vue`: 1,638 lines,
  approximately 1,228 script lines. Lines 1036-1133 mix draft handling,
  attachment preparation, API payload construction, an HTTP call, and UI updates.
  Other methods directly access `window.axios` for history, peers, and cancellation.
- `src/frontend/components/interfaces/AddInterfacePage.vue`: 1,319 lines,
  approximately 518 script lines. Do not treat all SFC lines as executable logic.
- `src/frontend/components/App.vue`: 636 lines; it performs application/config
  and propagation requests in addition to shell presentation.
- `src/frontend/js/WebSocketConnection.js`, `GlobalState.js`, and
  `GlobalEmitter.js` are existing integration/state boundaries to inspect before
  introducing another global client or event mechanism.

The selected first-party UI scan found two files over 1,000 lines among 45
files. `src/frontend/public/` assets, including bundled Vue and other flasher
vendor sources, were excluded. Imported upstream code is still maintenance
surface, but preserving notices and checking callers precede its removal.
No AGENTS.md existed at the reviewed revision; one is added with this policy.

### Ownership and implementation direction

Retain the small reference/interoperability application scope in README.md.
Use the existing Vue JavaScript components, Vite build, and Electron launcher.
Do not initiate a wholesale TypeScript/Composition API conversion or introduce
Pinia, React, a new UI library, or another application architecture by default.
Use JSDoc, explicit module contracts, validated payloads, and focused tests in JS.

Keep messages, conversation history, identities, delivery state, and protocol
behavior in the selected compatible daemon. A UI adapter prepares REST payloads
and maps WebSocket events; it must not implement RNS/LXMF encoding, routing,
delivery acceptance, or a competing message database. Media capture and immediate
size/input feedback can remain client-side; the daemon owns actual limits and
acceptance. Never display submitted/queued as delivered without that event.

As the conversation screen is changed, extract the touched message API/events,
draft interaction, or display concern through narrow functions/objects. Preserve
reconnect/restart semantics and remove event handlers on disposal. Keep unsupported
Rust-mode capabilities explicit; do not fabricate backend success. Preserve the
legacy Python comparison path when required without expanding YARA's scope.

Keep launcher/process/settings behavior in `electron/` and the existing launcher
module; the renderer must not gain arbitrary shell/filesystem/IPC access. Maintain
upstream copyright/license notices. No optional-feature purge is authorized by
this policy.

### Relevant local checks for later code changes

Use `npm run build-frontend` for the existing UI build and
`npm run test:launcher` when Electron/launcher behavior changes. The reviewed
manifest has no general UI unit-test, lint, or typecheck script; do not claim
those checks ran. Add a focused regression with suitable existing facilities
when implementing a change rather than introducing a broad test migration here.
Use the live daemon flow in `docs/rust-poc.md` when claiming compatibility;
launcher tests and a successful Vite build do not establish it.
