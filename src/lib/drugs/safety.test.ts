import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  safetyOnDesk,
  isPde5Nitrate,
  isXoThiopurine,
  isMtxTmpsmx,
  isSofosbuvirAmio,
  isClozapineBenzo,
} from "./safety";

describe("safetyOnDesk - Clinical Collision Suite", () => {
  it("detects PDE5 inhibitor × organic nitrate collision as contraindicated", () => {
    assert.equal(isPde5Nitrate("sildenafil", "nitroglycerin"), true);
    assert.equal(isPde5Nitrate("nitroglycerin", "tadalafil"), true);
    assert.equal(isPde5Nitrate("sildenafil", "isosorbide-mononitrate"), true);
    assert.equal(isPde5Nitrate("sildenafil", "metformin"), false);

    const hits = safetyOnDesk(["sildenafil", "nitroglycerin"]);
    assert.equal(hits.length, 1);
    const hit = hits[0];
    assert.equal(hit.id, "pde5-nitrate");
    assert.equal(hit.severity, "contraindicated");
    assert.equal(hit.tone, "danger");
    assert.match(hit.clinical, /refractory hypotension/i);
    assert.match(hit.source, /Viagra.*Nitrostat/i);
  });

  it("detects Xanthine Oxidase inhibitor × Thiopurine collision as contraindicated", () => {
    assert.equal(isXoThiopurine("allopurinol", "azathioprine"), true);
    assert.equal(isXoThiopurine("azathioprine", "febuxostat"), true);
    assert.equal(isXoThiopurine("allopurinol", "mercaptopurine"), true);
    assert.equal(isXoThiopurine("allopurinol", "atorvastatin"), false);

    const hits = safetyOnDesk(["allopurinol", "azathioprine"]);
    assert.equal(hits.length, 1);
    const hit = hits[0];
    assert.equal(hit.id, "xo-thiopurine");
    assert.equal(hit.severity, "contraindicated");
    assert.equal(hit.tone, "danger");
    assert.match(hit.clinical, /6-mercaptopurine.*6-TGN.*pancytopenia/i);
    assert.match(hit.source, /Imuran.*Zyloprim/i);
  });

  it("detects Methotrexate × TMP-SMX collision as contraindicated", () => {
    assert.equal(isMtxTmpsmx("methotrexate", "tmp-smx"), true);
    assert.equal(isMtxTmpsmx("tmp-smx", "methotrexate"), true);
    assert.equal(isMtxTmpsmx("methotrexate", "amoxicillin"), false);

    const hits = safetyOnDesk(["methotrexate", "tmp-smx"]);
    assert.equal(hits.length, 1);
    const hit = hits[0];
    assert.equal(hit.id, "mtx-tmpsmx");
    assert.equal(hit.severity, "contraindicated");
    assert.equal(hit.tone, "danger");
    assert.match(hit.clinical, /tubular secretion.*pancytopenia/i);
    assert.match(hit.source, /Methotrexate and Bactrim/i);
  });

  it("continues to detect existing high-risk safety collisions", () => {
    const amioHits = safetyOnDesk(["sofosbuvir", "amiodarone"]);
    assert.equal(amioHits.length, 1);
    assert.equal(amioHits[0].id, "sofosbuvir-amio");
    assert.equal(amioHits[0].severity, "contraindicated");

    const clozHits = safetyOnDesk(["clozapine", "lorazepam"]);
    assert.equal(clozHits.length, 1);
    assert.equal(clozHits[0].id, "clozapine-benzo");
    assert.equal(clozHits[0].severity, "contraindicated");
  });

  it("returns empty array when regimen has no mapped collisions", () => {
    const hits = safetyOnDesk(["acetaminophen", "atorvastatin"]);
    assert.equal(hits.length, 0);
  });
});
