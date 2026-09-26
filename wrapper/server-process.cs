namespace TranslateWrapper;

public sealed class ServerProcess : IDisposable
{
    private readonly Process _process;
    private bool _stopped;

    private ServerProcess(Process process)
    {
        _process = process;
    }

    public static ServerProcess Start(AppConfig config)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = config.NodePath,
            WorkingDirectory = config.AppDir,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        startInfo.ArgumentList.Add("server.js");
        startInfo.Environment["PORT"] = config.Port.ToString(System.Globalization.CultureInfo.InvariantCulture);
        startInfo.Environment["HOSTNAME"] = config.BindIp;
        if (config.LlamaBaseUrl.Length > 0)
        {
            startInfo.Environment["LLAMA_BASE_URL"] = config.LlamaBaseUrl;
        }
        if (config.ModelPreset.Length > 0)
        {
            startInfo.Environment["MODEL_PRESET"] = config.ModelPreset;
        }
        if (config.SystemPrompt.Length > 0)
        {
            startInfo.Environment["SYSTEM_PROMPT"] = config.SystemPrompt;
        }
        if (config.ApiToken.Length > 0)
        {
            startInfo.Environment["API_TOKEN"] = config.ApiToken;
        }

        var process = new Process { StartInfo = startInfo };
        process.Start();
        return new ServerProcess(process);
    }

    public void Stop()
    {
        if (_stopped)
        {
            return;
        }
        _stopped = true;
        try
        {
            if (!_process.HasExited)
            {
                _process.Kill(entireProcessTree: true);
                _process.WaitForExit(5000);
            }
        }
        catch
        {
        }
        finally
        {
            _process.Dispose();
        }
    }

    public void Dispose() => Stop();
}
