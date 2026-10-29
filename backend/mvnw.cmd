@echo off
setlocal
if not defined JAVA_HOME (
    if exist "C:\Program Files\Java\jdk-26.0.1" (
        set "JAVA_HOME=C:\Program Files\Java\jdk-26.0.1"
    ) else if exist "C:\Program Files\Java\latest" (
        set "JAVA_HOME=C:\Program Files\Java\latest"
    )
)
set "PATH=%JAVA_HOME%\bin;%~dp0..\.tools\apache-maven-3.9.9\bin;%PATH%"
mvn %*
