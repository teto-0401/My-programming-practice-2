
import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === VM STATE ===
// We only support one active VM for this demo to keep it simple/stable
export const vms = pgTable("vms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("My VM"),
  status: text("status").notNull().default("stopped"), // stopped, running, error
  imagePath: text("image_path"), // Path to the uploaded .bin/.iso
  imageFilename: text("image_filename"), // Original filename to detect extension
  vncPort: integer("vnc_port"),
  ramMb: integer("ram_mb").notNull().default(512), // RAM in MB (default 512MB for speed)
  vramMb: integer("vram_mb").notNull().default(16), // VRAM in MB (default 16MB for low overhead)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVmSchema = createInsertSchema(vms).omit({ id: true, createdAt: true });

export type Vm = typeof vms.$inferSelect;
export type InsertVm = z.infer<typeof insertVmSchema>;

// === STORED DISK IMAGES ===
export const vmImages = pgTable("vm_images", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  contentBase64: text("content_base64").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVmImageSchema = createInsertSchema(vmImages).omit({ id: true, createdAt: true });

export type VmImage = typeof vmImages.$inferSelect;
export type InsertVmImage = z.infer<typeof insertVmImageSchema>;

// API Types
export type VmStatusResponse = Vm;
export type UploadResponse = { success: boolean; path: string; filename: string };
