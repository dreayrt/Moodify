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
          <div className="flex items-center gap-2">
            <h2 className="font-graphik text-[24px] font-bold text-white tracking-tight">
              Bản Quyền &amp; Hợp Đồng Phân Phối
            </h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Quản lý đối tác phân phối, hợp đồng tác quyền và chứng nhận bản quyền bài hát phát hành.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-[#222432] bg-[#12131a] p-1">
          <button
            type="button"
            onClick={() => setSubTab("contracts")}
            className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition ${
              subTab === "contracts" ? "bg-[#ff5500] text-white shadow-sm" : "text-zinc-400 hover:text-white"
            }`}
          >
            Hợp Đồng ({contracts.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("distributors")}
            className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition ${
              subTab === "distributors" ? "bg-[#ff5500] text-white shadow-sm" : "text-zinc-400 hover:text-white"
            }`}
          >
            Nhà Phân Phối ({distributors.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("licenses")}
            className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition ${
              subTab === "licenses" ? "bg-[#ff5500] text-white shadow-sm" : "text-zinc-400 hover:text-white"
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
                className={`relative flex flex-col justify-between rounded-2xl border bg-[#12131a] p-5 shadow-xl transition hover:border-[#ff5500]/40 ${
                  isExpired ? "border-[#222432] opacity-60" : "border-[#222432]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-semibold text-[#ff5500]">{ct.contractCode}</span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          ct.status === "ACTIVE" ? "bg-emerald-400" : "bg-zinc-500"
                        }`}
                      />
                      <span className={ct.status === "ACTIVE" ? "text-emerald-400" : "text-zinc-500"}>
                        {ct.status}
                      </span>
                    </span>
                  </div>

                  <h3 className="mt-3 font-graphik text-[17px] font-semibold text-white">{ct.title}</h3>
                  <p className="text-[12px] text-zinc-400">{ct.distributorName}</p>

                  <div className="mt-4 rounded-xl border border-[#222432] bg-[#171822] p-3 text-[12px] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Chia sẻ doanh thu</span>
                      <span className="font-graphik font-bold text-white flex items-center gap-0.5">
                        <Percent className="h-3 w-3 text-[#ff5500]" /> {ct.revenueShare}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Hiệu lực từ</span>
                      <span className="text-zinc-200">{ct.effectiveFrom || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between text-zinc-400">
                      <span>Hết hạn</span>
                      <span className="text-zinc-200">{ct.effectiveTo || "Vô thời hạn"}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#222432] pt-3 text-[12px]">
                  <span className="text-zinc-500">Ký ngày: {ct.signedDate}</span>
                  <a
                    href={ct.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#ff5500] hover:underline font-medium"
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
              className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-xl transition hover:border-[#ff5500]/40"
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl border border-[#ff5500]/20 bg-[#ff5500]/10 text-[#ff5500]">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-graphik text-[17px] font-semibold text-white">{dist.companyName}</h3>
              <p className="text-[12px] text-zinc-400 flex items-center gap-1 mt-0.5">
                <Globe2 className="h-3 w-3" /> {dist.country}
              </p>

              <div className="mt-4 border-t border-[#222432] pt-3 text-[12px] space-y-1 text-zinc-300">
                <p>Đại diện: {dist.contactName || "Chưa cập nhật"}</p>
                <p className="text-zinc-400 text-[11px] truncate">{dist.contactEmail}</p>
                <p className="text-zinc-400 text-[11px]">{dist.contactPhone || "Chưa có SĐT"}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[#222432] pt-3 text-[11px]">
                <span className="text-zinc-400">{dist.contractCount} hợp đồng liên kết</span>
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
        <div className="overflow-hidden rounded-2xl border border-[#222432] bg-[#12131a] shadow-xl anim-fade-up">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-[#222432] bg-[#171822] text-[10px] uppercase font-mono tracking-wider text-zinc-400">
                <tr>
                  <th className="py-4 pl-6 pr-3">Bài hát</th>
                  <th className="py-4 px-3">Hình thức giấy phép</th>
                  <th className="py-4 px-3">Chủ sở hữu tác quyền</th>
                  <th className="py-4 px-3">Nhà phân phối</th>
                  <th className="py-4 px-3">Thời hạn</th>
                  <th className="py-4 pl-3 pr-6 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222432]/60 text-zinc-300">
                {licenses.map((lic) => (
                  <tr key={lic.id} className="transition hover:bg-[#171822]/60">
                    <td className="py-3.5 pl-6 pr-3">
                      <p className="font-semibold text-white">{lic.trackTitle}</p>
                      <p className="text-[11px] font-mono text-zinc-400">{lic.trackId}</p>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] text-zinc-300">
                      {lic.licenseType}
                    </td>
                    <td className="py-3.5 px-3 text-zinc-200">{lic.copyrightOwner}</td>
                    <td className="py-3.5 px-3 text-zinc-400">{lic.distributorName || "Trực tiếp"}</td>
                    <td className="py-3.5 px-3 text-[12px] text-zinc-400 font-mono">
                      {lic.issueDate} ➜ {lic.expiryDate}
                    </td>
                    <td className="py-3.5 pl-3 pr-6 text-right">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            lic.status === "ACTIVE" ? "bg-emerald-400" : "bg-zinc-500"
                          }`}
                        />
                        <span className={lic.status === "ACTIVE" ? "text-emerald-400" : "text-zinc-500"}>
                          {lic.status}
                        </span>
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
