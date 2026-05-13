@echo off
REM Uninstall the old app (ignore errors if not installed)
adb uninstall com.njatalk.app

REM Build the APK
cd /d "%~dp0android"
call gradlew assembleDebug

REM Install the new APK
adb install -r app\build\outputs\apk\debug\app-debug.apk

echo.
echo If you see 'Success', the app is installed. If not, check for errors above.
pause
