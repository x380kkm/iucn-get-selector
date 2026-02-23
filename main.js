const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    backgroundColor: '#f3f4f6',
    title: 'IUCN GET Ecosystem Selector',
  });

  mainWindow.loadFile('index.html');

  // 开发模式下打开开发者工具
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 加载 IUCN 数据
ipcMain.handle('load-iucn-data', async () => {
  try {
    const dataPath = path.join(__dirname, 'data/iucn_get_hierarchy.json');
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading IUCN data:', error);
    throw error;
  }
});

// 导出 JSON
ipcMain.handle('export-json', async (event, data) => {
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Selection as JSON',
    defaultPath: `iucn-selection-${Date.now()}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2));
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

// 导出 CSV
ipcMain.handle('export-csv', async (event, data) => {
  const { dialog } = require('electron');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Selection as CSV',
    defaultPath: `iucn-selection-${Date.now()}.csv`,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
  });

  if (!result.canceled && result.filePath) {
    fs.writeFileSync(result.filePath, data);
    return { success: true, path: result.filePath };
  }
  return { success: false };
});

// 导出报告 (Markdown)
ipcMain.handle('export-report', async (event, efgCodes) => {
  const { dialog } = require('electron');
  const { spawn } = require('child_process');

  try {
    // 选择输出目录
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Output Directory for Report',
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: false, error: 'No directory selected' };
    }

    const outputDir = result.filePaths[0];
    const scriptsDir = path.join(__dirname, 'scripts');
    const scriptPath = path.join(scriptsDir, 'generate_markdown_reports.py');

    // 检查Python脚本是否存在
    if (!fs.existsSync(scriptPath)) {
      return {
        success: false,
        error: 'Report generator script not found. Please ensure generate_markdown_reports.py exists in the scripts folder.'
      };
    }

    // 创建临时文件保存选中的EFG代码
    const tempFile = path.join(app.getPath('temp'), `efg_selection_${Date.now()}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(efgCodes));

    // 调用Python脚本
    return new Promise((resolve) => {
      const python = spawn('python', [scriptPath, tempFile, outputDir]);

      let output = '';
      let errorOutput = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      python.on('close', (code) => {
        // 清理临时文件
        try {
          fs.unlinkSync(tempFile);
        } catch (e) {
          console.error('Failed to delete temp file:', e);
        }

        if (code === 0) {
          resolve({
            success: true,
            path: outputDir,
            message: output
          });
        } else {
          resolve({
            success: false,
            error: `Python script failed with code ${code}\n${errorOutput}`
          });
        }
      });
    });

  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
