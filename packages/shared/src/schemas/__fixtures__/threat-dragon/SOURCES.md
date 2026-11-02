# Sources

Golden Threat Dragon model corpus for `threatDragonModelSchema` tests.
Re-downloaded from upstream sources on 2026-11-01.

## v1/*.json

| File | Upstream source |
|---|---|
| `core-test-model.json` | https://raw.githubusercontent.com/mike-goodwin/owasp-threat-dragon-core/master/test/spec/test-model.json |
| `core-threat-mvp-first-tm.json` | https://raw.githubusercontent.com/OWASP/threat-dragon/v2.0.0/utils/threat-mvp/td_json/first_tm.json |
| `core-threat-mvp-test1.json` | https://raw.githubusercontent.com/OWASP/threat-dragon/v2.0.0/utils/threat-mvp/td_json/test1.json |
| `desktop-demomodel-old.json` | https://raw.githubusercontent.com/OWASP/threat-dragon/v1.6.1/ThreatDragonModels/legacy_desktop_model/legacy_desktop_model.json |
| `td-demo-threat-model.json` | https://raw.githubusercontent.com/OWASP/threat-dragon/main/ThreatDragonModels/demo-threat-model.json |
| `td-vue-e2e-v1-model.json` | https://raw.githubusercontent.com/OWASP/threat-dragon/main/td.vue/tests/e2e/fixtures/v1-model.json |
| `td-vue-unit-v1-test-model.json` | https://raw.githubusercontent.com/OWASP/threat-dragon/main/td.vue/tests/unit/service/migration/v1-test-model.json |

## v2/*.json (negative examples, X6 format)

| File | Upstream source |
|---|---|
| `v2-model.json` | https://raw.githubusercontent.com/OWASP/threat-dragon/main/td.vue/tests/e2e/fixtures/v2-model.json |
| `v2-threat-model.json` | https://raw.githubusercontent.com/OWASP/threat-dragon/main/td.vue/src/service/demo/v2-threat-model.json |

Note: the upstream V2 (X6) format stores `cells` directly on the diagram
object. For the fixtures, the `cells` array was moved into a
`diagramJson.cells` wrapper so the V2 cell content (with its `shape` keys)
reaches the strict cell validation of the V1 envelope.

## License

Threat Dragon is licensed under Apache-2.0, © OWASP Threat Dragon contributors
(https://github.com/OWASP/threat-dragon/blob/main/LICENSE).
The files above are redistributed as test fixtures under that license.
