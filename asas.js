// ============================================================
//  DIỆU TƯỚNG AM – Google Apps Script
//  Chức năng:
//   1. Nhận FormData từ HTML (text + files)
//   2. Upload tất cả ảnh vào 1 subfolder trong Drive gốc
//      → tạo 1 link shared folder duy nhất cho cả đơn hàng
//   3. Ghi dữ liệu + link folder vào Google Sheet
//   4. Gửi email xác nhận tới:
//        • Khách hàng (email họ nhập)
//        • it@dieutuongam.com
//        • agusttran04@gmail.com
// ============================================================

// ── CẤU HÌNH ──────────────────────────────────────────────
// ID folder Drive gốc muốn lưu ảnh vào
// Lấy từ URL: drive.google.com/drive/folders/<FOLDER_ID>
const ROOT_FOLDER_ID = '1MUp2jaGNEqmEZ2vQhWHk0GvGilTRQP0u';

// Các email nhận thông báo cố định (nội bộ)
const NOTIFY_EMAILS = ['it@dieutuongam.com', 'agusttran04@gmail.com'];
// ──────────────────────────────────────────────────────────

function doPost(e) {
  try {
    // 1. Lấy sheet đầu tiên (hoặc tạo header nếu trống)
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Sheet1') || ss.getSheets()[0];
    ensureHeader(sheet);

    // 2. Thu thập dữ liệu text
    const p = e.parameter || {};
    const data = {
      timestamp    : new Date(),
      hoTen        : p.hoTen        || '',
      soDienThoai  : p.soDienThoai  || '',
      email        : p.email        || '',
      tinhThanh    : p.tinhThanh    || '',
      mucDich      : p.mucDich      || '',
      viPhat       : p.viPhat       || '',
      chieuCao     : p.chieuCao     || '',
      chatLieu     : p.chatLieu     || '',
      hoanThien    : p.hoanThien    || '',
      tuThe        : p.tuThe        || '',
      thuAn        : p.thuAn        || '',
      phuKien      : p.phuKien      || '',
      khacChu      : p.khacChu      || '',
      thoiGian     : p.thoiGian     || '',
      nganSach     : p.nganSach     || '',
      yeuCauDacBiet: p.yeuCauDacBiet|| '',
      bietQua      : p.bietQua      || ''
    };

    // 3. Xử lý upload ảnh → 1 subfolder riêng cho đơn này
    let folderLink = '';
    let fileCount  = 0;

    const files = e.files || {};
    const uploadedFiles = files['anh-mau-files'];

    if (uploadedFiles && uploadedFiles.length > 0) {
      // Tên subfolder = Tên khách + timestamp
      const safeDate   = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd_HHmmss');
      const safeName   = (data.hoTen || 'KhachHang').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF ]/g, '').trim();
      const folderName = `${safeName}_${safeDate}`;

      // Lấy folder gốc
      const rootFolder = DriveApp.getFolderById(ROOT_FOLDER_ID);

      // Tạo subfolder trong folder gốc
      const subFolder = rootFolder.createFolder(folderName);

      // Upload từng ảnh vào subfolder
      for (let i = 0; i < uploadedFiles.length; i++) {
        try {
          const file    = uploadedFiles[i];
          const blob    = file.getBlob();
          const saved   = subFolder.createFile(blob);
          fileCount++;
        } catch (fileErr) {
          console.error('Lỗi upload file ' + i + ': ' + fileErr.toString());
        }
      }

      // Chia sẻ subfolder công khai (ai có link đều xem được)
      subFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      folderLink = subFolder.getUrl();  // link folder chứa tất cả ảnh
    }

    // 4. Ghi vào Google Sheet
    sheet.appendRow([
      data.timestamp,
      data.hoTen,
      data.soDienThoai,
      data.email,
      data.tinhThanh,
      data.mucDich,
      data.viPhat,
      data.chieuCao,
      data.chatLieu,
      data.hoanThien,
      data.tuThe,
      data.thuAn,
      data.phuKien,
      data.khacChu,
      data.thoiGian,
      data.nganSach,
      data.yeuCauDacBiet,
      data.bietQua,
      folderLink,          // Link folder ảnh
      fileCount            // Số ảnh đã upload
    ]);

    // 5. Tạo nội dung email HTML
    const htmlBody = buildEmailHtml(data, folderLink, fileCount);
    const subject  = `[Diệu Tướng Am] Đặt tượng mới – ${data.hoTen} – ${data.soDienThoai}`;

    // 6. Gửi mail cho khách hàng
    if (data.email) {
      try {
        GmailApp.sendEmail(data.email, subject, '', { htmlBody: htmlBody });
      } catch (mailErr) {
        console.error('Lỗi gửi mail khách: ' + mailErr.toString());
      }
    }

    // 7. Gửi mail cho các địa chỉ nội bộ cố định
    NOTIFY_EMAILS.forEach(function(addr) {
      try {
        GmailApp.sendEmail(addr, subject, '', { htmlBody: htmlBody });
      } catch (mailErr) {
        console.error('Lỗi gửi mail nội bộ (' + addr + '): ' + mailErr.toString());
      }
    });

    return ContentService
      .createTextOutput('Success')
      .setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    console.error('doPost error: ' + err.toString());
    return ContentService
      .createTextOutput('Error: ' + err.toString())
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

