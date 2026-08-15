# Quy tắc phát triển ứng dụng (Project Guidelines)

1. **Quy trình thảo luận & sửa mã nguồn**:
   - Luôn luôn thảo luận, phân tích kỹ và thống nhất giải pháp trước khi can thiệp code.
   - **CHỈ CHỈNH SỬA CODE** khi người dùng gõ lệnh chính xác: `OK CODE.`. Tất cả các câu hỏi khác chỉ là thảo luận, phản hồi và giải thích.

2. **Vị trí và quy ước hiển thị phiên bản (App Version)**:
   - **Vị trí hiển thị giao diện duy nhất:** Nằm ở góc bên trái của **Footer** (`/src/app/footer.ts`, ví dụ: `<span class="text-slate-400">v1.0.14</span>`).
   - **Đồng bộ phiên bản:** Khi nâng cấp phiên bản, cập nhật đồng thời ở:
     1. `/src/app/footer.ts`
     2. `/package.json` (`"version": "1.0.x"`)
