const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const axios = require('axios');
const path = require('path');
const RPC = require('discord-rpc');
const clientId = '966159870833332264';

const rpc = new RPC.Client({ transport: 'ipc' });

const faviconUrl = 'https://play-lh.googleusercontent.com/Cv08QVGL1gd9aiMU9-rv71tCn-mM_rlXINYTNzjd5PYM7tVqxHm_2ooKMd_Kxn_6lBk';

async function fetchFavicon(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'binary').toString('base64');
  } catch (error) {
    console.error('Error fetching favicon:', error);
    return null;
  }
}

async function fetchTjaFile(url) {
  try {
    const response = await axios.get(url, { responseType: 'text' });
    return response.data;
  } catch (error) {
    console.error('Error fetching TJA file:', error);
    return null;
  }
}

function extractSongNameFromTja(tjaContent) {
  const titleLine = tjaContent.split('\n').find(line => line.startsWith('TITLE:'));
  if (titleLine) {
    return titleLine.split(':')[1].trim();
  }
  return null;
}

let mainWindow;
let icon;

async function createWindow() {
  const faviconBase64 = await fetchFavicon(faviconUrl);
  icon = faviconBase64 ? nativeImage.createFromDataURL(`data:image/png;base64,${faviconBase64}`) : null;

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    icon: icon
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.on('load-site', async (event, url) => {
  mainWindow.loadURL(url);

  rpc.on('ready', () => {
    rpc.setActivity({
      details: 'Hitting all the notes in taiko',
      state: 'Main Menu',
      startTimestamp: Date.now(),
      largeImageKey: 'logo',
      largeImageText: 'Ogey',
      smallImageKey: 'logo',
      smallImageText: 'Rrat',
      instance: false,
    });
  });

  rpc.login({ clientId }).catch(console.error);

  mainWindow.webContents.session.webRequest.onCompleted(async (details) => {
    if (details.url.endsWith('.tja')) {
      console.log(`Detected TJA file request: ${details.url}`);
      const tjaContent = await fetchTjaFile(details.url);
      if (tjaContent) {
        const songName = extractSongNameFromTja(tjaContent);
        if (songName) {
          console.log(`Playing song: ${songName}`);
          rpc.setActivity({
            details: 'Hitting all the notes in taiko',
            state: `Playing ${songName}`,
            startTimestamp: Date.now(),
            largeImageKey: 'logo',
            largeImageText: 'Ogey',
            smallImageKey: 'logo',
            smallImageText: 'Rrat',
            instance: false,
          });
        } else {
          console.log('Song name not found in TJA file.');
        }
      } else {
        console.log('Failed to fetch TJA file.');
      }
    }
  });
});

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

app.on('before-quit', () => {
  rpc.destroy();
});
