namespace TranslateWrapper;

public static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        var config = AppConfig.LoadOrCreate();
        ServerProcess? server = null;
        try
        {
            if (config.ServerMode == "managed")
            {
                server = ServerProcess.Start(config);
            }

            if (!config.OpenView)
            {
                Console.WriteLine($"translate: serving on {config.BindIp}:{config.Port} (headless, Ctrl+C to stop)");
                while (true)
                {
                    Thread.Sleep(250);
                }
            }

            Application.Run(new MainForm(config, server));
        }
        finally
        {
            server?.Stop();
        }
    }
}
