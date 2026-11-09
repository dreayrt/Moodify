import type { Metadata } from "next";

import {
  LEGAL_CONTACT_EMAIL,
  LegalBulletList,
  LegalPage,
  LegalSection,
} from "@/components/shared/legal-page";

export const metadata: Metadata = {
  title: "Hướng dẫn xóa dữ liệu — Moodify",
  description:
    "Cách yêu cầu Moodify xóa tài khoản và dữ liệu cá nhân của bạn.",
};

export default function DataDeletionPage() {
  return (
    <LegalPage
      title="Hướng dẫn xóa dữ liệu"
      updated="09/11/2026"
      intro="Bạn có quyền yêu cầu Moodify xóa tài khoản và toàn bộ dữ liệu cá nhân của mình. Dưới đây là các cách thực hiện."
    >
      <LegalSection heading="1. Yêu cầu xóa dữ liệu qua email">
        <p>
          Gửi email đến{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(
              "YÊU CẦU XÓA DỮ LIỆU MOODIFY",
            )}`}
            className="text-white underline underline-offset-4"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          với tiêu đề <strong>“YÊU CẦU XÓA DỮ LIỆU MOODIFY”</strong>, nội dung gồm email
          hoặc tên đăng nhập của tài khoản cần xóa.
        </p>
        <LegalBulletList
          items={[
            "Chúng tôi xác nhận đã nhận yêu cầu trong vòng 72 giờ.",
            "Việc xóa được hoàn tất trong tối đa 30 ngày kể từ khi xác nhận.",
            "Chúng tôi gửi email xác nhận sau khi xóa hoàn tất.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="2. Dữ liệu sẽ bị xóa">
        <LegalBulletList
          items={[
            "Thông tin tài khoản: họ tên, email, tên đăng nhập, số điện thoại, ảnh đại diện.",
            "Dữ liệu sử dụng: playlist, bài hát yêu thích, lịch sử phát và tìm kiếm.",
            "Kết quả chấm điểm karaoke và dữ liệu thiết bị đã đăng ký.",
          ]}
        />
        <p>
          Một số dữ liệu giao dịch thanh toán có thể được lưu giữ trong thời hạn pháp luật
          quy định nhằm mục đích kế toán, đối soát và sẽ được bảo vệ theo{" "}
          <a href="/privacy" className="text-white underline underline-offset-4">
            Chính sách quyền riêng tư
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="3. Liên hệ hỗ trợ">
        <p>
          Nếu gặp khó khăn trong quá trình yêu cầu xóa dữ liệu, hãy liên hệ{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="text-white underline underline-offset-4"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          — chúng tôi sẽ hỗ trợ bạn thực hiện.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
