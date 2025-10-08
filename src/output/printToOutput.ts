import * as vscode from 'vscode';

export function printToOutput(title: string, lines: string[], autoShow = false) {
  const output = vscode.window.createOutputChannel('GitHub Actions');
  output.clear();
  output.appendLine(`=== ${title} ===`);
  lines.forEach((line, i) => {
    output.appendLine(`${i + 1}. ${line}`);
  });
  output.appendLine('\n--- 출력 완료 ---\n');
  if (autoShow) {
    output.show(true); // 명시적으로 요청한 경우에만 포커스
  }
  console.log(`[📤] OutputChannel "${title}" 출력 완료`);
}
