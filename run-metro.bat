@echo off
setlocal
set "_JAVA_OPTIONS="
set "JAVA_HOME=C:\Program Files\Java\jdk-21.0.10"
set "PATH=%JAVA_HOME%\bin;%PATH%"
cd /d "E:\Projects\erp\Student-Application"
echo METRO STARTED %DATE% %TIME%
call npx react-native start --reset-cache
echo.
echo METRO EXITED %DATE% %TIME%