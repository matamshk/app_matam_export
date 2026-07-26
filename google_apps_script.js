/**
 * Google Apps Script - Matam Abu Sba' Contributions Sync
 * 
 * هذا الكود يتم نسخه ولصقه بالكامل في Google Apps Script المرتبط بجدول البيانات (Google Sheet).
 * 
 * طريقة التركيب:
 * 1. افتح جدول بيانات Google Sheet جديد.
 * 2. اضغط على "Extensions" (الإضافات) -> "Apps Script".
 * 3. امسح أي كود موجود والوحيد بالصفحة، ثم الصق هذا الكود.
 * 4. اضغط على زر الحفظ (أيقونة الديسك).
 * 5. اضغط على زر "Deploy" (نشر) -> "New deployment" (نشر جديد).
 * 6. اختر نوع النشر "Web app" (تطبيق ويب) بالضغط على أيقونة الترس.
 * 7. اضبط الإعدادات التالية:
 *    - Execute as: Me (حسابك الشخصي لجوجل)
 *    - Who has access: Anyone (أي شخص)
 * 8. اضغط على Deploy ثم قم بإعطاء الصلاحيات لحسابك عند الطلب.
 * 9. انسخ رابط تطبيق الويب (Web App URL) المولد وسيكون بصيغة:
 *    https://script.google.com/macros/s/.../exec
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    // التحقق من رغبة الخادم في تصدير قاعدة البيانات بالكامل إلى جداول منفصلة
    if (data.action === "export_all") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      
      // 1. تصدير جدول الحجوزات
      var sheetBookings = ss.getSheetByName("الحجوزات") || ss.insertSheet("الحجوزات");
      sheetBookings.clear();
      sheetBookings.appendRow(["رقم الحجز", "تاريخ الحجز", "الاسم", "رقم الهاتف", "نوع الحجز", "الحالة", "تفاصيل الحجز"]);
      if (data.bookings && data.bookings.length > 0) {
        data.bookings.forEach(function(b) {
          var detailsStr = [];
          if (b.details) {
            for (var key in b.details) {
              detailsStr.push(key + ": " + b.details[key]);
            }
          }
          sheetBookings.appendRow([
            b.id ? b.id.toString() : "",
            b.date || "",
            b.name || "",
            b.phone || "",
            (b.type || "").replace("بوابة المأتم - ", ""),
            b.status || "pending",
            detailsStr.join(", ")
          ]);
        });
      }
      formatSheetHeader(sheetBookings, 7);
      
      // 2. تصدير جدول مساهمات المرحومين
      var sheetCont = ss.getSheetByName("مساهمات المرحومين") || ss.insertSheet("مساهمات المرحومين");
      sheetCont.clear();
      sheetCont.appendRow(["تاريخ المزامنة", "اسم المساهم", "رقم الهاتف", "الشهر الهجري", "المناسبة المختصة", "المبلغ الإجمالي (د.ب)", "عدد المرحومين", "أسماء المرحومين", "رابط إيصال الدفع", "روابط صور المرحومين"]);
      if (data.contributions && data.contributions.length > 0) {
        data.contributions.forEach(function(c) {
          var deceasedNames = [];
          var photoUrls = [];
          if (c.deceased_list) {
            c.deceased_list.forEach(function(dec) {
              deceasedNames.push(dec.name);
              if (dec.photo) photoUrls.push(dec.name + ": " + dec.photo);
            });
          }
          sheetCont.appendRow([
            c.date || "",
            c.sender_name || "",
            c.sender_phone || "",
            getHijriMonthName(c.hijri_month),
            c.occasion || "عامة",
            c.total_amount || 0,
            deceasedNames.length,
            deceasedNames.join(", "),
            c.receipt_image || "",
            photoUrls.join("\n")
          ]);
        });
      }
      formatSheetHeader(sheetCont, 10);
      
      // 3. تصدير جدول المناسبات المخصصة
      var sheetOcc = ss.getSheetByName("المناسبات المخصصة") || ss.insertSheet("المناسبات المخصصة");
      sheetOcc.clear();
      sheetOcc.appendRow(["الشهر الهجري", "اليوم الهجري", "عنوان المناسبة", "النوع", "الوصف"]);
      if (data.custom_occasions && data.custom_occasions.length > 0) {
        data.custom_occasions.forEach(function(o) {
          sheetOcc.appendRow([
            o.hijri ? getHijriMonthName(o.hijri.month) : "",
            o.hijri ? o.hijri.day : "",
            o.title || "",
            o.type || "",
            o.description || ""
          ]);
        });
      }
      formatSheetHeader(sheetOcc, 5);
      
      // 4. تصدير جدول المستخدمين والمدراء
      var sheetUsers = ss.getSheetByName("المستخدمون والمدراء") || ss.insertSheet("المستخدمون والمدراء");
      sheetUsers.clear();
      sheetUsers.appendRow(["المعرف", "اسم المستخدم", "الاسم الكامل", "الدور", "الصلاحيات المخصصة"]);
      if (data.users && data.users.length > 0) {
        data.users.forEach(function(u) {
          var permsStr = [];
          if (u.permissions) {
            for (var k in u.permissions) {
              permsStr.push(k + ": " + u.permissions[k]);
            }
          }
          sheetUsers.appendRow([
            u.id || "",
            u.username || "",
            u.name || "",
            u.role || "",
            permsStr.join(", ")
          ]);
        });
      }
      formatSheetHeader(sheetUsers, 5);
      
      // حذف الورقة الافتراضية الأولى الفارغة إن وجدت للتنظيم
      var defaultSheet = ss.getSheetByName("Sheet1") || ss.getSheetByName("ورقة1");
      if (defaultSheet && defaultSheet.getLastRow() === 0) {
        ss.deleteSheet(defaultSheet);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "تم تصدير قاعدة البيانات بالكامل إلى أوراق عمل منفصلة بنجاح!" }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 1. مزامنة الحجوزات تلقائياً عند أي تعديل (حفظ، تغيير حالة، تعديل، حذف)
    if (data.action === "sync_bookings") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheetBookings = ss.getSheetByName("الحجوزات") || ss.insertSheet("الحجوزات");
      sheetBookings.clear();
      sheetBookings.appendRow(["رقم الحجز", "تاريخ الحجز", "الاسم", "رقم الهاتف", "نوع الحجز", "الحالة", "تفاصيل الحجز"]);
      if (data.bookings && data.bookings.length > 0) {
        data.bookings.forEach(function(b) {
          var detailsStr = [];
          if (b.details) {
            for (var key in b.details) {
              detailsStr.push(key + ": " + b.details[key]);
            }
          }
          sheetBookings.appendRow([
            b.id ? b.id.toString() : "",
            b.date || "",
            b.name || "",
            b.phone || "",
            (b.type || "").replace("بوابة المأتم - ", ""),
            b.status || "pending",
            detailsStr.join(", ")
          ]);
        });
      }
      formatSheetHeader(sheetBookings, 7);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "تمت مزامنة الحجوزات تلقائياً!" }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. مزامنة المناسبات المخصصة تلقائياً عند الإضافة
    if (data.action === "sync_occasions") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheetOcc = ss.getSheetByName("المناسبات المخصصة") || ss.insertSheet("المناسبات المخصصة");
      sheetOcc.clear();
      sheetOcc.appendRow(["الشهر الهجري", "اليوم الهجري", "عنوان المناسبة", "النوع", "الوصف"]);
      if (data.custom_occasions && data.custom_occasions.length > 0) {
        data.custom_occasions.forEach(function(o) {
          sheetOcc.appendRow([
            o.hijri ? getHijriMonthName(o.hijri.month) : "",
            o.hijri ? o.hijri.day : "",
            o.title || "",
            o.type || "",
            o.description || ""
          ]);
        });
      }
      formatSheetHeader(sheetOcc, 5);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "تمت مزامنة المناسبات تلقائياً!" }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 3. مزامنة المستخدمين والمدراء تلقائياً عند حفظ الإعدادات
    if (data.action === "sync_users") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheetUsers = ss.getSheetByName("المستخدمون والمدراء") || ss.insertSheet("المستخدمون والمدراء");
      sheetUsers.clear();
      sheetUsers.appendRow(["المعرف", "اسم المستخدم", "الاسم الكامل", "الدور", "الصلاحيات المخصصة"]);
      if (data.users && data.users.length > 0) {
        data.users.forEach(function(u) {
          var permsStr = [];
          if (u.permissions) {
            for (var k in u.permissions) {
              permsStr.push(k + ": " + u.permissions[k]);
            }
          }
          sheetUsers.appendRow([
            u.id || "",
            u.username || "",
            u.name || "",
            u.role || "",
            permsStr.join(", ")
          ]);
        });
      }
      formatSheetHeader(sheetUsers, 5);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "تمت مزامنة الإعدادات والمستخدمين تلقائياً!" }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    // 1. الحصول على مجلد الحفظ في Google Drive أو إنشائه تلقائياً
    var folderName = "مرفقات مساهمات المأتم (تلقائي)";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    // دالة مساعدة لفك ترميز الملف وحفظه في Google Drive وإرجاع رابطه
    function saveBase64File(base64Data, baseName) {
      if (!base64Data) return "";
      try {
        var parts = base64Data.split(",");
        var contentType = "image/png";
        var base64String = base64Data;
        if (parts.length > 1) {
          contentType = parts[0].split(";")[0].split(":")[1];
          base64String = parts[1];
        }
        
        // تنظيف سلسلة base64 من أي مسافات، علامات سطر جديد، أو رموز تالفة ناتجة عن النقل
        base64String = base64String.replace(/\s/g, '').replace(/[^A-Za-z0-9\+\/\=]/g, '');
        
        var decoded = Utilities.base64Decode(base64String);
        
        // تحديد الامتداد المناسب بناءً على نوع الملف الفعلي
        var ext = "png";
        var typeLower = contentType.toLowerCase();
        if (typeLower.indexOf("jpeg") !== -1 || typeLower.indexOf("jpg") !== -1) {
          ext = "jpg";
        } else if (typeLower.indexOf("pdf") !== -1) {
          ext = "pdf";
        }
        
        var fileName = baseName + "." + ext;
        var blob = Utilities.newBlob(decoded, contentType, fileName);
        var file = folder.createFile(blob);
        
        // جعل الملف قابلاً للعرض لكل من لديه الرابط (لرؤية إيصالات بنفت وصور الموتى)
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return file.getUrl();
      } catch(err) {
        return "خطأ في حفظ الملف: " + err.message;
      }
    }
    
    // 2. حفظ صورة أو ملف إيصال الدفع (بنفت)
    var receiptUrl = "";
    if (data.receipt_image) {
      receiptUrl = saveBase64File(data.receipt_image, "benefit_receipt_" + data.id);
    }
    
    // 3. حفظ صور المرحومين وجمع أسمائهم
    var deceasedNames = [];
    var photoUrls = [];
    if (data.deceased_list && data.deceased_list.length > 0) {
      data.deceased_list.forEach(function(dec, idx) {
        deceasedNames.push(dec.name);
        if (dec.photo) {
          var pUrl = saveBase64File(dec.photo, "deceased_" + data.id + "_" + (idx + 1));
          photoUrls.push(dec.name + ": " + pUrl);
        }
      });
    }
    
    // 4. الحصول على ورقة العمل النشطة في Google Sheets
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // إنشاء الهيدر وتنسيق الجدول تلقائياً في حال كان فارغاً تماماً
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "الوقت والتاريخ", 
        "اسم المرسل", 
        "رقم الهاتف", 
        "الشهر الهجري", 
        "المناسبة المختصة", 
        "المبلغ الإجمالي (د.ب)", 
        "عدد المرحومين", 
        "أسماء المرحومين", 
        "رابط إيصال الدفع (Benefit)", 
        "روابط صور المرحومين"
      ]);
      
      // تنسيق السطر الأول
      sheet.getRange(1, 1, 1, 10)
           .setFontWeight("bold")
           .setBackground("#1E3C72")
           .setFontColor("#FFFFFF")
           .setHorizontalAlignment("center");
    }
    
    // 5. إضافة السطر الجديد بالبيانات المفصلة والروابط السحابية
    sheet.appendRow([
      new Date(),
      data.sender_name,
      data.sender_phone,
      getHijriMonthName(data.hijri_month),
      data.occasion || "عامة",
      data.total_amount,
      data.deceased_list ? data.deceased_list.length : 0,
      deceasedNames.join("، "),
      receiptUrl,
      photoUrls.join("\n")
    ]);
    
    // محاذاة البيانات المضافة للمركز لجمالية العرض
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, 10).setHorizontalAlignment("center");
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "تمت المزامنة بنجاح!" }))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// دالة مساعدة لتحويل رقم الشهر الهجري إلى اسمه باللغة العربية
function getHijriMonthName(monthNumber) {
  var months = [
    "محرم", "صفر", "ربيع الأول", "ربيع الآخر",
    "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان",
    "رمضان", "شوال", "ذو القعدة", "ذو الحجة"
  ];
  var idx = parseInt(monthNumber) - 1;
  return months[idx] || monthNumber;
}

// دالة مساعدة لتنسيق وتزيين السطر الأول للجدول المصدر
function formatSheetHeader(sheet, numColumns) {
  if (sheet.getLastRow() === 0) return;
  sheet.getRange(1, 1, 1, numColumns)
       .setFontWeight("bold")
       .setBackground("#1E3C72")
       .setFontColor("#FFFFFF")
       .setHorizontalAlignment("center");
  sheet.getRange(1, 1, sheet.getLastRow(), numColumns).setHorizontalAlignment("center");
}
