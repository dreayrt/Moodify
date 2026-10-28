# Khảo sát và sửa luồng phát nhạc — 29/10/2026

## Phạm vi

Khảo sát PlayerProvider, GlobalPlayer, chọn bài từ danh sách/lịch sử/recommendation, session telemetry, lưu localStorage, metadata, auto-next, shuffle/repeat, retry và quảng cáo. Sửa logic trong `components/dashboard/player-context.tsx`; không thay JSX/layout/CSS/nút điều khiển, không sửa backend/schema/database hoặc policy recommendation/thanh toán.

Các thay đổi đang có của người dùng trong player/API/deploy được giữ lại. Bản trước đợt sửa được dùng để đối chiếu và tái hiện regression, không reset về Git HEAD.

## Nguyên nhân đã tái hiện

`executePlayTrack` chỉ gọi `setCurrentTime(0)`, nhưng không reset `currentTimeRef.current`. Khi `loadedmetadata` tới, handler lại tua audio tới `currentTimeRef.current` của bài trước. Đây là vị trí bị dùng sai giữa các nguồn audio, không phải bằng chứng backend chủ động chọn resume theo lịch sử riêng từng bài.

Kiểm thử mount chính PlayerProvider trong Chromium: phát A tới 48 giây, chọn B, phát sự kiện metadata. **Mã trước sửa thất bại với `48 !== 0`**. Sau sửa, cùng tình huống trả 0 cho audio, state và snapshot localStorage.

## Những điểm đã sửa

| Vấn đề | Hành vi sau sửa |
| --- | --- |
| Thời gian cũ lan sang bài mới | Reset đồng thời state, refs và snapshot khi chọn/chuyển bài; duration cũ không lan sang bài thiếu metadata |
| Handler metadata tự tua theo ref chung | Chỉ áp dụng pending position gắn với đúng source, một lần sau metadata |
| Restore/seek/retry bị trộn nghĩa | Reload khôi phục đúng bài hiện tại và giữ paused; bài đã hoàn tất khôi phục về 0; retry cùng bài giữ vị trí; chọn bài khác luôn từ 0 |
| Retry cũ chạy sau đổi bài/pause | Hủy timer và kiểm tra generation; không nạp source/tua hoặc tự phát lại bài mới bằng callback cũ |
| Promise play cũ trả về sau chọn bài mới | Kiểm tra generation/ý định phát trước khi cập nhật trạng thái |
| Nút Pause rồi quay lại tab | Hủy retry, giữ ý định dừng; focus không tự phát lại khi user đã dừng hoặc queue hoàn tất |
| Hàng đợi một bài tự lặp khi Repeat off | Tự kết thúc và dừng; Repeat one/all mới tự phát lại theo mode |
| History bị xóa mỗi lần Next | Giữ history khi vẫn cùng queue; Previous trở về đúng lượt đã chọn, kể cả shuffle |
| Chọn bài có sẵn nhưng queueIndex không đổi | Đồng bộ queue/ref/index ngay khi chọn; Next đi từ bài thực sự được chọn |
| Shuffle off-repeat chọn ngẫu nhiên vô hạn | Dùng các index chưa đi qua trong vòng; hết queue thì dừng; Repeat all mở vòng tiếp theo |
| Callback historyId A cũ gắn vào lần A mới | So đúng object session thay vì chỉ trackId trong chuỗi A → B → A |
| Từ chối skip nhưng đóng session hiện tại | Kiểm tra quyền/hạn mức trước khi flush SKIP_NEXT |
| Chọn bài trong quảng cáo làm hai luồng cùng chạy | Cập nhật pending track, bắt đầu bài mới từ 0 sau khi ad xong; không đổi hạn mức/tần suất ad |
| Seek trước metadata/giá trị không hợp lệ | Chờ metadata, chặn NaN/Infinity, giới hạn vị trí hợp lệ; ghi vị trí cũ đúng trước khi đóng session replay |

