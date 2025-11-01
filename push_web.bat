@SET TORTOISE_PATH=%ProgramW6432%\TortoiseSVN\bin\TortoiseProc.exe
@SET WEB=..\..\SRC2\web
@SET DEST=%WEB%\dcex25

call node build build

rd /s /q %DEST%
md %DEST%
xcopy /SY dist\game\build.prod %DEST%

@SET DEST2=%WEB%\dashingstrike.com\LudumDare\DCEXJ2025
rd /s /q %DEST2%
md %DEST2%
xcopy /SY dist\game\build.prod\client %DEST2%

@for /F usebackq %%a in (`git rev-parse HEAD`) do SET VER=%%a
"%TORTOISE_PATH%" /command:commit /path:%WEB%  /logmsg:"Jam update from git %VER%"

@pushd ..\..\SRC2\flightplans

@echo.
@echo.
@echo NEXT: Run `npm run web-prod` in the Node 12 shell
@node12shell