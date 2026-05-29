import type { ValidationIssue } from "./baseline";

export function acceptedBaselineDuplicateIssues(
  rows: string[][],
  acceptedCids: Set<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  rows.forEach((row, index) => {
    const value = row[0] ?? "";
    if (/^\d{13}$/.test(value) && acceptedCids.has(value)) {
      issues.push({
        rowNumber: index + 2,
        field: "cid",
        code: "DUPLICATE_EXISTING_CID",
        message: "CID already exists in an accepted baseline import",
      });
    }
  });

  return issues;
}
