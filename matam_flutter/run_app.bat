@echo off
chcp 65001 > null
echo ===================================================
echo   تجهيز وتشغيل تطبيق مأتم فلاتر (Matam App)
echo ===================================================
echo.
echo [1/2] جاري تحميل الحزم والتوابع (pub get)...
"C:\Users\DELL\AppData\Local\Microsoft\WinGet\Packages\pingbird.Puro_Microsoft.Winget.Source_8wekyb3d8bbwe\puro.exe" flutter pub get
echo.
echo [2/2] جاري تشغيل التطبيق في المحاكي/الهاتف (flutter run)...
"C:\Users\DELL\AppData\Local\Microsoft\WinGet\Packages\pingbird.Puro_Microsoft.Winget.Source_8wekyb3d8bbwe\puro.exe" flutter run
echo.
pause
