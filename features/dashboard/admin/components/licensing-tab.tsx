"use client";

import { useState } from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Globe2,
  Percent,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { DistributionContract, Distributor, SongLicense } from "../types";

type LicensingTabProps = {
  distributors: Distributor[];
  contracts: DistributionContract[];
  licenses: SongLicense[];
};

export function LicensingTab({ distributors, contracts, licenses }: LicensingTabProps) {
  const [subTab, setSubTab] = useState<"contracts" | "distributors" | "licenses">("contracts");

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-graphik text-[26px] font-semibold text-white">Bản Quyền & Hợp Đồng Phân Phối</h2>
          <p className="mt-1 text-[13px] text-white/50">
            Quản lý nhà phân phối (`distributors`), hợp đồng tác quyền (`distribution_contracts`) và chứng thư bản quyền bài hát (`song_licenses`).
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => setSubTab("contracts")}
            className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition ${
              subTab === "contracts" ? "bg-[#ff7a2c] text-black" : "text-white/60 hover:text-white"
            }`}
          >
            Hợp Đồng ({contracts.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("distributors")}
            className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition ${
              subTab === "distributors" ? "bg-[#ff7a2c] text-black" : "text-white/60 hover:text-white"
            }`}
          >
            Nhà Phân Phối ({distributors.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("licenses")}
            className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition ${
              subTab === "licenses" ? "bg-[#ff7a2c] text-black" : "text-white/60 hover:text-white"
            }`}
          >
            Giấy Phép ({licenses.length})
          </button>
        </div>
      </div>

      {/* VIEW: CONTRACTS */}
      {subTab === "contracts" && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 anim-fade-up">
          {contracts.map((ct) => {
            const isExpired = ct.status === "EXPIRED";

            return (
              <div
                key={ct.id}
                className={`relative flex flex-col justify-between rounded-[26px] border bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition hover:border-white/14 ${
                  isExpired ? "border-white/6 opacity-60" : "border-white/8"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold text-[#ffb488]">{ct.contractCode}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        ct.status === "ACTIVE"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          : "bg-white/10 text-white/50"
                      }`}
                    >
                      {ct.status}
                    </span>
                  </div>

                  <h3 className="mt-3 font-graphik text-[17px] font-semibold text-white">{ct.title}</h3>
                  <p className="text-[12px] text-white/50">{ct.distributorName}</p>

                  <div className="mt-4 rounded-[16px] border border-white/6 bg-black/30 p-3 text-[12px] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Chia sẻ doanh thu</span>
                      <span className="font-graphik font-bold text-white flex items-center gap-0.5">
                        <Percent className="h-3 w-3 text-[#ff7a2c]" /> {ct.revenueShare}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-white/50">
                      <span>Hiệu lực từ</span>
                      <span className="text-white/80">{ct.effectiveFrom || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/50">
                      <span>Hết hạn</span>
                      <span className="text-white/80">{ct.effectiveTo || "Vô thời hạn"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-3 text-[12px]">
                  <span className="text-white/40">Ký ngày: {ct.signedDate}</span>
                  <a
                    href={ct.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#ff9b57] hover:underline"
                  >
                    Văn bản PDF <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: DISTRIBUTORS */}
      {subTab === "distributors" && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 anim-fade-up">
          {distributors.map((dist) => (
            <div
              key={dist.id}
              className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition hover:border-white/14"
            >
              <div className="grid h-12 w-12 place-items-center rounded-[16px] border border-white/10 bg-white/[0.05] text-[#ff7a2c]">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-graphik text-[17px] font-semibold text-white">{dist.companyName}</h3>
              <p className="text-[12px] text-white/50 flex items-center gap-1 mt-0.5">
                <Globe2 className="h-3 w-3" /> {dist.country}
              </p>

              <div className="mt-4 border-t border-white/8 pt-3 text-[12px] space-y-1 text-white/70">
                <p>Đại diện: {dist.contactName || "Chưa cập nhật"}</p>
                <p className="text-white/40 text-[11px] truncate">{dist.contactEmail}</p>
                <p className="text-white/40 text-[11px]">{dist.contactPhone || "Chưa có SĐT"}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-[11px]">
                <span className="text-white/50">{dist.contractCount} hợp đồng liên kết</span>
                <span
                  className={`rounded-full px-2 py-0.5 font-semibold ${
                    dist.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-white/10 text-white/40"
                  }`}
                >
                  {dist.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW: LICENSES */}
      {subTab === "licenses" && (
        <div className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03] shadow-[0_20px_50px_rgba(0,0,0,0.3)] anim-fade-up">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-white/8 bg-white/[0.02] text-[11px] uppercase tracking-[0.14em] text-white/44">
                <tr>
                  <th className="py-4 pl-6 pr-3">Bài hát</th>
                  <th className="py-4 px-3">Hình thức giấy phép</th>
                  <th className="py-4 px-3">Chủ sở hữu tác quyền</th>
                  <th className="py-4 px-3">Nhà phân phối</th>
                  <th className="py-4 px-3">Thời hạn</th>
                  <th className="py-4 pl-3 pr-6 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6 text-white/80">
                {licenses.map((lic) => (
                  <tr key={lic.id} className="transition hover:bg-white/[0.02]">
                    <td className="py-3.5 pl-6 pr-3">
                      <p className="font-semibold text-white">{lic.trackTitle}</p>
                      <p className="text-[11px] font-mono text-white/40">{lic.trackId}</p>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-[#ffb488]">
                        {lic.licenseType}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-white/80">{lic.copyrightOwner}</td>
                    <td className="py-3.5 px-3 text-white/60">{lic.distributorName || "Trực tiếp"}</td>
                    <td className="py-3.5 px-3 text-[12px] text-white/50">
                      {lic.issueDate} ➜ {lic.expiryDate}
                    </td>
                    <td className="py-3.5 pl-3 pr-6 text-right">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                          lic.status === "ACTIVE"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-white/10 text-white/50"
                        }`}
                      >
                        {lic.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
