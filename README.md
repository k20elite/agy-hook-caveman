# agy-hook-caveman

Hook **caveman mode** cho [Antigravity](https://antigravity.google) (`agy` CLI, Antigravity 2.0, IDE).
Mỗi lần agent gọi model, hook chèn một system message tạm thời (`ephemeralMessage`) bắt model trả lời
ngắn gọn kiểu "caveman": bỏ hết lời thừa, giữ nguyên toàn bộ nội dung kỹ thuật → tiết kiệm token output.

Lấy cảm hứng từ plugin [caveman](https://github.com/JuliusBrussee/caveman) của Claude Code.

```text
Không có hook:  In Git, **rebasing** is the process of moving or combining a sequence of commits
                to a new base commit. Instead of merging two branches together with a merge commit...
Có hook:        Git rebase move branch commits to new base commit. Rewrite commit history to look
                like straight line.
```

## Yêu cầu

- Antigravity CLI (`agy`) hoặc Antigravity 2.0 / IDE có hỗ trợ `hooks.json`
- Node.js >= 18 (có trong `PATH`)

## Cài đặt

```bash
git clone https://github.com/k20elite/agy-hook-caveman.git
cd agy-hook-caveman
node scripts/install.js
```

Installer sẽ:

1. Copy `hooks/caveman.js` vào `~/.gemini/config/hooks/caveman.js`
2. Thêm entry `caveman` vào `~/.gemini/config/hooks.json` (giữ nguyên các hook khác, backup file cũ thành `hooks.json.bak`)

Kiểm tra:

```bash
agy -p "/hooks"
agy -p "Explain what a git rebase is."
```

### Chỉ cài cho một workspace

```bash
node scripts/install.js --workspace /path/to/project
```

Hook được ghi vào `/path/to/project/.agents/hooks.json` và `/path/to/project/.agents/hooks/caveman.js`.
Workspace phải được trust thì agy mới load hook.

### Cài thủ công

Copy `hooks/caveman.js` vào `~/.gemini/config/hooks/`, rồi thêm vào `~/.gemini/config/hooks.json`:

```json
{
  "caveman": {
    "PreInvocation": [
      { "type": "command", "command": "node hooks/caveman.js", "timeout": 10 }
    ]
  }
}
```

Lệnh chạy với working directory là thư mục chứa `hooks.json`, nên đường dẫn tương đối `hooks/caveman.js` hoạt động.

## Chế độ

| Mode    | Hành vi                                                        |
| :------ | :------------------------------------------------------------- |
| `lite`  | Ngắn gọn, bỏ lời thừa, vẫn giữ ngữ pháp đầy đủ                 |
| `full`  | Mặc định. Kiểu caveman: câu cụt, bỏ mạo từ, trả lời trước      |
| `ultra` | Nén tối đa, dạng điện tín, chỉ trả lời                         |
| `off`   | Tắt hook (output `{}`)                                         |

Thứ tự ưu tiên khi chọn mode:

1. Biến môi trường `CAVEMAN_MODE`
2. File `~/.gemini/config/caveman-off` tồn tại → `off`
3. Nội dung file `~/.gemini/config/caveman-mode`
4. Mặc định `full`

```bash
node scripts/install.js --mode ultra      # đổi mode toàn cục
CAVEMAN_MODE=off agy -p "..."             # tắt cho một lần chạy (bash)
$env:CAVEMAN_MODE="lite"; agy             # PowerShell
```

Trong phiên chat, nói `stop caveman` hoặc `normal mode` thì model sẽ trả lời bình thường cho đến hết phiên.

Các trường hợp model vẫn viết đầy đủ: cảnh báo bảo mật, thao tác không thể hoàn tác, các bước có thứ tự,
và mọi thứ được lưu lại (code, comment, commit, docs, PR).

## Gỡ cài đặt

```bash
node scripts/install.js --uninstall
node scripts/install.js --uninstall --workspace /path/to/project
```

## Cách hoạt động

agy hỗ trợ lifecycle hooks qua `hooks.json` với các event `PreToolUse`, `PostToolUse`, `PreInvocation`,
`PostInvocation`, `Stop`. Hook này dùng `PreInvocation`:

- **Input (stdin)**: JSON gồm `invocationNum`, `initialNumSteps`, `conversationId`, `workspacePaths`, `transcriptPath`, `modelName`...
- **Output (stdout)**:

  ```json
  { "injectSteps": [ { "ephemeralMessage": "CAVEMAN MODE ACTIVE (full). ..." } ] }
  ```

`ephemeralMessage` là system message tạm thời, không lưu vào lịch sử, nên phải chèn lại ở mỗi lần gọi model.
Hook đọc hết stdin để agy không bị block, và tự thoát sau 2 giây nếu stdin không đóng.

Chi tiết contract: [docs/agy-hooks.md](docs/agy-hooks.md).

## Phát triển

```bash
npm test
```

Test kiểm tra mọi mode, file `caveman-off` / `caveman-mode`, stdin rỗng, và installer merge/gỡ `hooks.json` mà không làm mất hook khác.

## License

MIT