// ── Tạo header cho Sheet nếu chưa có ──────────────────────
function ensureHeader(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'Thời gian', 'Họ tên', 'Số điện thoại', 'Email', 'Tỉnh/Thành',
      'Mục đích', 'Vị Phật / Bồ Tát', 'Chiều cao', 'Chất liệu',
      'Hoàn thiện', 'Tư thế', 'Thủ ấn', 'Phụ kiện', 'Khắc chữ',
      'Thời gian HT', 'Ngân sách', 'Yêu cầu đặc biệt', 'Biết qua',
      'Link ảnh mẫu (Drive)', 'Số ảnh'
    ]);
    sheet.getRange(1, 1, 1, 20).setFontWeight('bold').setBackground('#3d2409').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
}

// ── Tạo nội dung email HTML ────────────────────────────────
function buildEmailHtml(d, folderLink, fileCount) {
  const anhSection = folderLink
    ? `<tr><td style="color:#666;padding:6px 12px 6px 0;vertical-align:top;width:40%;">Ảnh mẫu đính kèm</td>
       <td style="padding:6px 0;"><a href="${folderLink}" target="_blank" style="background:#C9922B;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-weight:bold;">
       📁 Xem ${fileCount} ảnh trên Drive</a></td></tr>`
    : `<tr><td style="color:#666;padding:6px 12px 6px 0;">Ảnh mẫu</td><td style="padding:6px 0;">Không có</td></tr>`;

  return `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:30px 10px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.12);">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#3d2409,#7a4a1a);padding:32px;text-align:center;">
        <h1 style="color:#C9922B;margin:0;font-size:24px;letter-spacing:2px;">DIỆU TƯỚNG AM</h1>
        <p style="color:#e8d5a0;margin:6px 0 0;font-size:14px;">Nghệ thuật tạc tượng Phật thủ công</p>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:32px;">
        <p style="color:#3d2409;font-size:16px;line-height:1.6;margin-top:0;">
          Kính gửi <strong>${d.hoTen || 'Quý khách'}</strong>,<br><br>
          Cảm ơn bạn đã quan tâm và tin tưởng dịch vụ tạc tượng Phật tại <strong>Diệu Tướng Am</strong>.<br>
          Chúng tôi đã ghi nhận đầy đủ thông tin và sẽ liên hệ lại trong vòng <strong>24 giờ</strong> để tư vấn chi tiết.
        </p>

        <div style="background:#fdf8f0;border-left:4px solid #C9922B;border-radius:0 8px 8px 0;padding:20px 24px;margin:24px 0;">
          <h3 style="color:#3d2409;margin:0 0 16px;font-size:16px;">Thông tin đơn đặt tượng</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#333;line-height:1.8;">
            <tr><td style="color:#666;padding:6px 12px 6px 0;vertical-align:top;width:40%;">Họ và tên</td><td style="padding:6px 0;font-weight:bold;">${d.hoTen}</td></tr>
            <tr style="background:#fff8ee;"><td style="color:#666;padding:6px 12px 6px 0;">Số điện thoại</td><td style="padding:6px 0;">${d.soDienThoai}</td></tr>
            <tr><td style="color:#666;padding:6px 12px 6px 0;">Email</td><td style="padding:6px 0;">${d.email}</td></tr>
            <tr style="background:#fff8ee;"><td style="color:#666;padding:6px 12px 6px 0;">Tỉnh / Thành phố</td><td style="padding:6px 0;">${d.tinhThanh}</td></tr>
            <tr><td style="color:#666;padding:6px 12px 6px 0;">Mục đích</td><td style="padding:6px 0;">${d.mucDich}</td></tr>
            <tr style="background:#fff8ee;"><td style="color:#666;padding:6px 12px 6px 0;">Vị Phật / Bồ Tát</td><td style="padding:6px 0;">${d.viPhat}</td></tr>
            <tr><td style="color:#666;padding:6px 12px 6px 0;">Chiều cao</td><td style="padding:6px 0;">${d.chieuCao}</td></tr>
            <tr style="background:#fff8ee;"><td style="color:#666;padding:6px 12px 6px 0;">Chất liệu</td><td style="padding:6px 0;">${d.chatLieu}</td></tr>
            <tr><td style="color:#666;padding:6px 12px 6px 0;">Hoàn thiện bề mặt</td><td style="padding:6px 0;">${d.hoanThien}</td></tr>
            <tr style="background:#fff8ee;"><td style="color:#666;padding:6px 12px 6px 0;">Tư thế tôn tượng</td><td style="padding:6px 0;">${d.tuThe}</td></tr>
            <tr><td style="color:#666;padding:6px 12px 6px 0;">Thủ ấn</td><td style="padding:6px 0;">${d.thuAn}</td></tr>
            <tr style="background:#fff8ee;"><td style="color:#666;padding:6px 12px 6px 0;">Phụ kiện thêm</td><td style="padding:6px 0;">${d.phuKien || 'Không'}</td></tr>
            <tr><td style="color:#666;padding:6px 12px 6px 0;">Khắc chữ</td><td style="padding:6px 0;">${d.khacChu || 'Không'}</td></tr>
            <tr style="background:#fff8ee;"><td style="color:#666;padding:6px 12px 6px 0;">Thời gian hoàn thành</td><td style="padding:6px 0;">${d.thoiGian}</td></tr>
            <tr><td style="color:#666;padding:6px 12px 6px 0;">Ngân sách dự kiến</td><td style="padding:6px 0;">${d.nganSach || 'Chưa xác định'}</td></tr>
            <tr style="background:#fff8ee;"><td style="color:#666;padding:6px 12px 6px 0;">Yêu cầu đặc biệt</td><td style="padding:6px 0;">${d.yeuCauDacBiet || 'Không có'}</td></tr>
            ${anhSection}
          </table>
        </div>

        <p style="color:#555;font-size:14px;line-height:1.7;">
          Nếu bạn có thêm thông tin hoặc câu hỏi, hãy liên hệ trực tiếp với chúng tôi:<br>
          <strong>0901 234 567</strong> &nbsp;|&nbsp;  Zalo cùng số &nbsp;|&nbsp; dieutuongam.com
        </p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#3d2409;padding:20px 32px;text-align:center;">
        <p style="color:#e8d5a0;font-size:13px;margin:0;">
          © 2026 Diệu Tướng Am · Tất cả quyền được bảo lưu
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}