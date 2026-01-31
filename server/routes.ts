
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn, type ChildProcess } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { WebSocketServer, WebSocket } from "ws";
import net from "net";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure storage for large binary uploads
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ 
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 } // 10GB limit
});

// Snapshots directory
const snapshotsDir = path.join(__dirname, "../snapshots");
if (!fs.existsSync(snapshotsDir)) {
  fs.mkdirSync(snapshotsDir, { recursive: true });
}

// QEMU Process Manager
class QemuManager {
  private process: ChildProcess | null = null;
  private currentImage: string | null = null;
  private monitorSocket: net.Socket | null = null;
  private qmpSocket: net.Socket | null = null;

  async start(imagePath: string, originalFilename?: string | null) {
    if (this.process) {
      throw new Error("VM is already running");
    }

    console.log("Starting QEMU with image:", imagePath, "filename:", originalFilename);
    this.currentImage = imagePath;

    // Detect file type from original filename
    const extension = originalFilename?.split('.').pop()?.toLowerCase() || '';
    const isISO = extension === 'iso';
    const isBinOrImg = extension === 'bin' || extension === 'img';

    const args = [
      '-m', '2G', 
      '-smp', '2',
      '-cpu', 'max',
      '-vnc', '127.0.0.1:0',
      '-device', 'usb-ehci',
      '-device', 'usb-tablet', // Enables absolute mouse positioning
      '-vga', 'std',
      '-qmp', 'tcp:127.0.0.1:4444,server,nowait', // QMP for machine control
    ];

    // Add drive based on file type
    if (isISO) {
      // ISO files should be mounted as CD-ROM
      args.push('-cdrom', imagePath);
      args.push('-boot', 'd'); // Boot from CD-ROM
      console.log("Mounting as CD-ROM (ISO)");
    } else {
      // BIN/IMG files - try multiple interface types for compatibility
      // Use IDE for better compatibility with various OS images
      args.push('-drive', `file=${imagePath},format=raw,if=ide,index=0,media=disk`);
      args.push('-boot', 'c'); // Boot from hard drive
      console.log("Mounting as hard drive (BIN/IMG)");
    }
    
    // Add network
    args.push('-net', 'nic,model=e1000');
    args.push('-net', 'user');

    if (fs.existsSync('/dev/kvm')) {
      args.unshift('-enable-kvm');
      console.log("KVM enabled");
    } else {
      console.log("KVM not available, using TCG");
    }

    this.process = spawn('qemu-system-x86_64', args);

    this.process.stdout?.on('data', (data) => console.log(`QEMU: ${data}`));
    this.process.stderr?.on('data', (data) => console.error(`QEMU Error: ${data}`));

    this.process.on('close', (code) => {
      console.log(`QEMU exited with code ${code}`);
      this.process = null;
      storage.getVm().then(vm => {
        if (vm) storage.updateVmStatus(vm.id, 'stopped');
      });
    });
  }

  stop() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    if (this.qmpSocket) {
      this.qmpSocket.destroy();
      this.qmpSocket = null;
    }
  }

  isRunning(): boolean {
    return this.process !== null;
  }

  private async sendQmpCommand(command: object): Promise<any> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(4444, '127.0.0.1');
      let buffer = '';
      let initialized = false;
      
      socket.on('connect', () => {
        console.log('Connected to QMP');
      });
      
      socket.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const response = JSON.parse(line);
            if (response.QMP && !initialized) {
              // Send capabilities negotiation
              socket.write(JSON.stringify({ execute: 'qmp_capabilities' }) + '\n');
              initialized = true;
            } else if (response.return !== undefined && initialized) {
              if (command) {
                socket.write(JSON.stringify(command) + '\n');
                command = null as any;
              } else {
                socket.end();
                resolve(response);
              }
            } else if (response.error) {
              socket.end();
              reject(new Error(response.error.desc || 'QMP error'));
            }
          } catch (e) {
            // Ignore parse errors for incomplete data
          }
        }
      });
      
      socket.on('error', reject);
      socket.setTimeout(10000);
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('QMP timeout'));
      });
    });
  }

  async saveSnapshot(name: string): Promise<string> {
    if (!this.process) {
      throw new Error('VM is not running');
    }
    
    const snapshotPath = path.join(snapshotsDir, `${name}.state`);
    
    // Use migrate to file for saving VM state
    try {
      await this.sendQmpCommand({
        execute: 'migrate',
        arguments: { uri: `exec:cat > ${snapshotPath}` }
      });
      
      // Wait for migration to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return snapshotPath;
    } catch (e) {
      console.error('Save snapshot error:', e);
      throw e;
    }
  }

  async loadSnapshot(name: string): Promise<void> {
    const snapshotPath = path.join(snapshotsDir, `${name}.state`);
    
    if (!fs.existsSync(snapshotPath)) {
      throw new Error('Snapshot not found');
    }
    
    // For loading, we need to start QEMU with incoming migration
    // This requires stopping and restarting the VM with -incoming option
    throw new Error('Load snapshot requires VM restart - use restore endpoint');
  }

  getSnapshotPath(name: string): string {
    return path.join(snapshotsDir, `${name}.state`);
  }
}

