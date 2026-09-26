using System.Text.Json;
using System.Text.Json.Serialization;

namespace TranslateWrapper;

public sealed class AppConfig
{
    [JsonPropertyName("bind_ip")]
    public string BindIp { get; set; } = "0.0.0.0";

    [JsonPropertyName("port")]
    public int Port { get; set; } = 8321;

    [JsonPropertyName("open_view")]
    public bool OpenView { get; set; } = true;

    [JsonPropertyName("server_mode")]
    public string ServerMode { get; set; } = "external";

    [JsonPropertyName("node_path")]
    public string NodePath { get; set; } = "";

    [JsonPropertyName("app_dir")]
    public string AppDir { get; set; } = "";

    [JsonPropertyName("llama_base_url")]
    public string LlamaBaseUrl { get; set; } = "";

    [JsonPropertyName("model_preset")]
    public string ModelPreset { get; set; } = "auto";

    [JsonPropertyName("system_prompt")]
    public string SystemPrompt { get; set; } = "";

    [JsonPropertyName("api_token")]
    public string ApiToken { get; set; } = "";

    public static string ConfigPath => Path.Combine(AppContext.BaseDirectory, "config.json");

    public static AppConfig LoadOrCreate()
    {
        if (File.Exists(ConfigPath))
        {
            var loaded = JsonSerializer.Deserialize<AppConfig>(File.ReadAllText(ConfigPath), DeserializeOptions);
            if (loaded is not null)
            {
                return loaded;
            }
        }

        var created = new AppConfig();
        File.WriteAllText(ConfigPath, Serialize(created));
        return created;
    }

    public static string Serialize(AppConfig config) =>
        JsonSerializer.Serialize(config, new JsonSerializerOptions
        {
            WriteIndented = true
        });

    private static readonly JsonSerializerOptions DeserializeOptions = new()
    {
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };
}
