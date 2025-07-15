import * as vscode from 'vscode';

export function printToOutput(title: string, lines: string[]) {
  const output = vscode.window.createOutputChannel('GitHub Actions');
  output.clear();
  output.appendLine(`=== ${title} ===`);
  lines.forEach((line, i) => {
    output.appendLine(`${i + 1}. ${line}`);
  });
  output.appendLine('\n--- 출력 완료 ---\n');
  output.show(true); // 창 자동 포커스
  console.log(`[📤] OutputChannel "${title}" 출력 완료`);
}
