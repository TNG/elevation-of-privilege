---
"@eop/root": patch
---

Fix jsdom resolution failure in client tests. jsdom was only declared as a
devDependency of @eop/client, so npm hoisted it to apps/client/node_modules
instead of the root node_modules. vitest's worker (located at the root
node_modules) imports jsdom via a bare specifier using Node's ESM resolver,
which could not resolve it from outside the client workspace. Adding jsdom
to the root devDependencies ensures it is hoisted to the root node_modules
where vitest can resolve it.
