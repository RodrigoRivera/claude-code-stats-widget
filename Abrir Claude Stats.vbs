' Abre el widget de Claude Stats sin dejar una ventana de consola visible.
' El widget levanta el servidor solo si hace falta.
' Si el widget no está instalado (falta "npm install" en la carpeta widget), abre el panel en Edge como antes.
' /panel: abre el panel completo en Edge, sin widget.
' /fondo: solo arranca el servidor, sin abrir ventana (lo usa el arranque con Windows).
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
carpeta = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = carpeta
' Avisos en español si Windows está en español (idioma principal 0x0A); si no, en inglés.
esp = ((GetLocale() And &H3FF) = &H0A)
modo = ""
If WScript.Arguments.Count > 0 Then modo = LCase(WScript.Arguments(0))
electron = carpeta & "\widget\node_modules\electron\dist\electron.exe"

If modo = "" And fso.FileExists(electron) Then
  sh.Run """" & electron & """ """ & carpeta & "\widget""", 1, False
  WScript.Quit
End If

extra = ""
If modo = "/fondo" Then extra = " --no-open"
If sh.Run("cmd /c where node", 0, True) <> 0 Then
  If esp Then
    MsgBox "No encontré Node.js. Instálalo desde https://nodejs.org y vuelve a intentarlo.", 48, "Claude Stats"
  Else
    MsgBox "Node.js was not found. Install it from https://nodejs.org and try again.", 48, "Claude Stats"
  End If
Else
  sh.Run "cmd /c node """ & carpeta & "\server.js""" & extra, 0, False
End If