const qemu = new QemuManager();

// Reset VM status on server start (QEMU process doesn't persist across restarts)
async function resetVmStatus() {
  const vm = await storage.getVm();
  if (vm && vm.status === 'running') {
    console.log("Resetting VM status from 'running' to 'stopped' (server restart)");
    await storage.updateVmStatus(vm.id, 'stopped');
  }
}
resetVmStatus();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Create WebSocket Server for VNC Proxy
  // Listen on /websockify to match default noVNC behavior
  const wss = new WebSocketServer({ server: httpServer, path: '/websockify' });

  wss.on('connection', (ws) => {
    console.log("Client connected to VNC Proxy");
    
    // Connect to QEMU VNC server
    const vncClient = net.createConnection(5900, 'localhost');

    vncClient.on('connect', () => {
      console.log("Connected to QEMU VNC");
    });

    vncClient.on('data', (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    vncClient.on('error', (err) => {
      console.error("VNC Client Error:", err);
      ws.close();
    });

    vncClient.on('close', () => {
      console.log("VNC Client Disconnected");
      ws.close();
    });

    ws.on('message', (msg) => {
      vncClient.write(msg as Buffer);
    });

    ws.on('close', () => {
      console.log("Client Disconnected from VNC Proxy");
      vncClient.end();
    });

    ws.on('error', (err) => {
      console.error("WebSocket Error:", err);
      vncClient.end();
    });
  });

  app.get(api.vm.get.path, async (req, res) => {
    const vm = await storage.getVm();
    if (!vm) {
      const newVm = await storage.createOrUpdateVm({ status: 'stopped' });
      return res.json(newVm);
    }
    res.json(vm);
  });

  app.post(api.vm.upload.path, upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const vm = await storage.createOrUpdateVm({
      imagePath: req.file.path,
      imageFilename: req.file.originalname,
      status: 'stopped'
    });

    res.json({ success: true, path: req.file.path, filename: req.file.originalname });
  });

  app.post(api.vm.start.path, async (req, res) => {
    const vm = await storage.getVm();
    if (!vm || !vm.imagePath) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    try {
      await qemu.start(vm.imagePath, vm.imageFilename);
      await storage.updateVmStatus(vm.id, 'running');
      res.json({ success: true, message: "VM started" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post(api.vm.stop.path, async (req, res) => {
    const vm = await storage.getVm();
    if (vm) {
      qemu.stop();
      await storage.updateVmStatus(vm.id, 'stopped');
    }
    res.json({ success: true, message: "VM stopped" });
  });

  // Snapshot endpoints
  app.post(api.vm.saveSnapshot.path, async (req, res) => {
    if (!qemu.isRunning()) {
      return res.status(400).json({ message: "VM is not running" });
    }

    try {
      const timestamp = Date.now();
      const name = `snapshot_${timestamp}`;
      await qemu.saveSnapshot(name);
      res.json({ success: true, name, message: "Snapshot saved" });
    } catch (e: any) {
      console.error('Save snapshot error:', e);
      res.status(500).json({ message: e.message });
    }
  });

  app.get(api.vm.listSnapshots.path, async (req, res) => {
    try {
      const files = fs.readdirSync(snapshotsDir);
      const snapshots = files
        .filter(f => f.endsWith('.state'))
        .map(f => {
          const filePath = path.join(snapshotsDir, f);
          const stats = fs.statSync(filePath);
          return {
            name: f.replace('.state', ''),
            createdAt: stats.mtime.toISOString(),
            size: stats.size
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.json(snapshots);
    } catch (e) {
      res.json([]);
    }
  });

  app.delete('/api/vm/snapshot/:name', async (req, res) => {
    const { name } = req.params;
    const snapshotPath = path.join(snapshotsDir, `${name}.state`);
    
    if (!fs.existsSync(snapshotPath)) {
      return res.status(404).json({ message: "Snapshot not found" });
    }

    try {
      fs.unlinkSync(snapshotPath);
      res.json({ success: true, message: "Snapshot deleted" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  return httpServer;
}
