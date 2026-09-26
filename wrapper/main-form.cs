using Microsoft.Web.WebView2;
using Microsoft.Web.WebView2.WinForms;

namespace TranslateWrapper;

public sealed class MainForm : Form
{
    private readonly AppConfig _config;
    private readonly ServerProcess? _server;
    private readonly WebView2 _webView;
    private readonly Label _status;

    public MainForm(AppConfig config, ServerProcess? server)
    {
        _config = config;
        _server = server;
        Text = "Translate";
        ClientSize = new Size(1100, 760);
        MinimumSize = new Size(640, 480);
        StartPosition = FormStartPosition.CenterScreen;

        _webView = new WebView2 { Dock = DockStyle.Fill };
        _status = new Label
        {
            Dock = DockStyle.Bottom,
            Height = 28,
            TextAlign = ContentAlignment.MiddleLeft,
            Padding = new Padding(8, 0, 8, 0)
        };
        Controls.Add(_webView);
        Controls.Add(_status);
    }

    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);
        await StartAsync();
    }

    private async Task StartAsync()
    {
        var loopbackUrl = $"http://127.0.0.1:{_config.Port}/";
        SetStatus($"Waiting for {loopbackUrl} …");

        var ready = await WaitForPortAsync("127.0.0.1", _config.Port, 60_000);
        if (!ready)
        {
            MessageBox.Show(this,
                $"The server did not become ready at {loopbackUrl} within 60 seconds.",
                "Translate", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
            return;
        }

        try
        {
            var environment = await CoreWebView2Environment.CreateAsync();
            await _webView.EnsureCoreWebView2Async(environment);
            _webView.CoreWebView2.Navigate(loopbackUrl);
            SetStatus($"{loopbackUrl} (bind {_config.BindIp})");
        }
        catch (Exception ex)
        {
            MessageBox.Show(this, ex.Message, "Translate", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    private static async Task<bool> WaitForPortAsync(string host, int port, int timeoutMs)
    {
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
        var deadline = Environment.TickCount64 + timeoutMs;
        var url = $"http://{host}:{port}/";
        while (Environment.TickCount64 < deadline)
        {
            try
            {
                using var response = await http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
                return true;
            }
            catch
            {
                await Task.Delay(500);
            }
        }
        return false;
    }

    private void SetStatus(string text) => _status.Text = text;

    protected override void OnFormClosing(FormClosingEventArgs e)
    {
        _server?.Stop();
        base.OnFormClosing(e);
    }
}
