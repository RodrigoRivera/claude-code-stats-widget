' Crea un acceso directo "Claude Stats" con su ícono en el escritorio (para anclarlo
' a la barra de tareas) y, si quieres, otro en Inicio para que arranque con Windows.
' Opcional: una carpeta como argumento crea los accesos ahí, sin preguntar (para pruebas).
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
carpeta = fso.GetParentFolderName(WScript.ScriptFullName)
motor = sh.ExpandEnvironmentStrings("%WINDIR%") & "\System32\wscript.exe"
' Textos en español si Windows está en español (idioma principal 0x0A); si no, en inglés.
esp = ((GetLocale() And &H3FF) = &H0A)
If esp Then
  dAbre = "Abre Claude Stats"
  dFondo = "Arranca Claude Stats en segundo plano"
  mensaje = "Listo: dejé un acceso directo ""Claude Stats"" en el escritorio." & vbCrLf & _
    "Para anclarlo: clic derecho sobre él > Mostrar más opciones > Anclar a la barra de tareas." & vbCrLf & vbCrLf & _
    "¿Quieres que Claude Stats arranque con Windows? (solo el servidor, sin abrir ventana)"
  hecho = "Hecho. Para quitarlo, borra ""Claude Stats"" de la carpeta shell:startup."
  quitado = "Quité el arranque con Windows."
Else
  dAbre = "Opens Claude Stats"
  dFondo = "Starts Claude Stats in the background"
  mensaje = "Done: I put a ""Claude Stats"" shortcut on your desktop." & vbCrLf & _
    "To pin it: right-click it > Show more options > Pin to taskbar." & vbCrLf & vbCrLf & _
    "Do you want Claude Stats to start with Windows? (server only, no window)"
  hecho = "Done. To undo it, delete ""Claude Stats"" from the shell:startup folder."
  quitado = "Removed the start with Windows."
End If

Sub Crear(ruta, argumentos, descripcion)
  Set lnk = sh.CreateShortcut(ruta)
  lnk.TargetPath = motor
  lnk.Arguments = """" & carpeta & "\Abrir Claude Stats.vbs""" & argumentos
  lnk.WorkingDirectory = carpeta
  lnk.IconLocation = carpeta & "\icono.ico,0"
  lnk.Description = descripcion
  lnk.Save
End Sub

If WScript.Arguments.Count > 0 Then
  destino = WScript.Arguments(0)
  Crear destino & "\Claude Stats.lnk", "", dAbre
  Crear destino & "\Claude Stats (inicio).lnk", " /fondo", dFondo
  WScript.Quit
End If

Crear sh.SpecialFolders("Desktop") & "\Claude Stats.lnk", "", dAbre
inicio = sh.SpecialFolders("Startup") & "\Claude Stats.lnk"
If MsgBox(mensaje, vbYesNo + vbQuestion, "Claude Stats") = vbYes Then
  Crear inicio, " /fondo", dFondo
  MsgBox hecho, 64, "Claude Stats"
ElseIf fso.FileExists(inicio) Then
  fso.DeleteFile inicio
  MsgBox quitado, 64, "Claude Stats"
End If
