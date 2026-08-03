# Security Design
## Dependency Risk Exception

As of August 2026, npm audit reports GHSA-qwww-vcr4-c8h2 against
React Router 7.18.2.

The advisory applies specifically to unstable React Server Components
(RSC) APIs. This application is a conventional client-side Vite SPA and
does not use React Router RSC mode.

The dependency will be upgraded to React Router 8.3.0 or later when the
project also adopts its required React, Vite, and ESM baselines.

The development team must not enable unstable React Router RSC APIs while
this exception remains active.