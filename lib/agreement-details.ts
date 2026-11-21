export const AGREEMENT_FIELDS = [
  { key: "licensorName", label: "Tên bên cấp quyền", group: "Bên cấp quyền", maxLength: 200 },
  { key: "licensorAddress", label: "Địa chỉ bên cấp quyền", group: "Bên cấp quyền", maxLength: 500 },
  { key: "licensorRepresentative", label: "Người đại diện bên cấp quyền", group: "Bên cấp quyền", maxLength: 200 },
  { key: "licensorTitle", label: "Chức vụ bên cấp quyền", group: "Bên cấp quyền", maxLength: 120 },
  { key: "licenseeName", label: "Tên bên nhận quyền", group: "Bên nhận quyền", maxLength: 200 },
  { key: "licenseeAddress", label: "Địa chỉ bên nhận quyền", group: "Bên nhận quyền", maxLength: 500 },
  { key: "licenseeRepresentative", label: "Người đại diện bên nhận quyền", group: "Bên nhận quyền", maxLength: 200 },
  { key: "licenseeTitle", label: "Chức vụ bên nhận quyền", group: "Bên nhận quyền", maxLength: 120 },
  { key: "signingPlace", label: "Địa điểm dự kiến ký", group: "Lịch ký", maxLength: 200 },
  { key: "plannedSigningDate", label: "Ngày dự kiến ký", group: "Lịch ký", maxLength: 10 },
] as const;

export const AGREEMENT_GROUPS = ["Bên cấp quyền", "Bên nhận quyền", "Lịch ký"] as const;

type AgreementField = (typeof AGREEMENT_FIELDS)[number]["key"];
export type AgreementDetails = Partial<Record<AgreementField, string>>;

export function readAgreementDetails(raw: unknown): AgreementDetails {
  if (!raw || typeof raw !== "object") return {};
  const values = raw as Record<string, unknown>;
  const details: AgreementDetails = {};
  for (const { key, maxLength } of AGREEMENT_FIELDS) {
    const value = values[key];
    if (typeof value === "string" && value.trim() && value.trim().length <= maxLength) {
      details[key] = value.trim();
    }
  }
  return details;
}
