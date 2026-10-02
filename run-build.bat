@echo off
setlocal
set "_JAVA_OPTIONS="
set "JAVA_HOME=C:\Program Files\Java\jdk-21.0.10"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "E:\Projects\erp\Student-Application\android"
echo BUILD STARTED %DATE% %TIME%
call ".\gradlew.bat" :app:assembleDebug --console=plain
echo.
echo EXITCODE=%ERRORLEVEL%
echo BUILD FINISHED %DATE% %TIME%