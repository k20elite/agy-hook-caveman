# Antigravity hooks: tóm tắt contract

Tóm tắt từ tài liệu "Lifecycle Hooks (`hooks.json`)" đi kèm agy CLI. Chỉ ghi phần liên quan đến hook này.

## Vị trí `hooks.json`

| Phạm vi   | Đường dẫn                        |
| :-------- | :------------------------------- |
| Toàn cục  | `~/.gemini/config/hooks.json` (dùng chung giữa CLI và backend) |
| Workspace | `<workspace>/.agents/hooks.json` (cần trust workspace)         |
| Plugin    | `hooks.json` bên trong plugin đã enable                        |

Nhiều hook có tên khác nhau cho cùng một event sẽ được merge và chạy tuần tự.
Đặt `"enabled": false` ở cấp hook để tắt tạm thời.

## Handler

```json
{ "type": "command", "command": "node hooks/caveman.js", "timeout": 10 }
```

- `type`: chỉ hỗ trợ `"command"`.
- `command`: chạy qua `sh -c` (Unix) hoặc `cmd /c` (Windows). `~` được expand thành home.
  Working directory = thư mục chứa `hooks.json`.
- `timeout`: giây, mặc định `30`.

## Event

| Event            | Khi nào              | Cấu trúc                              |
| :--------------- | :------------------- | :------------------------------------ |
| `PreToolUse`     | Trước khi chạy tool  | Grouped: `{ "matcher": "...", "hooks": [...] }` |
| `PostToolUse`    | Sau khi tool xong    | Grouped                               |
| `PreInvocation`  | Trước khi gọi model  | Flat: danh sách handler               |
| `PostInvocation` | Sau khi tool xong    | Flat                                  |
| `Stop`           | Khi vòng lặp dừng    | Flat                                  |

## Input chung (stdin)

Key dạng camelCase:

```json
{
  "conversationId": "ec33ebf9-...",
  "workspacePaths": ["/path/to/workspace"],
  "transcriptPath": "/path/.gemini/antigravity-cli/transcript.jsonl",
  "artifactDirectoryPath": "/path/.gemini/antigravity-cli/artifacts",
  "modelName": "auto"
}
```

## `PreInvocation`

Input thêm `invocationNum`, `initialNumSteps`. Output:

```json
{
  "injectSteps": [
    { "ephemeralMessage": "..." }
  ]
}
```

Loại step hỗ trợ: `{"toolCall": {"name": "...", "args": {...}}}`, `{"userMessage": "..."}`,
`{"ephemeralMessage": "..."}` (system message tạm thời).

## Giới hạn

- Chỉ hỗ trợ `type: "command"`.
- Hook chạy đồng bộ, block vòng lặp agent → giữ hook nhanh.
