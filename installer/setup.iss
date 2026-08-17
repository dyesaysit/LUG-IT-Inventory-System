#define MyAppName "IT Inventory Server"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Open Source Contributors"

[Setup]
AppId={{A0B61B3F-4179-4A2F-96E5-C4DA5DE0F2C4}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=output
OutputBaseFilename=IT-Inventory-Server-Setup-1.0.0
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayName={#MyAppName}
SetupIconFile=assets\app-icon.ico

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
Source: "staging-package\app\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "assets\app-icon.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\launcher.ps1"""; WorkingDir: "{app}"; IconFilename: "{app}\app-icon.ico"
Name: "{group}\Repair Remote Access"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -File ""{app}\scripts\configure-firewall.ps1"" -Interactive"; WorkingDir: "{app}"; IconFilename: "{app}\app-icon.ico"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\launcher.ps1"""; WorkingDir: "{app}"; IconFilename: "{app}\app-icon.ico"; Tasks: desktopicon

[Run]
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\launcher.ps1"" -Stop"; Flags: runhidden waituntilterminated
; Remove any existing rule(s) with this name first so upgrades never accumulate duplicates.
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""IT Inventory Server"""; Flags: runhidden waituntilterminated
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall add rule name=""IT Inventory Server"" dir=in action=allow protocol=TCP localport={code:GetPort} profile=any"; Flags: runhidden waituntilterminated
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\configure-startup.ps1"""; Flags: runhidden waituntilterminated
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\open-application.ps1"""; Description: "Open {#MyAppName}"; Flags: postinstall skipifsilent runasoriginaluser waituntilterminated

[UninstallRun]
Filename: "{sys}\schtasks.exe"; Parameters: "/End /TN ""IT Inventory Server"""; Flags: runhidden waituntilterminated; RunOnceId: "EndStartupTask"
Filename: "{sys}\schtasks.exe"; Parameters: "/Delete /TN ""IT Inventory Server"" /F"; Flags: runhidden waituntilterminated; RunOnceId: "RemoveStartupTask"
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""{app}\scripts\launcher.ps1"" -Stop"; Flags: runhidden waituntilterminated; RunOnceId: "StopBackend"
Filename: "{sys}\netsh.exe"; Parameters: "advfirewall firewall delete rule name=""IT Inventory Server"""; Flags: runhidden waituntilterminated; RunOnceId: "RemoveFirewallRule"

[Code]
var
  RemoveApplicationData: Boolean;
  PortPage: TInputQueryWizardPage;

// Reads the port the user chose (defaults to 3000). Used by the firewall rule
// and persisted to port.txt so the launcher listens on the same port.
function GetPort(Param: String): String;
begin
  Result := '3000';
  if Assigned(PortPage) and (Trim(PortPage.Values[0]) <> '') then
    Result := Trim(PortPage.Values[0]);
end;

procedure InitializeWizard();
var
  ExistingPort: AnsiString;
  Defaulted: String;
begin
  PortPage := CreateInputQueryPage(
    wpSelectDir,
    'Network Port',
    'Which TCP port should the Inventory server listen on?',
    'Staff reach the server at http://SERVER-NAME:PORT or http://SERVER-IP:PORT.' + #13#10 +
    'Enter 80 to use a clean address with no port number (for example http://inventory), which is ideal when a DNS A record points a hostname at this server.' + #13#10 + #13#10 +
    'Leave the default of 3000 if you are unsure. Ports below 1024 (such as 80) must not already be used by IIS or another web server on this machine.');
  PortPage.Add('Port:', False);
  Defaulted := '3000';
  // On upgrade, pre-fill the previously chosen port so it is not silently changed.
  if LoadStringFromFile(ExpandConstant('{commonappdata}\IT-Inventory-Server\config\port.txt'), ExistingPort) then
    if Trim(String(ExistingPort)) <> '' then
      Defaulted := Trim(String(ExistingPort));
  PortPage.Values[0] := Defaulted;
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  PortValue: Integer;
begin
  Result := True;
  if Assigned(PortPage) and (CurPageID = PortPage.ID) then
  begin
    PortValue := StrToIntDef(Trim(PortPage.Values[0]), -1);
    if (PortValue < 1) or (PortValue > 65535) then
    begin
      MsgBox('Please enter a valid port number between 1 and 65535.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ConfigDir: String;
begin
  // Persist the chosen port before the [Run] section starts the backend.
  if CurStep = ssPostInstall then
  begin
    ConfigDir := ExpandConstant('{commonappdata}\IT-Inventory-Server\config');
    ForceDirectories(ConfigDir);
    SaveStringToFile(ConfigDir + '\port.txt', GetPort(''), False);
  end;
end;

function InitializeUninstall(): Boolean;
begin
  RemoveApplicationData := MsgBox(
    'Do you also want to permanently delete the Inventory database, uploaded logos, logs, and backups?' + #13#10 + #13#10 +
    'Choose No to keep your data for a future reinstall.',
    mbConfirmation,
    MB_YESNO
  ) = IDYES;
  Result := True;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then
  begin
    // Safety net: force-remove any program files the backend held locked while Inno
    // was deleting them (bundled node.exe, the better-sqlite3 native module, logs).
    // These are all files this installer created, so removal is safe.
    DelTree(ExpandConstant('{app}\runtime'), True, True, True);
    DelTree(ExpandConstant('{app}\backend'), True, True, True);
    DelTree(ExpandConstant('{app}\frontend'), True, True, True);
    DelTree(ExpandConstant('{app}\shared'), True, True, True);
    DelTree(ExpandConstant('{app}\scripts'), True, True, True);
    // Remove the install directory once empty (Inno removes its own uninstaller last).
    RemoveDir(ExpandConstant('{app}'));

    // Only delete user data (database, logos, logs, backups) when the operator opted in.
    if RemoveApplicationData then
      DelTree(ExpandConstant('{commonappdata}\IT-Inventory-Server'), True, True, True);
  end;
end;

function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
  ExistingLauncher: String;
begin
  Result := '';
  ExistingLauncher := ExpandConstant('{app}\scripts\launcher.ps1');
  if FileExists(ExistingLauncher) then
    Exec(
      ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'),
      '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + ExistingLauncher + '" -Stop',
      ExpandConstant('{app}'),
      SW_HIDE,
      ewWaitUntilTerminated,
      ResultCode
    );
end;
