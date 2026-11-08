import type { Metadata } from "next";

import {
  LEGAL_CONTACT_EMAIL,
  LegalBulletList,
  LegalPage,
  LegalSection,
} from "@/components/shared/legal-page";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư — Moodify",
  description:
    "Cách Moodify thu thập, sử dụng và bảo vệ dữ liệu cá nhân của bạn khi sử dụng nền tảng âm nhạc Moodify.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Chính sách quyền riêng tư"
      updated="08/11/2026"
      intro="Moodify (moodify.click) là nền tảng phát nhạc trực tuyến cá nhân hóa theo cảm xúc. Chính sách này mô tả dữ liệu chúng tôi thu thập, mục đích sử dụng và quyền của bạn đối với dữ liệu đó khi bạn sử dụng ứng dụng di động và trang web Moodify."
    >
      <LegalSection heading="1. Dữ liệu chúng tôi thu thập">
        <LegalBulletList
          items={[
            <>
              <strong>Thông tin tài khoản:</strong> họ tên, email, tên đăng nhập, số điện
              thoại và ảnh đại diện — do bạn cung cấp khi đăng ký, hoặc nhận từ Google /
              Facebook khi bạn chọn đăng nhập bằng mạng xã hội (chỉ những trường mà bạn
              cho phép nhà cung cấp chia sẻ).
            </>,
            <>
              <strong>Dữ liệu sử dụng dịch vụ:</strong> bài hát đã phát, bài hát yêu thích,
              playlist, lịch sử tìm kiếm, kết quả chấm điểm karaoke và lượt truy cập tính
              năng, phục vụ cá nhân hóa gợi ý âm nhạc.
            </>,
            <>
              <strong>Dữ liệu thiết bị:</strong> định danh thiết bị (UUID) và nền tảng
              (Android/iOS/Web) để quản lý phiên đăng nhập, cho phép bạn thu hồi quyền truy
              cập của từng thiết bị.
            </>,
            <>
              <strong>Âm thanh karaoke:</strong> giọng hát được ghi nhận tạm thời trong quá
              trình chấm điểm karaoke và chỉ được xử lý cho mục đích này.
            </>,
            <>
              <strong>Thanh toán:</strong> thông tin gói dịch vụ premium được xử lý bởi cổng
              thanh toán bên thứ ba; Moodify không lưu trữ thông tin thẻ của bạn.
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection heading="2. Mục đích sử dụng">
        <LegalBulletList
          items={[
            "Cung cấp, vận hành và cá nhân hóa dịch vụ phát nhạc, gợi ý theo cảm xúc và karaoke.",
            "Xác thực đăng nhập, quản lý phiên và bảo vệ tài khoản của bạn.",
            "Hỗ trợ người dùng và phản hồi yêu cầu.",
            "Phòng chống lạm dụng, gian lận và vi phạm điều khoản dịch vụ.",
          ]}
        />
      </LegalSection>

      <LegalSection heading="3. Chia sẻ dữ liệu">
        <p>
          Chúng tôi không bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ với: nhà cung cấp
          đăng nhập bên thứ ba (Google, Meta) theo luồng OAuth; nhà cung cấp hạ tầng lưu
          trữ và phát nhạc phục vụ vận hành dịch vụ; và cơ quan có thẩm quyền khi pháp luật
          yêu cầu.
        </p>
      </LegalSection>

      <LegalSection heading="4. Lưu trữ và bảo mật">
        <p>
          Dữ liệu được lưu trên máy chủ có kiểm soát truy cập. Kết nối ứng dụng — máy chủ
          được mã hóa bằng HTTPS. Token đăng nhập có thời hạn ngắn và bạn có thể thu hồi
          quyền truy cập của từng thiết bị bất cứ lúc nào.
        </p>
      </LegalSection>

      <LegalSection heading="5. Quyền của bạn">
        <p>
          Bạn có quyền xem, chỉnh sửa thông tin tài khoản ngay trong ứng dụng, và có quyền
          yêu cầu xóa dữ liệu cá nhân của mình. Hướng dẫn chi tiết xem tại trang{" "}
          <a href="/data-deletion" className="text-white underline underline-offset-4">
            Hướng dẫn xóa dữ liệu
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="6. Cookie và lưu trữ cục bộ">
        <p>
          Trang web sử dụng cookie bắt buộc để duy trì phiên đăng nhập. Ứng dụng di động có
          thể lưu dữ liệu cục bộ (bài hát tải tạm, trạng thái phát) để đảm bảo trải nghiệm
          nghe nhạc liền mạch.
        </p>
      </LegalSection>

      <LegalSection heading="7. Trẻ em">
        <p>Dịch vụ không dành cho trẻ em dưới 13 tuổi.</p>
      </LegalSection>

      <LegalSection heading="8. Thay đổi chính sách">
        <p>
          Chúng tôi có thể cập nhật chính sách này theo thời gian. Phiên bản mới nhất luôn
          được công bố tại trang này với ngày cập nhật tương ứng.
        </p>
      </LegalSection>

      <LegalSection heading="9. Liên hệ">
        <p>
          Mọi câu hỏi về chính sách quyền riêng tư, vui lòng liên hệ email:{" "}
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
