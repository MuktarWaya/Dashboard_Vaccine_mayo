import { describe, expect, it } from "vitest";
import { BASELINE_HEADERS } from "../../src/domain/baseline";

describe("BASELINE_HEADERS", () => {
  it("uses stable machine-readable keys for the import template", () => {
    expect(BASELINE_HEADERS).toEqual([
      "cid",
      "service_unit_code",
      "first_name",
      "last_name",
      "sex",
      "birth_date",
      "house_number",
      "village_no",
      "registry_status",
      "baseline_vaccine_status",
      "next_vaccine_due_date",
      "entry_type",
      "indicator_start_month",
      "is_ppa_target",
      "is_alternative_vaccine_target",
      "primary_vhv_name",
      "primary_family_health_volunteer_name",
    ]);
  });
});