Quy ước giữ lại: chọn bài bằng `playTrack` bắt đầu một lượt từ đầu; Pause/Resume giữ vị trí cùng lượt; reload khôi phục vị trí của đúng bài đang lưu và không autoplay. Previous khi đang quá ba giây đưa bài hiện tại về đầu. Next/Previous thủ công vẫn giữ quy tắc điều hướng hiện có; tự kết thúc queue tuân thủ Repeat.

## Kiểm chứng

Runner `scripts/test-player-playback.mjs` transpile và mount chính source PlayerProvider bằng React/ReactDOM đang cài trong dự án; không viết một player giả để test thay implementation thật. Mỗi tình huống dùng browser context riêng. API là doubles và chỉ dùng bài A/B/C; HTTP fixture bind loopback, không gọi server/database ứng dụng.

**24 tình huống browser đạt**, bao gồm:

- Chọn bài mới và auto-next quay lại bài đã nghe dở đều bắt đầu 0.
- Pause/Resume, reload paused, reload bài đã hoàn tất, React Strict Mode.
- Queue một/nhiều bài, Repeat one/all/off, Shuffle hữu hạn và Previous đúng thứ tự thực tế.
- Chọn bài đang có trong queue, seek trước metadata, hạn mức skip không đóng session.
- Retry cùng bài, retry cũ sau đổi bài, Pause qua cả hai API điều khiển, play promise cũ bị reject.
- Ad hoàn tất và chọn bài khác trong ad.
- Telemetry phản hồi trễ khi A → B → A.
- **Một tình huống dùng HTMLAudioElement thật trong Chromium với WAV fixture:** đã nghe B, chuyển A gần hết, để A tự kết thúc và xác nhận B bắt đầu gần 0. Các trường hợp còn lại dùng media double để điều khiển race/timer chính xác.

File WAV là fixture im lặng; kiểm tra native xác nhận load/decode/position/ended, không chứng nhận chất lượng âm thanh hoặc độ ổn định CDN/Oracle thật. Chưa kiểm thử thiết bị vật lý, Safari/iOS hoặc mất mạng thật trên hạ tầng production.

Lệnh chạy lại:

```powershell
# Chạy từ thư mục frontend Moodify. Playwright cần có trong môi trường kiểm thử.
npm run test:player

# Nếu dùng Playwright bên ngoài node_modules của dự án:
# $env:PLAYWRIGHT_MODULE = 'C:\path\to\node_modules\playwright'
# npm run test:player

node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
```

Không thêm dependency production hoặc sửa package-lock; runner dùng TypeScript/React sẵn có và Playwright từ môi trường kiểm thử. Có thể đặt `PLAYER_SOURCE` trỏ tới bản trước sửa và chạy `--baseline` để kiểm tra regression đầu tiên.

## Cấu hình và kiểm tra tĩnh

Type-check phát hiện `next.config.ts` có tùy chọn `eslint.ignoreDuringBuilds` mà Next.js 16 đã bỏ. Đã gỡ đúng tùy chọn này theo tài liệu version-16 đi kèm package cài đặt; giữ nguyên các tùy chọn deploy khác. Đây không phải thay đổi giao diện hoặc tắt thêm rule kiểm tra. Next 16 chạy lint riêng bằng ESLint CLI.

ESLint của player đã có lỗi hook trước đợt sửa. Đối chiếu cùng cấu hình trên source trước/sau: trước **25 errors, 20 warnings**; sau **25 errors, 17 warnings**, cùng số lỗi theo rule (set-state-in-effect 3, purity 1, immutability 21). Vì vậy không báo lint player/toàn dự án sạch. Script test mới được lint riêng.

Kết quả cuối: **TypeScript toàn dự án `tsc --noEmit` đạt, Next.js production build đạt, ESLint của script test mới đạt**. Build dùng cấu hình TypeScript của dự án đang có, nên `tsc --noEmit` được chạy riêng thay vì suy ra từ build. Đối chiếu source xác nhận JSX/layout của PlayerProvider giữ nguyên. Test browser, HTTP server fixture và các context đều được đóng sau khi chạy.
