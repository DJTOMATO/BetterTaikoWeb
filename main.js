const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const axios = require('axios');
const path = require('path');
const RPC = require('discord-rpc');
const clientId = '1259256953348034602';


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
  currentSiteUrl = url;


  mainWindow.loadURL(currentSiteUrl);


  rpc.on('ready', () => {
    rpc.setActivity({
      details: 'Hitting all the notes in taiko',
      state: 'Initializing...',
      startTimestamp: Date.now(),
      largeImageKey: 'taiko',
      largeImageText: 'Taiko',
      instance: false,
    });
  });

  rpc.login({ clientId }).catch(console.error);


  let currentSongName = null;


  async function updateSongName() {
    try {
      const songName = await mainWindow.webContents.executeJavaScript(`
        (function() {
          const songDiv = document.querySelector('#song-sel-selectable');
          if (songDiv && songDiv.children.length > 0) {
            return Array.from(songDiv.children).map(child => child.getAttribute('alt')).join('');
          }
          return null;
        })();
      `);

      if (songName) {
        if (songName !== currentSongName) {
          currentSongName = songName;
          rpc.setActivity({
            details: 'Hitting all the notes in taiko',
            state: `Playing ${songName}`,
            startTimestamp: Date.now(),
            largeImageKey: 'taiko',
            largeImageText: 'Taiko',
            instance: false,
          });
        }
      } else if (currentSongName) {
        currentSongName = null;
        rpc.setActivity({
          details: 'Hitting all the notes in taiko',
          state: 'In the main menu',
          startTimestamp: Date.now(),
          largeImageKey: 'taiko',
          largeImageText: 'Taiko',
          instance: false,
        });
      }
    } catch (error) {
      console.error('Error updating song name:', error);
    }
  }


  setInterval(updateSongName, 5000);
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
