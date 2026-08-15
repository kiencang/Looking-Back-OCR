# Quy tắc phát triển ứng dụng (Project Guidelines)

1. **Quy trình thảo luận & sửa mã nguồn**:
   - Luôn luôn thảo luận, phân tích kỹ và thống nhất giải pháp trước khi can thiệp code.
   - **CHỈ CHỈNH SỬA CODE** khi người dùng gõ lệnh chính xác: `OK CODE.`. Tất cả các câu hỏi khác chỉ là thảo luận, phản hồi và giải thích.

2. **Vị trí và quy ước quản lý phiên bản (App Version)**:
   - **Vị trí hiển thị giao diện duy nhất:** Nằm ở góc bên trái của **Footer** (`/src/app/footer.ts`, ví dụ: `<span class="text-slate-400">v1.0.18</span>`).
   - **Quy tắc cập nhật phiên bản:**
     - **KHÔNG TỰ ĐỘNG TĂNG PHIÊN BẢN** khi chỉnh sửa code thông thường.
     - **CHỈ NÂNG/CẬP NHẬT PHIÊN BẢN** khi người dùng có lệnh hoặc yêu cầu cụ thể.
     - Khi có yêu cầu nâng phiên bản, cập nhật đồng thời ở 2 vị trí:
       1. `/src/app/footer.ts`
       2. `/package.json` (`"version": "1.0.x"`)
