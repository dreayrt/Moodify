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
  RefreshCw,
  Search,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { DistributionContract, Distributor, SongLicense } from "../types";
import { ModalPortal } from "./shared/modal-portal";

type LicensingTabProps = {
  distributors: Distributor[];
  contracts: DistributionContract[];
  licenses: SongLicense[];
  onCreateDistributor?: (data: Partial<Distributor>) => void;
  onToggleDistributorStatus?: (id: number) => void;
  onCreateContract?: (data: Partial<DistributionContract>) => void;
  onToggleContractStatus?: (id: number, newStatus: string) => void;
};

export function LicensingTab({
  distributors,
  contracts,
  licenses,
  onCreateDistributor,
  onToggleDistributorStatus,
  onCreateContract,
  onToggleContractStatus,
}: LicensingTabProps) {
  const [subTab, setSubTab] = useState<"contracts" | "distributors" | "licenses">("contracts");

  // Create Distributor Modal State
  const [isDistributorModalOpen, setIsDistributorModalOpen] = useState(false);
  const [distributorForm, setDistributorForm] = useState({
    companyName: "",
    country: "Việt Nam",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  // Create Contract Modal State
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractForm, setContractForm] = useState({
    distributorId: distributors.length > 0 ? distributors[0].id : 1,
    title: "",
    contractCode: `CTR-VN-${Math.floor(1000 + Math.random() * 9000)}`,
    signedDate: new Date().toISOString().split("T")[0],
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "2028-12-31",
    revenueShare: 70,
    documentUrl: "https://moodify.vn/contracts/sample.pdf",
    status: "ACTIVE" as "ACTIVE" | "EXPIRED" | "TERMINATED" | "DRAFT",
  });

  const handleSaveDistributor = () => {
    if (!distributorForm.companyName.trim()) return;
    if (onCreateDistributor) {
      onCreateDistributor(distributorForm);
    }
    setIsDistributorModalOpen(false);
    setDistributorForm({
      companyName: "",
      country: "Việt Nam",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      status: "ACTIVE",
    });
  };

  const handleSaveContract = () => {
    if (!contractForm.title.trim()) return;
    if (onCreateContract) {
      onCreateContract(contractForm);
    }
    setIsContractModalOpen(false);
    setContractForm({
      distributorId: distributors.length > 0 ? distributors[0].id : 1,
      title: "",
      contractCode: `CTR-VN-${Math.floor(1000 + Math.random() * 9000)}`,
      signedDate: new Date().toISOString().split("T")[0],
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveTo: "2028-12-31",
      revenueShare: 70,
      documentUrl: "https://moodify.vn/contracts/sample.pdf",
      status: "ACTIVE",
    });
  };

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
            Quản lý đối tác phân phối, hợp đồng tác quyền và chứng nhận bản quyền bài hát phát hành lưu trữ trực tiếp trên cơ sở dữ liệu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {subTab === "contracts" && onCreateContract && (
            <button
              type="button"
              onClick={() => setIsContractModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#ff5500] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#ff6a1a] shadow-lg shadow-[#ff5500]/25 transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Ký Hợp Đồng Mới</span>
            </button>
          )}

          {subTab === "distributors" && onCreateDistributor && (
            <button
              type="button"
              onClick={() => setIsDistributorModalOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#ff5500] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#ff6a1a] shadow-lg shadow-[#ff5500]/25 transition active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm Đối Tác</span>
            </button>
          )}

          <div className="flex items-center gap-1 rounded-full border border-[#222432] bg-[#12131a] p-1">
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
      </div>

      {/* VIEW: CONTRACTS */}
      {subTab === "contracts" && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 anim-fade-up">
          {contracts.length === 0 ? (
            <div className="col-span-3 rounded-2xl border border-[#222432] bg-[#12131a] p-12 text-center text-zinc-500 font-mono text-xs">
              Chưa có hợp đồng phân phối nào trong cơ sở dữ liệu. Nhấn "Ký Hợp Đồng Mới" để tạo.
            </div>
          ) : (
            contracts.map((ct) => {
              const isExpired = ct.status === "EXPIRED" || ct.status === "TERMINATED";

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
                      <button
                        type="button"
                        onClick={() => {
                          if (onToggleContractStatus) {
                            const next = ct.status === "ACTIVE" ? "TERMINATED" : "ACTIVE";
                            onToggleContractStatus(ct.id, next);
                          }
                        }}
                        title="Nhấn để đổi trạng thái"
                        className="inline-flex items-center gap-1.5 font-mono text-[11px] font-medium hover:opacity-80 transition cursor-pointer"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            ct.status === "ACTIVE" ? "bg-emerald-400" : "bg-zinc-500"
                          }`}
                        />
                        <span className={ct.status === "ACTIVE" ? "text-emerald-400" : "text-zinc-500"}>
                          {ct.status}
                        </span>
                      </button>
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
            })
          )}
        </div>
      )}

      {/* VIEW: DISTRIBUTORS */}
      {subTab === "distributors" && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 anim-fade-up">
          {distributors.length === 0 ? (
            <div className="col-span-4 rounded-2xl border border-[#222432] bg-[#12131a] p-12 text-center text-zinc-500 font-mono text-xs">
              Chưa có nhà phân phối nào trong cơ sở dữ liệu. Nhấn "Thêm Đối Tác" để tạo.
            </div>
          ) : (
            distributors.map((dist) => (
              <div
                key={dist.id}
                className="rounded-2xl border border-[#222432] bg-[#12131a] p-5 shadow-xl transition hover:border-[#ff5500]/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="grid h-12 w-12 place-items-center rounded-xl border border-[#ff5500]/20 bg-[#ff5500]/10 text-[#ff5500]">
                      <Building2 className="h-6 w-6" />
                    </div>
                    {onToggleDistributorStatus && (
                      <button
                        type="button"
                        onClick={() => onToggleDistributorStatus(dist.id)}
                        className={`rounded-full px-2.5 py-1 text-[10px] font-mono font-semibold transition cursor-pointer ${
                          dist.status === "ACTIVE"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            : "bg-white/10 text-white/50 border border-white/10"
                        }`}
                        title="Bấm để chuyển trạng thái"
                      >
                        {dist.status}
                      </button>
                    )}
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
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#222432] pt-3 text-[11px]">
                  <span className="text-zinc-400">{dist.contractCount} hợp đồng liên kết</span>
                  <span className="font-mono text-zinc-500">ID #{dist.id}</span>
                </div>
              </div>
            ))
          )}
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
                {licenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500 font-mono text-xs">
                      Chưa có giấy phép bản quyền nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  licenses.map((lic) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE DISTRIBUTOR ================= */}
      {isDistributorModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/85 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[#222432] bg-[#12131a] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#222432] pb-3">
                <div className="flex items-center gap-2.5 text-white">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ff5500]/15 text-[#ff5500]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-graphik text-base font-bold text-white">Thêm Nhà Phân Phối Mới</h3>
                    <p className="font-mono text-xs text-zinc-400">Kết nối đối tác cung cấp nội dung</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDistributorModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-zinc-300 block mb-1 font-semibold">Tên Doanh Nghiệp / Nhãn Đĩa *</label>
                  <input
                    type="text"
                    value={distributorForm.companyName}
                    onChange={(e) => setDistributorForm({ ...distributorForm, companyName: e.target.value })}
                    placeholder="Ví dụ: Universal Music Vietnam"
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2 text-sm text-white focus:border-[#ff5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1 font-semibold">Quốc Gia *</label>
                  <input
                    type="text"
                    value={distributorForm.country}
                    onChange={(e) => setDistributorForm({ ...distributorForm, country: e.target.value })}
                    placeholder="Ví dụ: Việt Nam, Hoa Kỳ, Hàn Quốc"
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2 text-sm text-white focus:border-[#ff5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-zinc-300 block mb-1 font-semibold">Người Đại Diện Pháp Lý</label>
                  <input
                    type="text"
                    value={distributorForm.contactName}
                    onChange={(e) => setDistributorForm({ ...distributorForm, contactName: e.target.value })}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2 text-sm text-white focus:border-[#ff5500] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-zinc-300 block mb-1 font-semibold">Email Liên Hệ</label>
                    <input
                      type="email"
                      value={distributorForm.contactEmail}
                      onChange={(e) => setDistributorForm({ ...distributorForm, contactEmail: e.target.value })}
                      placeholder="contact@distributor.com"
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-300 block mb-1 font-semibold">Số Điện Thoại</label>
                    <input
                      type="text"
                      value={distributorForm.contactPhone}
                      onChange={(e) => setDistributorForm({ ...distributorForm, contactPhone: e.target.value })}
                      placeholder="+84 901..."
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#222432]">
                <button
                  type="button"
                  onClick={() => setIsDistributorModalOpen(false)}
                  className="rounded-full border border-[#222432] px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-[#171822]"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveDistributor}
                  className="rounded-full bg-[#ff5500] px-5 py-2 text-xs font-semibold text-white hover:bg-[#ff6a1a] shadow-lg shadow-[#ff5500]/25 transition active:scale-95 cursor-pointer"
                >
                  Lưu Đối Tác
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* ================= MODAL: CREATE CONTRACT ================= */}
      {isContractModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-4 bg-black/85 backdrop-blur-md anim-fade-in">
            <div className="relative my-auto w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#222432] bg-[#12131a] p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#222432] pb-3">
                <div className="flex items-center gap-2.5 text-white">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ff5500]/15 text-[#ff5500]">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-graphik text-base font-bold text-white">Ký Hợp Đồng Phân Phối Mới</h3>
                    <p className="font-mono text-xs text-zinc-400">Thiết lập hợp đồng tác quyền nội dung</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsContractModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-zinc-300 block mb-1 font-semibold">Đối Tác Phân Phối *</label>
                  <select
                    value={contractForm.distributorId}
                    onChange={(e) => setContractForm({ ...contractForm, distributorId: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2 text-sm text-white focus:border-[#ff5500] focus:outline-none"
                  >
                    {distributors.map((d) => (
                      <option key={d.id} value={d.id} className="bg-[#12131a]">
                        {d.companyName} ({d.country})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-zinc-300 block mb-1 font-semibold">Tiêu Đề Hợp Đồng *</label>
                    <input
                      type="text"
                      value={contractForm.title}
                      onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
                      placeholder="Ví dụ: Hợp đồng phân phối nhạc 2026"
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2 text-sm text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-300 block mb-1 font-semibold">Mã Hợp Đồng *</label>
                    <input
                      type="text"
                      value={contractForm.contractCode}
                      onChange={(e) => setContractForm({ ...contractForm, contractCode: e.target.value })}
                      placeholder="CTR-2026-001"
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2 text-sm font-mono text-[#ff5500] focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-zinc-300 block mb-1 font-semibold">Ngày Ký</label>
                    <input
                      type="date"
                      value={contractForm.signedDate}
                      onChange={(e) => setContractForm({ ...contractForm, signedDate: e.target.value })}
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-2.5 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-300 block mb-1 font-semibold">Hiệu Lực Từ</label>
                    <input
                      type="date"
                      value={contractForm.effectiveFrom}
                      onChange={(e) => setContractForm({ ...contractForm, effectiveFrom: e.target.value })}
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-2.5 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-300 block mb-1 font-semibold">Hiệu Lực Đến</label>
                    <input
                      type="date"
                      value={contractForm.effectiveTo}
                      onChange={(e) => setContractForm({ ...contractForm, effectiveTo: e.target.value })}
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-2.5 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-zinc-300 block mb-1 font-semibold">Tỷ Lệ Chia Sẻ (%)</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={contractForm.revenueShare}
                      onChange={(e) => setContractForm({ ...contractForm, revenueShare: Number(e.target.value) })}
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2 text-sm text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-300 block mb-1 font-semibold">Liên Kết Văn Bản PDF</label>
                    <input
                      type="url"
                      value={contractForm.documentUrl}
                      onChange={(e) => setContractForm({ ...contractForm, documentUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-[#222432] bg-[#171822] px-3.5 py-2 text-xs text-white focus:border-[#ff5500] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#222432]">
                <button
                  type="button"
                  onClick={() => setIsContractModalOpen(false)}
                  className="rounded-full border border-[#222432] px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-[#171822]"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveContract}
                  className="rounded-full bg-[#ff5500] px-5 py-2 text-xs font-semibold text-white hover:bg-[#ff6a1a] shadow-lg shadow-[#ff5500]/25 transition active:scale-95 cursor-pointer"
                >
                  Lưu Hợp Đồng
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
