import type { Metadata } from "next";

import {
  LEGAL_CONTACT_EMAIL,
  LegalBulletList,
  LegalPage,
  LegalSection,
} from "@/components/shared/legal-page";

export const metadata: Metadata = {
  title: "Điều khoản dịch vụ — Moodify",
  description:
    "Điều khoản sử dụng nền tảng âm nhạc Moodify: tài khoản, quy tắc sử dụng, nội dung và dịch vụ trả phí.",
};

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Điều khoản dịch vụ"
      updated="08/11/2026"
      intro="Khi tạo tài khoản hoặc sử dụng Moodify (moodify.click), bạn đồng ý với các điều khoản dưới đây. Vui lòng đọc kỹ trước khi sử dụng dịch vụ."
    >
      <LegalSection heading="1. Mô tả dịch vụ">
        <p>
          Moodify là nền tảng phát nhạc trực tuyến, bao gồm tính năng: nghe nhạc và podcast,
          gợi ý nội dung theo cảm xúc, quản lý thư viện và playlist, karaoke chấm điểm theo
          giọng hát, và gói dịch vụ trả phí (premium).
        </p>
      </LegalSection>

      <LegalSection heading="2. Tài khoản">
        <LegalBulletList
          items={[
            "Bạn cần cung cấp thông tin chính xác khi đăng ký và chịu trách nhiệm bảo mật thông tin đăng nhập.",
            "Bạn phải đủ 13 tuổi trở lên để sử dụng dịch vụ.",
            "Mọi hoạt động phát sinh trên tài khoản của bạn được coi là do bạn thực hiện.",
            "Bạn không được chia sẻ, cho thuê hoặc chuyển nhượng tài khoản cho bên thứ ba.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="3. Quy tắc sử dụng">
        <LegalBulletList
          items={[
            "Không can thiệp, reverse-engineer hoặc cố gắng truy cập trái phép hệ thống của Moodify.",
            "Không sử dụng dịch vụ cho mục đích bất hợp pháp hoặc gây nhiễu, ảnh hưởng trải nghiệm của người dùng khác.",
            "Không tải lên nội dung vi phạm pháp luật, xúc phạm, vi phạm quyền riêng tư của người khác.",
            "Không tự động hóa truy cập (bot, scraper) ngoài API công khai được cấp phép.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="4. Nội dung và bản quyền">
        <p>
          Nội dung âm nhạc trên Moodify được sử dụng theo giấy phép từ chủ sở hữu tương
          ứng. Quyền nghe nhạc của bạn mang tính cá nhân, không thương mại và không bao gồm
          quyền tải lại phân phối hoặc công khai nội dung. Đối với nội dung do bạn tải lên
          (bài hát, bìa album, bản thu karaoke công khai), bạn xác nhận mình có đủ quyền
          hợp pháp đối với nội dung đó.
        </p>
      </LegalSection>

      <LegalSection heading="5. Dịch vụ trả phí">
        <p>
          Gói premium được thanh toán theo kỳ hạn đã chọn qua cổng thanh toán của bên thứ
          ba. Quyền lợi bắt đầu sau khi thanh toán thành công. Vui lòng liên hệ hỗ trợ trong
          trường hợp giao dịch có lỗi để được xử lý.
        </p>
      </LegalSection>

      <LegalSection heading="6. Chấm dứt dịch vụ">
        <p>
          Bạn có thể ngừng sử dụng và yêu cầu xóa tài khoản bất cứ lúc nào theo hướng dẫn
          trên trang{" "}
          <a href="/data-deletion" className="text-white underline underline-offset-4">
            Hướng dẫn xóa dữ liệu
          </a>
          . Chúng tôi có quyền tạm khóa hoặc chấm dứt tài khoản vi phạm các điều khoản này.
        </p>
      </LegalSection>

      <LegalSection heading="7. Miễn trừ trách nhiệm">
        <p>
          Dịch vụ được cung cấp theo hiện trạng. Moodify không chịu trách nhiệm cho gián
          đoạn do hạ tầng bên thứ ba, lỗi mạng hoặc thiết bị của bạn, trừ phạm vi pháp luật
          có quy định khác.
        </p>
      </LegalSection>

      <LegalSection heading="8. Thay đổi điều khoản">
        <p>
          Chúng tôi có thể cập nhật điều khoản này; phiên bản hiệu lực luôn được công bố
          tại trang này. Việc tiếp tục sử dụng dịch vụ sau khi cập nhật đồng nghĩa với việc
          bạn chấp nhận điều khoản mới.
        </p>
      </LegalSection>

      <LegalSection heading="9. Liên hệ">
        <p>
          Mọi thắc mắc về điều khoản dịch vụ, vui lòng liên hệ email:{" "}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="text-white underline underline-offset-4"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
