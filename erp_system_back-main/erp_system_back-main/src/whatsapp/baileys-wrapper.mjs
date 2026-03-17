#!/usr/bin/env node

// This is an ES Module wrapper for Baileys
import { makeWASocket, DisconnectReason, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrCode from 'qr-image';

class BaileysWrapper {
  constructor() {
    this.socket = null;
    this.qrCodeData = null;
    this.isReady = false;
    this.isConnected = false;
    this.phoneNumber = null;
    this.authDir = './whatsapp-auth';
  }

  async initialize() {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      this.socket = makeWASocket({
        auth: state,
        // printQRInTerminal removed (deprecated)
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        defaultQueryTimeoutMs: undefined, // استخدام القيم الافتراضية
        connectTimeoutMs: undefined,
        keepAliveIntervalMs: undefined,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        fireInitQueries: true,
        emitOwnEvents: false,
        generateHighQualityLinkPreview: false,
        shouldIgnoreJid: jid => {
          return false;
        },
        getMessage: async (key) => {
          return undefined;
        },
      });

      this.socket.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        console.log('📡 Connection Update:', { connection, hasQR: !!qr, lastDisconnect: lastDisconnect?.error?.message });

        if (qr) {
          console.log('📱 QR Code received! Generating image...');
          this.qrCodeData = await this.generateQRCodeDataURL(qr);
          console.log('✅ QR Code image generated, length:', this.qrCodeData?.length);
          this.sendMessage('qr-generated', { qrCode: this.qrCodeData });
          console.log('📤 QR Code sent to parent process');
        }

        if (connection === 'close') {
          this.isConnected = false;
          this.isReady = false;
          this.phoneNumber = null;
          
          const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
          
          this.sendMessage('connection-closed', { shouldReconnect });
          
          if (shouldReconnect) {
            setTimeout(() => this.initialize(), 5000);
          }
        } else if (connection === 'open') {
          this.isConnected = true;
          this.isReady = true;
          this.qrCodeData = null;
          
          if (this.socket?.user?.id) {
            this.phoneNumber = this.socket.user.id.split(':')[0];
            this.sendMessage('connected', { phoneNumber: this.phoneNumber });
          }
        }
      });

      this.socket.ev.on('creds.update', saveCreds);

    } catch (error) {
      this.sendMessage('error', { error: error.message });
    }
  }

  async generateQRCodeDataURL(qr) {
    try {
      const qrCodeBuffer = qrCode.imageSync(qr, { type: 'png', size: 10 });
      const base64 = qrCodeBuffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    } catch (error) {
      return null;
    }
  }

  async sendWhatsAppMessage(phoneNumber, message) {
    try {
      if (!this.socket || !this.isConnected) {
        throw new Error('WhatsApp client is not ready');
      }

      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const jid = `${formattedNumber}@s.whatsapp.net`;

      await this.socket.sendMessage(jid, { text: message });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendImage(phoneNumber, imagePath, caption) {
    try {
      if (!this.socket || !this.isConnected) {
        throw new Error('WhatsApp client is not ready');
      }

      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const jid = `${formattedNumber}@s.whatsapp.net`;

      await this.socket.sendMessage(jid, {
        image: { url: imagePath },
        caption: caption
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendDocument(phoneNumber, documentPath, fileName, caption) {
    try {
      if (!this.socket || !this.isConnected) {
        throw new Error('WhatsApp client is not ready');
      }

      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const jid = `${formattedNumber}@s.whatsapp.net`;

      // تحديد نوع الملف بناءً على الامتداد
      const fileExtension = documentPath.toLowerCase().split('.').pop();
      let mimetype = 'application/octet-stream';
      
      if (fileExtension === 'pdf') {
        mimetype = 'application/pdf';
      } else if (fileExtension === 'txt') {
        mimetype = 'text/plain';
      } else if (fileExtension === 'doc' || fileExtension === 'docx') {
        mimetype = 'application/msword';
      } else if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
        mimetype = 'image/jpeg';
      } else if (fileExtension === 'png') {
        mimetype = 'image/png';
      }

      await this.socket.sendMessage(jid, {
        document: { url: documentPath },
        fileName: fileName,
        caption: caption,
        mimetype: mimetype
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  formatPhoneNumber(phoneNumber) {
    let cleaned = phoneNumber.replace(/\D/g, '');

    if (cleaned.startsWith('010') || cleaned.startsWith('011') || cleaned.startsWith('012') || cleaned.startsWith('015')) {
      cleaned = '2' + cleaned;
    } else if (cleaned.startsWith('10') || cleaned.startsWith('11') || cleaned.startsWith('12') || cleaned.startsWith('15')) {
      cleaned = '20' + cleaned;
    } else if (!cleaned.startsWith('2')) {
      cleaned = '2' + cleaned;
    }

    return cleaned;
  }

  sendMessage(type, data) {
    const message = { type, data, timestamp: new Date().toISOString() };
    console.log(JSON.stringify(message));
  }

  getStatus() {
    return {
      isReady: this.isReady,
      isConnected: this.isConnected,
      qrCode: this.qrCodeData,
      phoneNumber: this.phoneNumber,
    };
  }
}

// Handle messages from parent process
process.on('message', async (message) => {
  const { command, data } = message;
  
  switch (command) {
    case 'initialize':
      await wrapper.initialize();
      break;
    case 'send-message':
      const result = await wrapper.sendWhatsAppMessage(data.phoneNumber, data.message);
      process.send({ type: 'message-result', data: result });
      break;
    case 'send-image':
      const imageResult = await wrapper.sendImage(data.phoneNumber, data.imagePath, data.caption);
      process.send({ type: 'image-result', data: imageResult });
      break;
    case 'send-document':
      const documentResult = await wrapper.sendDocument(data.phoneNumber, data.documentPath, data.fileName, data.caption);
      process.send({ type: 'document-result', data: documentResult });
      break;
    case 'get-status':
      const status = wrapper.getStatus();
      process.send({ type: 'status', data: status });
      break;
    case 'restart':
      if (wrapper.socket) {
        wrapper.socket.end();
      }
      await wrapper.initialize();
      break;
  }
});

const wrapper = new BaileysWrapper();

// Initialize on startup
wrapper.initialize();